var _ = require('underscore'),
    Backbone =  require('backbone'),
    io = require('socket.io');

require('./code/WebServer');
require('./code/DAL');

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
        DAL.getLastMessagesForUser(this.id, sendMsg(this));
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

var WaveServer = {
    socket: null,

    init: function() {
        this.users = new UserCollection();
        this.waves = new WaveCollection();
        DAL.init(WaveServer);
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