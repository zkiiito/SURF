var crypto = require('crypto'),
    _ = require('underscore'),
    Backbone =  require('backbone'),
    MessageCollection = require('./Message').Collection,
    DAL = require('../DAL'),
    User,
    UserCollection;

User = Backbone.Model.extend(
    /** @lends User.prototype */
    {
        defaults: {
            name: '',
            avatar: '',
            status: 'offline',
            email: '',
            googleId: '',
            googleAvatar: '',
            facebookId: '',
            facebookAvatar: ''
        },
        /** @constructs */
        initialize: function () {
            var WaveCollection = require('./Wave').Collection;
            this.waves = new WaveCollection();
        },
        idAttribute: '_id',
        init: function (invite) {
            var self = this,
                friends;

            this.set({status: 'online'});

            friends = this.getFriends().map(function (f) {
                return f.toFilteredJSON();
            });

            this.socket.emit('init', {
                me: this.toSelfJSON(),
                users: friends,
                waves: this.waves
            });

            this.notifyFriends();

            DAL.getLastMessagesForUser(this, function (err, msgs, waveId) {
                if (!err) {
                    self.send('message', {messages: msgs, waveId: waveId});
                }
            }, function (err) {
                if (!err) {
                    self.send('ready');

                    if (invite) {
                        self.handleInvite(invite);
                    }
                }
            });
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
            var friends = this.waves.reduce(function (friends, wave) {
                var uids = wave.get('userIds');
                _.each(uids, function (item) {
                    if (item !== this.id.toString()) {
                        var user = require('../SurfServer').users.get(item);
                        friends.add(user);
                    }
                }, this);

                return friends;
            }, new UserCollection(), this);

            return friends;
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
            var friends = this.getFriends();

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
        update: function (data) {
            var name = data.name || "",
                avatar = data.avatar || "";

            if (undefined === this.validate(data)) {
                name = name.substr(0, 30);

                this.set({name: name.trim(), avatar: avatar.trim()});
                this.save();
                this.notifyFriends();
                this.send('updateUser', {
                    user: this.toSelfJSON()
                });
            } else {
                console.log(this.validate(data));
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
        handleInvite: function (invite) {
            var that = this;
            DAL.removeWaveInviteByCode(invite.code, function (err, result) {
                if (!err && result.result.ok > 0) {
                    var wave = require('../SurfServer').waves.get(invite.waveId);
                    if (wave && !wave.isMember(that)) {
                        wave.addUser(that, true);
                        wave.save();
                        wave.sendPreviousMessagesToUser(that, null, null);
                    }
                }
            });
        },

        /**
         * Filters public properties
         * @returns {Object} Public JSON
         */
        toFilteredJSON: function () {
            var json = this.toJSON(),
                emailParts = json.email.split('@');

            json.email = emailParts[0].substr(0, 2) + '..@' + emailParts[1];
            return _.pick(json, 'id', '_id', 'name', 'avatar', 'status', 'email');
        },

        /**
         * @returns {Object} Self JSON
         */
        toSelfJSON: function () {
            var json = this.toJSON(),
                emailMD5 = crypto.createHash('md5').update(json.email).digest('hex');

            _.extend(json, {emailMD5: emailMD5});

            return json;
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
UserCollection = Backbone.Collection.extend(
    /** @lends UserCollection.prototype */
    {
        model: User
    }
);

module.exports = {Model: User, Collection: UserCollection};