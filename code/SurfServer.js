var IO = require('socket.io'),
    signature = require('cookie-signature'),
    DAL = require('./DAL'),
    SessionStore = require('./SessionStore'),
    ExpressServer = require('./ExpressServer'),
    Message = require('./model/Message').Model,
    User = require('./model/User').Model,
    UserCollection = require('./model/User').Collection,
    Wave = require('./model/Wave').Model,
    WaveCollection = require('./model/Wave').Collection,
    Config = require('./Config');

/** @namespace */
var SurfServer = {
    socket: null,

    init: function () {
        this.users = new UserCollection();
        this.waves = new WaveCollection();
        DAL.init(this);
    },

    startServer: function () {
        var that = this;

        ExpressServer.listen(Config.port);
        console.log('SURF is running, listening on port ' + Config.port);

        this.socket = new IO(ExpressServer);

        this.socket.use(function (socket, next) {
            var data = socket.request;

            if (!data.headers.cookie) {
                return next(new Error('Session cookie required.'));
            }

            data.cookie = require('cookie').parse(data.headers.cookie);

            if (data.cookie['surf.sid'] === undefined) {
                return next(new Error('Session cookie invalid.'));
            }

            data.sessionID = signature.unsign(data.cookie['surf.sid'].slice(2), 'surfSessionSecret9');

            SessionStore.get(data.sessionID, function (err, session) {
                if (err) {
                    return next(new Error('Error in session store.'));
                }
                if (!session) {
                    return next(new Error('Session not found.'));
                }
                // success! we're authenticated with a known session.
                if (session.passport !== undefined && session.passport.user !== undefined) {
                    socket.session = session;
                    return next();
                }
                return next(new Error('Session not authenticated.'));
            });
        });

        this.socket.sockets.on('connection', function (client) {
            client.curUser = that.getUserByAuth(client.session);

            if (client.curUser.socket) {
                client.curUser.send('dontReconnect', 1);
                client.curUser.socket.disconnect();
            }

            console.log('login: ' + client.curUser.id);
            client.curUser.socket = client;

            that.authClient(client);
            client.curUser.init();

            if (client.session.invite) {
                console.log('invitedto: ' + client.session.invite.waveId);
                client.curUser.handleInvite(client.session.invite);
                client.session.invite = null;
            }
        });
    },

    /**
     * @param {Object} session
     * @returns {User}
     */
    getUserByAuth: function (session) {
        var sessionUser = session.passport.user,
            authMode = sessionUser.provider,
            userData = sessionUser._json,
            user = this.users.find(function (u) {
                return u.get('googleId') === userData.id
                    || u.get('facebookId') === userData.id
                    || u.get('email') === userData.email;
            }),
            picture = 'google' === authMode ? userData.picture : userData.picture.data.url;

        if (user) {
            console.log('auth: userfound ' + user.id);
            user.set(authMode + 'Id', userData.id);//refresh id, usually simply save if new
            user.set('email', userData.email);//?
            if (picture) {
                user.set(authMode + 'Avatar', picture);//refresh default picture for auth provider
            }
            user.save();
            return user;
        }

        user = new User();
        user.set('name', userData.name);
        user.set(authMode + 'Id', userData.id);
        user.set('email', userData.email);
        if (picture) {
            user.set('avatar', picture);
            user.set(authMode + 'Avatar', picture);
        }
        user.save();
        this.users.add(user);

        console.log('auth: newuser ' + user.id + ' (' + user.get('name') +  ')');
        return user;
    },

    /**
     * @param client
     */
    authClient: function (client) {
        var that = this;
        client.on('disconnect', function () {
            console.log('disconnect: ' + client.curUser.id);
            client.curUser.disconnect();
        });

        client.on('message', function (data) {
            console.log('message: ' + client.curUser.id);

            var msg = new Message(data),
                wave = that.waves.get(msg.get('waveId'));

            if (wave && wave.isMember(client.curUser)) {
                wave.addMessage(msg);
            }
        });

        client.on('readMessage', function (data) {
            console.log('readMessage: ' + client.curUser.id);
            DAL.readMessage(client.curUser, data);
        });

        client.on('createWave', function (data) {
            console.log('createWave: ' + client.curUser.id);

            var wave = new Wave(data);
            wave.addUser(client.curUser, false);
            wave.save();
            that.waves.add(wave);
            wave.notifyUsers();
        });

        client.on('updateWave', function (data) {
            console.log('updateWave: ' + client.curUser.id);
            var wave = that.waves.get(data.id);
            if (wave && wave.isMember(client.curUser)) {
                wave.update(data);
            }
        });

        client.on('updateUser', function (data) {
            console.log('updateUser: ' + client.curUser.id);
            client.curUser.update(data);
        });

        client.on('getMessages', function (data) {
            console.log('getMessages: ' + client.curUser.id);
            var wave = that.waves.get(data.waveId);
            if (wave && wave.isMember(client.curUser)) {
                wave.sendPreviousMessagesToUser(client.curUser, data.minParentId, data.maxRootId);
            }
        });

        client.on('readAllMessages', function (data) {
            console.log('readAllMessages: ' + client.curUser.id);
            var wave = that.waves.get(data.waveId);
            if (wave && wave.isMember(client.curUser)) {
                wave.readAllMessagesOfUser(client.curUser);
            }
        });

        client.on('getUser', function (data) {
            var user = that.users.get(data.userId);
            if (user) {
                client.curUser.send('updateUser', {user: user.toFilteredJSON()});
            }
        });

        client.on('quitWave', function (data) {
            var wave = that.waves.get(data.waveId);
            if (wave) {
                wave.quitUser(client.curUser);
            }
        });

        client.on('createInviteCode', function (data) {
            console.log('createInviteCode: ' + client.curUser.id);
            var wave = that.waves.get(data.waveId),
                code;

            if (wave && wave.isMember(client.curUser)) {
                code = wave.createInviteCode(client.curUser);
                if (code) {
                    data.code = code;
                    client.curUser.send('inviteCodeReady', data);
                }
            }
        });

        client.on('ping', function () {
            client.curUser.send('pong');
        });
    }
};

module.exports = SurfServer;