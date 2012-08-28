var _ = require('underscore'),
    Backbone =  require('backbone'),
    io = require('socket.io');

require('./code/ExpressServer');
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
        var self = this;
        this.set({status: 'online'});
        DAL.getLastMessagesForUser(this, function(msgs) {
            self.sendInit(msgs);
        });
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
        unread: true,
        created_at: null
    },
    idAttribute: '_id',
    initialize: function() {
        if (this.isNew())
            this.set('created_at', Date.now());
    },
    save: function() {
        return DAL.saveMessage(this);
    }
    
    //validate: function(){
    //check: userId, waveId, parentId
    //user member of wave
    //parent member of wave?
    //
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
                if (user) {
                    this.addUser(user, false);
                    user.waves.add(this);
                }
            }, this);
        }
    },
    
    addMessage: function(message) {
        //save, save unread
        message.save();
        
        this.users.each(function(user){
            user.send('message', message);
            DAL.addUnreadMessage(user, message);
        }, message);
    },
    
    addUser: function(user, notify) {
        this.users.add(user);
        if (notify) {
            var userIds = this.get('userIds');
            userIds.push(user.id);
            this.set('userIds', userIds);
            user.waves.add(this);

            this.notifyUsersOfNewUser(user);
            this.notifyUsers();
        }
    },
    
    notifyUsersOfNewUser: function(newuser) {
        this.users.each(function(user){
            //TODO: csak annak, aki nem ismeri
            if (user != newuser) {
                user.send('updateUser', {
                    user: newuser.toJSON()
                });
            }
        }, this);
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
        //console.log('port: ' + port);
        ExpressServer.listen(port);
          
        socket = WaveServer.socket = io.listen(ExpressServer);
        
        socket.set('authorization', function(data, accept){
            if (!data.headers.cookie) {
                return accept('Session cookie required.', false);
            }

            data.cookie = require('cookie').parse(data.headers.cookie);
            data.sessionID = data.cookie['surf.sid'].substr(2,24);
            //console.log('sessid: ' + data.sessionID);
            
            SessionStore.get(data.sessionID, function (err, session) {
                if (err) {
                    return accept('Error in session store.', false);
                } else if (!session) {
                    return accept('Session not found.', false);
                }
                // success! we're authenticated with a known session.
                if (session['auth'] != undefined) {
                    data.session = session;
                    return accept(null, true);
                }
                return accept('Session not authenticated.', false);
            });
        });
        
        //HEROKU
        if (process.env.PORT) {
            socket.configure(function () { 
                socket.set("transports", ["xhr-polling"]); 
                socket.set("polling duration", 10); 
            });
        }
        
        socket.sockets.on('connection', function(client){
            //console.log("connection works!");
            
            var userData = client.handshake.session['auth']['google']['user'];
            console.log(userData);
            
            client.curUser = WaveServer.getUserByAuth(client.handshake.session['auth']);

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
    },
    
    getUserByAuth: function(auth) {
        var userData = auth['google']['user'];
        
        var user = WaveServer.users.find(function(u){return u.get('googleId') == userData['id']});
        
        if (user) {
            console.log('found');
            return user;
        }
        
        user = new User();
        user.set('name', userData['name']);
        user.set('avatar', userData['picture']);
        user.set('googleId', userData['id']);
        user.save();
        WaveServer.users.add(user);

        var wave0 = WaveServer.waves.find(function(w){return w.get('userIds').length > 20});
        console.log('new user added to: ' + wave0.get('name'));
        wave0.addUser(user, true);
        wave0.save();
        
        return user;
    },
	
    initData: function() {
        console.log('init data');
        var users = [];
        var uids = [];

        for (var i = 1; i <= 50; i++) {
            var u = new User({name: 'teszt' + i, avatar: 'images/head' + (i%6 + 1) + '.png'});
            u.save();
            users.push(u);
            uids.push(u.id.toString());

        }

        DAL.server.users.reset(users);

        var wave = new Wave({title: 'Csillag-delta tejbevávé', userIds: uids});
        wave.save();
        DAL.server.waves.reset([wave]);
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
        
        client.on('readMessage', function(data) {
            console.log('readMessage ' + data);
            DAL.readMessage(client.curUser, data);
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