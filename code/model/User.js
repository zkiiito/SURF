import crypto from 'crypto';
import _ from 'underscore';
import Backbone from 'backbone';
import DAL from '../DALMongoRedis.js';
import SurfServer from '../SurfServer.js';
import { WaveCollection } from './Wave.js';

const User = Backbone.Model.extend(
    /** @lends User.prototype */
    {
        defaults: {
            name: '',
            avatar: '',
            status: 'offline',
            email: '',
            googleId: '',
            googleAvatar: '',
        },
        /** @constructs */
        initialize: function () {
            this.waves = new WaveCollection();
        },
        idAttribute: '_id',
        init: async function (invite) {
            this.set({status: 'online'});

            const friends = this.getFriends().map(function (f) {
                return f.toFilteredJSON();
            });

            this.socket.emit('init', {
                me: this.toSelfJSON(),
                users: friends,
                waves: this.waves
            });

            this.notifyFriends();

            try {
                await DAL.getLastMessagesForUser(this, (err, msgs, waveId) => {
                    if (!err) {
                        this.send('message', {messages: msgs, waveId: waveId});
                    }
                });
                this.send('ready');
                if (invite) {
                    this.handleInvite(invite);
                }
            } catch (err) {
                console.log('ERROR', err);
            }
        },

        disconnect: function () {
            this.set({status: 'offline'});
            this.notifyFriends();
        },

        /**
         * get user's friends
         * exluding himself
         *
         * @returns {UserCollection}
         */
        getFriends: function () {
            return this.waves.reduce(function (friends, wave) {
                const uids = wave.get('userIds');
                uids.forEach(uid => {
                    if (uid.toString() !== this.id.toString()) {
                        const user = SurfServer.users.get(uid);
                        friends.add(user);
                    }
                });

                return friends;
            }, new UserCollection(), this);
        },

        /**
         * @param {string} msgtype
         * @param {string|Object} msg
         */
        send: function (msgtype, msg) {
            if (this.socket) {
                this.socket.emit(msgtype, msg);
            }
        },

        notifyFriends: function () {
            const friends = this.getFriends();

            friends.each(function (friend) {
                friend.send('updateUser', {
                    user: this.toFilteredJSON()
                });
            }, this);
        },

        save: function () {
            return DAL.saveUser(this);
        },

        /**
         * @param {Object} data
         */
        update: async function (data) {
            try {
                let name = data.name || '';
                const avatar = data.avatar || '';

                if (undefined === this.validate(data)) {
                    name = name.substr(0, 30);

                    this.set({name: name.trim(), avatar: avatar.trim()});
                    await this.save();
                    this.notifyFriends();
                    this.send('updateUser', {
                        user: this.toSelfJSON()
                    });
                } else {
                    console.log(this.validate(data));
                }
            } catch (err) {
                console.log('ERROR', err);
            }
        },

        /**
         * @param {Wave} wave
         */
        quitWave: function (wave) {
            this.waves.remove(wave);
        },

        /**
         * @param {Object} invite
         */
        handleInvite: async function (invite) {
            try {
                const result = await DAL.removeWaveInviteByCode(invite.code);
                if (result.ok > 0) {
                    const wave = SurfServer.waves.get(invite.waveId);
                    if (wave && !wave.isMember(this)) {
                        wave.addUser(this, true);
                        await wave.save();
                        wave.sendPreviousMessagesToUser(this, null, null);
                    }
                }
            } catch (err) {
                console.log('ERROR', err);
            }
        },

        /**
         * Filters public properties
         * @returns {Object} Public JSON
         */
        toFilteredJSON: function () {
            const json = this.toJSON();
            const emailParts = json.email.split('@');

            json.email = emailParts[0].substr(0, 2) + '..@' + emailParts[1];
            return _.pick(json, 'id', '_id', 'name', 'avatar', 'status', 'email');
        },

        /**
         * @returns {Object} Self JSON
         */
        toSelfJSON: function () {
            const json = this.toJSON();
            const emailMD5 = crypto.createHash('md5').update(json.email).digest('hex');

            return { ...json, ...{ emailMD5 }};
        },

        validate: function (attrs) {
            if (0 === attrs.name.trim().length) {
                return 'Empty name';
            }

            if (0 === attrs.avatar.trim().length) {
                return 'Empty name';
            }
        }
    }
);

/** @class */
const UserCollection = Backbone.Collection.extend(
    /** @lends UserCollection.prototype */
    {
        model: User
    }
);

export { User, UserCollection };
