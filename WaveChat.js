var http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    io = require('socket.io'),
    _ = require('underscore'),
    Backbone = require('backbone'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var WebServer = http.createServer(function(req, res){
    var uri = url.parse(req.url).pathname;    
    var abspath = path.join(process.cwd(), 'client/', uri);
    //kiakad a hulyesegtol
    abspath = abspath.replace('node', '../node_modules/');

    if(req.url == '/'){
        abspath += 'index.html';
    }

    //gyorsitas: inditaskor felderiti a konyvtarat, becacheli a tartalmat
    //es csak azt szolgalja ki, aminek a neve benn a listaban
    fs.exists(abspath, function(exists){
        if(!exists){
            res.writeHead(404, {
                "Content-Type":"text/html"
            });
            res.write('<html><body>404</body></html>');
            res.end('');
            return;
        }

        fs.readFile(abspath, "binary", function(err, file){

            var filetype = path.extname(abspath);
			
            if(filetype == '.html'){
                res.writeHead(200, {
                    "Content-Type":"text/html"
                });
            } else if(filetype == '.js'){
                res.writeHead(200, {
                    "Content-Type":"text/script"
                });
            } else if(filetype == '.css'){
                res.writeHead(200, {
                    "Content-Type":"text/css"
                });
            } else{
                res.writeHead(200, {
                    "Content-Type":"text"
                });
            }
            res.write(file, "binary");
            res.end('');
        });
    });
	
});

var DAL = {
    init: function() {
        mongoose.connect(process.env.MONGOHQ_URL || 'mongodb://localhost/my_databas2e');
        
        UserModel.find({}, function(err, users){
            var usersTmp = [];
            _.each(users, function(user) {
                usersTmp.push({name: user.name, avatar: user.avatar, _id: user._id});
            });
            WaveServer.users.reset(usersTmp);
            usersTmp = null;

            WaveModel.find({}, function(err, waves){
                var wavesTmp = [];
                _.each(waves, function(wave){
                    wavesTmp.push({title: wave.title, userIds: wave.userIds, _id: wave._id});
                })
                WaveServer.waves.reset(wavesTmp);

                if (waves.length == 0) {
                    DAL.initData();
                }

                WaveServer.startServer();
            });
        });
    },
    
    initData: function() {
        function test() {
            console.log('init data');
            var users = [];
            var uids = [];

            for (var i = 1; i <= 50; i++) {
                var u = new User({name: 'teszt' + i, avatar: 'images/head' + (i%6 + 1) + '.png'});
                u.save();
                users.push(u);
                uids.push(u.id.toString());

            }    

            WaveServer.users.reset(users);

            var wave = new Wave({title: 'Csillag-delta tejbevávé', userIds: uids});
            wave.save();
            WaveServer.waves.reset([wave]);
        }        
    },
    
    saveUser: function(user) {
        var m = new UserModel({
            name: user.get('name'),
            avatar: user.get('avatar')
        });
        m.save();
        user.set({_id: m._id});
        return user;
    },
    
    saveWave: function(wave) {
        var m = new WaveModel({
            title: wave.get('title'),
            userIds: wave.get('userIds')
        });
        m.save();
        wave.set({_id: m._id});
        return wave;
    },
    
    saveMessage: function(message) {
        var m = new MessageModel({
            userId: message.get('userId'),
            waveId: message.get('waveId'),
            parentId: message.get('parentId'),
            message: message.get('message')
        });
        m.save();
        message.set({_id: m._id});
        return message;
    },
    
    getMessage: function(id) {
        //root id meghatarozashoz
    },
    
    getLastMessagesForUserInWave: function(userId, waveId) {
        
    }
};

var User = Backbone.Model.extend({
    defaults: {
        name: '',
        avatar: '',
        status: 'offline'
    },
    initialize: function() {
        this.waves = new WaveCollection();
        
        //this.set({id: this.get('_id')});
    },
    idAttribute: '_id',
    init: function() {
        this.set({status: 'online'});
        
        var sendMsg = function(userContext) {
            return function(err, messages) {
                userContext.sendInit(messages);
            }
        }
        //TODO: DAL
        MessageModel.find({}, sendMsg(this));
    },
    
    sendInit: function(messages) {
        var friends = this.getFriends();
        this.socket.emit('init', {
            me: this.toJSON(),
            users: friends,
            waves: this.waves,
            messages: new MessageCollection().reset(messages)
        });

        this.notifyFriends();
    },
    
    disconnect: function() {
        this.set({status: 'offline'});
        this.notifyFriends();
    },
    
    getFriends: function() {//sajat magat nem adhatja vissza!
        var friends = this.waves.reduce(function(friends, wave){
            var uids = wave.get('userIds');
            _.each(uids, function(item){
                if (item != this.id) {
                    var user = WaveServer.users.get(item);
                    friends.add(user);
                }
            }, this);
            
            return friends;
        }, new UserCollection(), this);
        
        return friends;
    },
    
    send: function(msgtype, msg) {
        if (this.socket) {
            this.socket.emit(msgtype, msg);
        }
    },
    
    notifyFriends: function(){
        var friends = this.getFriends();

        friends.each(function(friend){
           friend.send('updateUser', {
               user: this.toJSON()
           });
        }, this);        
    },
    
    save: function() {
        return DAL.saveUser(this);
    }
    
    //validate: function(){
    //check: ?
    //}
});


var UserCollection = Backbone.Collection.extend({
    model: User 
});

var UserSchema = new Schema({
    name: { type: String, trim: true},
    avatar: { type: String, trim: true}
});

var UserModel = mongoose.model('UserModel', UserSchema);

var Message = Backbone.Model.extend({
    defaults: {
        userId: null,
        waveId: null,
        parentId: null,
        message: '',
        unread: true
    },
    idAttribute: '_id',
    save: function() {
        return DAL.saveMessage(this);
    }
    
    //validate: function(){
    //check: userId, waveId, parentId
    //}
});

var MessageCollection = Backbone.Collection.extend({
    model: Message 
});

var MessageSchema = new Schema({
    userId: Schema.ObjectId,
    waveId: Schema.ObjectId,
    parentId: Schema.ObjectId,
    message: {type: String, trim: true},
    created_at: { type: Date, 'default': Date.now }
});

var MessageModel = mongoose.model('MessageModel', MessageSchema);

var Wave = Backbone.Model.extend({
    defaults: {
        title: '',
        userIds: []
    },
    idAttribute: '_id',
    initialize: function() {
        this.users = new UserCollection();
        if (this.get('userIds')) {
            var uids = this.get('userIds');
            _.each(uids, function(item){
                var user = WaveServer.users.get(item);
                this.addUser(user);
                user.waves.add(this);
            }, this);
        }
    },
    
    addMessage: function(message) {
        //save, save unread
        message.save();
        
        this.users.each(function(user){
            user.send('message', message);
        }, message);
    },
    
    addUser: function(user) {
        this.users.add(user);
        //emit join?
    },
    
    notifyUsers: function() {
        this.users.each(function(user){
           user.send('updateWave', {
               wave: this
           });
        }, this);        
    },
    
    save: function() {
        return DAL.saveWave(this);
    }
    
    //validate: function() {
    //check userids
    //}
});

var WaveCollection = Backbone.Collection.extend({
    model: Wave    
});

var WaveSchema = new Schema({
    title: {type: String, trim: true},
    userIds: {type: [String]}
});

var WaveModel = mongoose.model('WaveModel', WaveSchema);

var WaveServer = {
    socket: null,

    init: function() {
        this.users = new UserCollection();
        this.waves = new WaveCollection();
        DAL.init();
    },
    
    startServer: function() {
        var port = process.env.PORT || 8000;
        console.log('port: ' + port);
        WebServer.listen(port);
          
        socket = WaveServer.socket = io.listen(WebServer);
        
        //HEROKU
        if (process.env.PORT) {
            socket.configure(function () { 
                socket.set("transports", ["xhr-polling"]); 
                socket.set("polling duration", 10); 
            });
        }
        
        socket.sockets.on('connection', function(client){
            console.log("connection works!");
            client.curUser = new User();//temporary

            client.on('auth', function(data){
                console.log('user auth: ' + data);
                //TODO: auth
                var id = data *1;
                client.curUser = WaveServer.users.at(id);
                if (client.curUser.socket)
                {
                    client.curUser.socket.disconnect();
                }

                console.log(client.curUser.get('name') + ' logged in');
                client.curUser.socket = client;
                client.curUser.ip = client.handshake.address.address;

                WaveServer.authClient(client);
                client.curUser.init();
            });
        });    
    },
    
    authClient: function(client) {
        //torolt funkciok a regibol: nick, topic, part, invite, joinchan
        client.on('disconnect', function(data) {
            console.log(client.curUser.get('name') + ' disconnected');
            client.curUser.disconnect();
        });

        client.on('message', function(data) {
            console.log(client.curUser.get('name') + ' message ' + data);

            var msg = new Message(data);

            var wave = WaveServer.waves.get(msg.get('waveId'));
            wave.addMessage(msg);
        });

        client.on('createWave', function(data) {
            console.log('createWave ' + data.title);

            var wave = new Wave(data);
            wave.save();
            WaveServer.waves.add(wave);
            wave.notifyUsers();
        });
    }
}

WaveServer.init();