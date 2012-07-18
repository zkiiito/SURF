var http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    io = require('socket.io'),
    _ = require('underscore'),
    Backbone = require('backbone'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema;

mongoose.connect(process.env.MONGOHQ_URL || 'mongodb://localhost/my_database');

webServer = http.createServer(function(req, res){
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



var User = Backbone.Model.extend({
    defaults: {
        name: '',
        avatar: '',
        status: 'offline'
    },
    initialize: function() {
        this.waves = new WaveCollection();
        
        this.set({id: this.get('_id')});
    },
    idAttribute: '_id',
    init: function() {
        
        var sendMsg = function(context) {
            return function(err, messages) {
                var friends = context.getFriends();
                context.socket.emit('init', {
                    me: context.toJSON(),
                    users: friends,
                    waves: context.waves,
                    messages: new MessageCollection().reset(messages)
                });

                context.notifyFriends();
            }
        }
        
        MessageModel.find({}, sendMsg(this));
        
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
                    var user = waveServer.users.get(item);
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
        var m = new UserModel({
            name: this.get('name'),
            avatar: this.get('avatar')
        });
        
        m.save();
        this.set({_id: m._id});
        
        return this;
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
        unread: true//?
    },
    idAttribute: '_id',
    save: function() {
        var m = new MessageModel({
            userId: this.get('userId'),
            waveId: this.get('waveId'),
            parentId: this.get('parentId'),
            message: this.get('message')
        });
        
        m.save();
        
        this.set({_id: m._id});
        
        return this;
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
                var user = waveServer.users.get(item);
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
        var m = new WaveModel({
            title: this.get('title'),
            userIds: this.get('userIds')
        });
        
        m.save();
        
        //this.id = m._id;
        this.set({_id: m._id});
        
        return this;
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

var WaveServer = Backbone.Model.extend({
    initialize: function() {
        this.users = new UserCollection();
        this.waves = new WaveCollection();
        
        var port = process.env.PORT || 8000;
        console.log('port: ' + port);
        webServer.listen(port);
    }
});


waveServer = new WaveServer();

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
    
    waveServer.users.reset(users);
    
    var wave = new Wave({title: 'Csillag-delta tejbevávé', userIds: uids});
    wave.save();
    waveServer.waves.reset([wave]);
}

var socket = null;

UserModel.find({}, function(err, users){
    waveServer.users.reset(users);
    WaveModel.find({}, function(err, waves){
        waveServer.waves.reset(waves);
        if (waves.length == 0) {
            test();
        }
        
        socket = io.listen(webServer);

        //HEROKU
        socket.configure(function () { 
            socket.set("transports", ["xhr-polling"]); 
            socket.set("polling duration", 10); 
        });
        
        //torolt funkciok a regibol: nick, topic, part, invite, joinchan

        socket.sockets.on('connection', function(client){
            console.log("connection works!");
            var curUser = new User();//temporary

            client.on('auth', function(data){
                console.log('user auth: ' + data);
                //TODO: login command: query user, auto-join channels, send who
                var id = data *1;
                curUser = waveServer.users.at(id);
                if (curUser.socket)
                {
                    curUser.socket.disconnect();
                }

                curUser.set({status: 'online'});
                console.log(curUser.get('name') + ' logged in');
                curUser.socket = client;
                curUser.ip = client.handshake.address.address;

                curUser.init();        
            });

            client.on('disconnect', function(data) {
                console.log(curUser.get('name') + ' disconnected');
                curUser.disconnect();
            });

            client.on('message', function(data) {
                console.log(curUser.get('name') + ' message ' + data);

                var msg = new Message(data);

                var wave = waveServer.waves.get(msg.get('waveId'));
                wave.addMessage(msg);
            });

            client.on('createWave', function(data) {
                console.log('createWave ' + data.title);

                var wave = new Wave(data);
                wave.save();
                waveServer.waves.add(wave);
                wave.notifyUsers();
            });
        });

    });
});
