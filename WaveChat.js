var _ = require('underscore'),
    Backbone =  require('backbone'),
    io = require('socket.io');

require('./code/ExpressServer');
require('./code/DAL');
//require('./code/Minify');

var User = Backbone.Model.extend({
    defaults: {
        name: '',
        avatar: '',
        status: 'offline'
    },
    initialize: function() {
        this.waves = new WaveCollection();
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
            this.addUsers(uids, false);
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
    
    addUsers: function(userIds, notify) {
        var newUsers = [];
        _.each(userIds, function(item){
            var user = WaveServer.users.get(item);
            if (user) {
                newUsers.push(user);
                this.addUser(user, false);//itt nem notifyolunk senkit egyenkent, max globalisan
            }
        }, this);
        
        if (notify && newUsers.length > 0) {
            _.each(newUsers, function(user){
                this.notifyUsersOfNewUser(user);
            }, this);
            this.notifyUsers();
            return true;
        }
        return false;
    },
    
    addUser: function(user, notify) {
        this.users.add(user);
        user.waves.add(this);
        
        //initkor pluszkoltseg, maskor nem szamit
        var userIds = this.get('userIds');
        userIds.push(user.id.toString());
        this.set('userIds', _.uniq(userIds));
        
        if (notify) {
            this.notifyUsersOfNewUser(user);
            this.notifyUsers();
            return true;
        }
        return false;
    },
    
    //TODO: atszervezni multiuserre vagy nem - tobb msg
    notifyUsersOfNewUser: function(newuser) {
        this.users.each(function(user){
            //csak ha be van lepve, es nem ismerte eddig
            //tehat most lett 1 waven vele
            if (user.socket && user != newuser && _.intersection(newuser.waves, user.waves).length < 2) {
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
    
    sendOldMessagesToUser: function(user) {
        DAL.getLastMessagesForUserFromWave(user, this, [], function(err, msgs) {
            user.send('message', {messages: msgs});
        });
    },
    
    sendPreviousMessagesToUser: function(user, minParentId, maxRootId) {
        var wave = this;
        //ha olvasatlan jott, es le kell szedni addig
        if (minParentId && maxRootId) {
            DAL.calcRootId(minParentId, [], function(err, minRootId){
                DAL.getUnreadIdsForUserInWave(user, wave, function(err, ids){
                    DAL.getMessagesForUserInWave(wave, minRootId, maxRootId, ids, function(err, msgs){
                        user.send('message', {messages: msgs});
                    });
                });
            });
        } else {
            DAL.getMinRootIdForWave(wave, maxRootId, maxRootId, function(err, newMinRootId){
                DAL.getMessagesForUserInWave(wave, newMinRootId, maxRootId, [], function(err, msgs) {
                    user.send('message', {messages: msgs});
                });
            });
        }
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
                
                socket.enable('browser client minification');  // send minified client
                socket.enable('browser client etag');          // apply etag caching logic based on version number
                socket.enable('browser client gzip');          // gzip the file
                socket.set('log level', 1);                    // reduce logging
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

        var wave0 = WaveServer.waves.at(0);
        console.log('new user added to: ' + wave0.get('title'));
        wave0.addUser(user, true);
        wave0.save();
        
        return user;
    },
	
    initData: function(app) {
        console.log('init data');
        var users = [];
        var uids = [];

        for (var i = 1; i <= 5; i++) {
            var u = new User({name: 'teszt' + i, avatar: 'images/head' + (i%6 + 1) + '.png'});
            u.save();
            users.push(u);
            uids.push(u.id.toString());//userIdsbe mindig toStringkent kell!
        }
        WaveServer.users.reset(users);

        var wave = new Wave({title: 'Csillag-delta tejbevávé', userIds: uids});
        wave.save();
        WaveServer.waves.reset([wave]);
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
            wave.addUser(client.curUser, false);
            wave.save();
            WaveServer.waves.add(wave);
            wave.notifyUsers();
        });
        //TODO: bele a wave classba
        client.on('updateWave', function(data){
            console.log('updateWave ' + data.title);
            var wave = WaveServer.waves.get(data.id);
            if (wave) {
                wave.set('title', data.title);
                var notified = false;
                
                var userIds = wave.get('userIds');
                if (data.userIds != userIds) {
                    var newIds = _.difference(data.userIds, userIds);
                    notified = wave.addUsers(newIds, true);
                    
                    //kikuldeni a wave tartalmat is, amibe belepett
                    _.each(newIds, function(userId){
                        var user = WaveServer.users.get(userId);
                        wave.sendOldMessagesToUser(user);
                    });
                }
                
                if (!notified)
                    wave.notifyUsers();

                wave.save();
            }
        });
        
        client.on('getMessages', function(data){
            var wave = WaveServer.waves.get(data.waveId);
            wave.sendPreviousMessagesToUser(client.curUser, data.minParentId, data.maxRootId);
        });
    }
}
//Minify.minify();
WaveServer.init();