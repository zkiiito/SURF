import { Server } from 'socket.io';
import signature from 'cookie-signature';
import DAL from './DALMongoRedis.js';
import LinkPreview from './LinkPreview.js';
import SessionStore from './SessionStore.js';
import { startExpressServer } from './ExpressServer.js';
import { Message } from './model/Message.js';
import Config from './Config.js';
import cookie from 'cookie';
import { User, UserCollection } from './model/User.js';
import { Wave, WaveCollection } from './model/Wave.js';

/** @namespace */
const SurfServer = {
    socket: null,

    init: function () {
        this.users = new UserCollection();
        this.waves = new WaveCollection();
        DAL.init(this);
    },

    startServer: function () {
        const ExpressServer = startExpressServer();
        ExpressServer.listen(Config.port);
        console.log('SURF is running, listening on port ' + Config.port);

        this.socket = new Server(ExpressServer, { 'pingInterval': 4000, 'pingTimeout': 10000 });

        this.socket.use(function (socket, next) {
            const data = socket.request;

            if (!data.headers.cookie) {
                return next(new Error('Session cookie required.'));
            }

            data.cookie = cookie.parse(data.headers.cookie);

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

        this.socket.on('connection', async (client) => {
            try {
                client.curUser = await this.getUserByAuth(client.session);
                if (client.curUser.socket) {
                    client.curUser.send('dontReconnect', 1);
                    client.curUser.socket.disconnect(true);
                }

                console.log('login: ' + client.curUser.id);
                client.curUser.socket = client;

                this.authClient(client);

                let invite = null;
                if (client.session.invite) {
                    console.log('invitedto: ' + client.session.invite.waveId);
                    invite = client.session.invite;
                    client.session.invite = null;
                }

                client.curUser.init(invite);
            } catch (err) {
                console.log('User auth error', err);
                client.disconnect(true);
            }
        });
    },

    /**
     * @param {Object} session
     * @returns {User}
     */
    getUserByAuth: async function (session) {
        const userData = session.passport.user;
        const authMode = userData.provider;

        if (undefined === userData._json) {
            throw new Error('sessionUser._json undefined');
        }

        let user = this.users.find(function (u) {
            return u.get('googleId') === userData.id
                || u.get('facebookId') === userData.id
                || u.get('email') === userData.emails[0].value;
        });
        const picture = userData.photos && userData.photos.length ? userData.photos[0].value : null;

        if (user) {
            console.log('auth: userfound ' + user.id);
            user.set(authMode + 'Id', userData.id);//refresh id, usually simply save if new
            user.set('email', userData.emails[0].value);//?
            if (picture) {
                user.set(authMode + 'Avatar', picture);//refresh default picture for auth provider
            }
            await user.save();
            return user;
        }

        user = new User();
        user.set('name', userData.displayName ? userData.displayName : (userData.name ? userData.name.givenName + ' ' + userData.name.familyName : 'Anonymus'));
        user.set(authMode + 'Id', userData.id);
        user.set('email', userData.emails[0].value);
        if (picture) {
            user.set('avatar', picture);
            user.set(authMode + 'Avatar', picture);
        }

        await user.save();
        this.users.add(user);
        console.log('auth: newuser ' + user.id + ' (' + user.get('name') +  ')');
        return user;
    },

    /**
     * @param client
     */
    authClient: function (client) {
        const that = this;

        client.on('error', function (err) {
            console.log('Socket client error');
            console.log(err.stack);
            client.curUser.disconnect();
            client.disconnect(true);
        });

        client.on('disconnect', function () {
            console.log('disconnect: ' + client.curUser.id);
            client.curUser.disconnect();
        });

        client.on('message', function (data) {
            console.log('message: ' + client.curUser.id);

            const msg = new Message(data);
            const wave = that.waves.get(msg.get('waveId'));

            if (msg.isValid() && wave && wave.isMember(client.curUser)) {
                wave.addMessage(msg);
            }
        });

        client.on('readMessage', function (data) {
            console.log('readMessage: ' + client.curUser.id);
            DAL.readMessage(client.curUser, data);
        });

        client.on('createWave', async function (data) {
            try {
                console.log('createWave: ' + client.curUser.id);

                const wave = new Wave(data);
                if (wave.isValid()) {
                    wave.addUser(client.curUser, false);
                    await wave.save();
                    that.waves.add(wave);
                    wave.notifyUsers();
                }
            } catch (err) {
                console.log('ERROR', err);
            }
        });

        client.on('updateWave', function (data) {
            console.log('updateWave: ' + client.curUser.id);
            const wave = that.waves.get(data.id);
            if (wave && wave.isMember(client.curUser)) {
                wave.update(data, false);
            }
        });

        client.on('updateUser', function (data) {
            console.log('updateUser: ' + client.curUser.id);
            client.curUser.update(data);
        });

        client.on('getMessages', function (data) {
            console.log('getMessages: ' + client.curUser.id);
            const wave = that.waves.get(data.waveId);
            if (wave && wave.isMember(client.curUser)) {
                wave.sendPreviousMessagesToUser(client.curUser, data.minParentId, data.maxRootId);
            }
        });

        client.on('readAllMessages', function (data) {
            console.log('readAllMessages: ' + client.curUser.id);
            const wave = that.waves.get(data.waveId);
            if (wave && wave.isMember(client.curUser)) {
                wave.readAllMessagesOfUser(client.curUser);
            }
        });

        client.on('getUser', function (data) {
            const user = that.users.get(data.userId);
            if (user) {
                client.curUser.send('updateUser', {user: user.toFilteredJSON()});
            }
        });

        client.on('quitWave', function (data) {
            const wave = that.waves.get(data.waveId);
            if (wave) {
                wave.quitUser(client.curUser);
            }
        });

        client.on('createInviteCode', async function (data) {
            console.log('createInviteCode: ' + client.curUser.id);
            const wave = that.waves.get(data.waveId);

            if (wave && wave.isMember(client.curUser)) {
                try {
                    data.code = await wave.createInviteCode(client.curUser);
                    client.curUser.send('inviteCodeReady', data);
                } catch (err) {
                    console.log('ERROR', err);
                }
            }
        });

        client.on('getLinkPreview', function (data) {
            console.log('getLinkPreview: ' + data.url);

            LinkPreview.parse(data.url)
                .then((resultData) => {
                    const result = {
                        msgId: data.msgId,
                        data: resultData
                    };

                    client.curUser.send('linkPreviewReady', result);
                })
                .catch((err) => {
                    console.log(err);
                });
        });
    },

    shutdown: async function () {
        await DAL.shutdown();
    }
};

export default SurfServer;
