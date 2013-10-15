var io = require('socket.io'),
    DAL = require('./DAL'),
    SessionStore = require('./SessionStore'),
    ExpressServer = require('./ExpressServer'),
    Model = require('./Model');

//TODO: nem global? -> Wave, User model is hivatkozik ra, valami DI kellene v ilyesmi
WaveServer = {
    socket: null,

    init: function() {
        this.users = new Model.UserCollection();
        this.waves = new Model.WaveCollection();
        DAL.init(this);        
    },
    
    startServer: function() {
        var port = process.env.PORT || 8000;
        ExpressServer.listen(port);
        
        socket = io.listen(ExpressServer);
        
        socket.set('authorization', function(data, accept){
            if (!data.headers.cookie) {
                return accept('Session cookie required.', false);
            }

            data.cookie = require('cookie').parse(data.headers.cookie);
            data.sessionID = data.cookie['surf.sid'].substr(2,24);
            
            SessionStore.get(data.sessionID, function (err, session) {
                if (err) {
                    return accept('Error in session store.', false);
                } else if (!session) {
                    return accept('Session not found.', false);
                }
                // success! we're authenticated with a known session.
                if (session.auth !== undefined) {
                    data.session = session;
                    return accept(null, true);
                }
                return accept('Session not authenticated.', false);
            });
        });
        
        //HEROKU
        if (process.env.PORT) {
            socket.configure(function () { 
                //socket.set("transports", ["xhr-polling"]); 
                //socket.set("polling duration", 10); 
                
                socket.enable('browser client minification');  // send minified client
                socket.enable('browser client etag');          // apply etag caching logic based on version number
                socket.enable('browser client gzip');          // gzip the file
                socket.set('log level', 1);                    // reduce logging
            });
        }
        socket.set('log level', 1);
        
        var that = this;
        socket.sockets.on('connection', function(client){
            //var userData = client.handshake.session['auth']['google']['user'];
            //console.log(userData);
            
            client.curUser = that.getUserByAuth(client.handshake.session.auth);

            if (client.curUser.socket) {
                client.curUser.socket.disconnect();
            }

            console.log('login: ' + client.curUser.id);
            client.curUser.socket = client;
            client.curUser.ip = client.handshake.address.address;

            that.authClient(client);
            client.curUser.init();
            
            if (client.handshake.session.invite) {
                console.log('invitedto: ' + client.handshake.session.invite.waveId);
                client.curUser.handleInvite(client.handshake.session.invite);
            }
        });
    },
    
    getUserByAuth: function(auth) {
        var userData = auth.google.user,
            user = this.users.find(function(u){return u.get('googleId') === userData.id;});
        
        if (user) {
            console.log('auth: userfound ' + user.id);
            user.set('avatar', userData.picture);
            user.set('email', userData.email);
            user.save();
            return user;
        }
        
        user = new Model.User();
        user.set('name', userData.name);
        user.set('avatar', userData.picture);
        user.set('googleId', userData.id);
        user.set('email', userData.email);
        user.save();
        this.users.add(user);

        console.log('auth: newuser ' + user.id + ' (' + user.get('name') +  ')');
        /*
        var wave0 = WaveServer.waves.at(0);
        wave0.addUser(user, true);
        wave0.save();
        */
        return user;
    },
	
    initData: function(app) {
        console.log('startup: initdata');
        var users = [],
            uids = [];

        for (var i = 1; i <= 5; i++) {
            var u = new User({name: 'teszt' + i, avatar: 'images/head' + (i%6 + 1) + '.png'});
            u.save();
            users.push(u);
            uids.push(u.id.toString());//userIdsbe mindig toStringkent kell!
        }
        this.users.reset(users);

        var wave = new Wave({title: 'Csillag-delta tejbevávé', userIds: uids});
        wave.save();
        this.waves.reset([wave]);
    },	
    
    authClient: function(client) {
        var that = this;
        //torolt funkciok a regibol: nick, topic, part, invite, joinchan
        client.on('disconnect', function(data) {
            console.log('disconnect: ' + client.curUser.id);
            client.curUser.disconnect();
        });

        client.on('message', function(data) {
            console.log('message: ' + client.curUser.id);

            var msg = new Model.Message(data);

            var wave = that.waves.get(msg.get('waveId'));
            if (wave && wave.isMember(client.curUser)) {
                wave.addMessage(msg);
            }
        });
        
        client.on('readMessage', function(data) {
            console.log('readMessage: ' + client.curUser.id);
            DAL.readMessage(client.curUser, data);
        });

        client.on('createWave', function(data) {
            console.log('createWave: ' + client.curUser.id);

            var wave = new Model.Wave(data);
            wave.addUser(client.curUser, false);
            wave.save();
            that.waves.add(wave);
            wave.notifyUsers();
        });

        client.on('updateWave', function(data){
            console.log('updateWave: ' + client.curUser.id);
            var wave = that.waves.get(data.id);
            if (wave && wave.isMember(client.curUser)) {
                wave.update(data);
            }
        });
        
        client.on('getMessages', function(data){
            var wave = that.waves.get(data.waveId);
            if (wave && wave.isMember(client.curUser)) {
                wave.sendPreviousMessagesToUser(client.curUser, data.minParentId, data.maxRootId);
            }
        });
        
        client.on('readAllMessages', function(data) {
            console.log('readAllMessages: ' + client.curUser.id);
            var wave = that.waves.get(data.waveId);
            if (wave && wave.isMember(client.curUser)) {
                wave.readAllMessagesOfUser(client.curUser);
            }
        });
        
        client.on('getUser', function(data){
            var user = that.users.get(data.userId);
            if (user) {
                client.curUser.send('updateUser', {user: user.toJSON()});
            }
        });
        
        client.on('quitWave', function(data) {
            var wave = that.waves.get(data.waveId);
            if (wave) {
                wave.quitUser(client.curUser);
            }
        });
        
        client.on('createInviteCode', function(data) {
            console.log('createInviteCode: ' + client.curUser.id);
            var wave = that.waves.get(data.waveId);
            if (wave && wave.isMember(client.curUser)) {
                var code = wave.createInviteCode(client.curUser);
                if (code)
                {
                    data.code = code;
                    client.curUser.send('inviteCodeReady', data);
                }
            }
        });
    }
};

module.exports = WaveServer;