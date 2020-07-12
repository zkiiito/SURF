const _ = require('underscore'),
    Backbone =  require('backbone'),
    DAL = require('../DAL');

const Wave = Backbone.Model.extend(
    /** @lends Wave.prototype */
    {
        defaults: {
            title: '',
            userIds: []
        },
        idAttribute: '_id',

        /** @constructs */
        initialize: function () {
            const UserCollection = require('./User').Collection;
            this.users = new UserCollection();
            if (this.get('userIds')) {
                const uids = this.get('userIds');
                this.addUsers(uids, false);
            }
        },

        /**
         * @param {Message} message
         */
        addMessage: async function (message) {
            try {
                //save, save unread
                await message.save();
                this.users.each(function (user) {
                    user.send('message', message);
                    DAL.addUnreadMessage(user, message);
                }, message);
            } catch (err) {
                console.log('ERROR', err);
            }
        },

        /**
         * @param {Array} userIds
         * @param {boolean} notify
         * @returns {boolean}
         */
        addUsers: function (userIds, notify) {
            const newUsers = [];
            _.each(userIds, function (item) {

                const user = require('../SurfServer').users.get(item);
                if (user) {
                    newUsers.push(user);
                    this.addUser(user, false);//do not notify anyone here, only in next step
                }
            }, this);

            if (notify && newUsers.length > 0) {
                _.each(newUsers, function (user) {
                    this.notifyUsersOfNewUser(user);
                }, this);
                this.notifyUsers();
                return true;
            }
            return false;
        },

        /**
         * @param {User} user
         * @param {boolean} notify
         * @returns {boolean}
         */
        addUser: function (user, notify) {
            this.users.add(user);
            user.waves.add(this);

            //initkor pluszkoltseg, maskor nem szamit
            const userIds = this.get('userIds').slice(0);
            userIds.push(user.id.toString());
            this.set('userIds', _.uniq(userIds));

            if (notify) {
                this.notifyUserOfExistingUsers(user);
                this.notifyUsersOfNewUser(user);
                this.notifyUsers();
                return true;
            }
            return false;
        },

        /**
         * @param {User} newuser
         */
        //if multi-login/user or multiple servers, need to change this
        notifyUsersOfNewUser: function (newuser) {
            this.users.each(function (user) {
                //only if logged in and now they have one common wave
                if (user.socket && user !== newuser && _.intersection(newuser.waves, user.waves).length < 2) {
                    user.send('updateUser', {
                        user: newuser.toFilteredJSON()
                    });
                }
            }, this);
        },

        notifyUsers: function () {
            this.users.each(function (user) {
                user.send('updateWave', {
                    wave: this
                });
            }, this);
        },

        /**
         * @param {User} newuser
         */
        notifyUserOfExistingUsers: function (newuser) {
            this.users.each(function (user) {
                //only if now they have one common wave
                if (user !== newuser && _.intersection(newuser.waves, user.waves).length < 2) {
                    newuser.send('updateUser', {
                        user: user.toFilteredJSON()
                    });
                }
            }, this);
        },

        /**
         * @param {User} user
         */
        sendOldMessagesToUser: async function (user) {
            try {
                const msgs = await DAL.getLastMessagesForUserInWave(user, this);
                user.send('message', {messages: msgs});
            } catch (err) {
                console.log('ERROR', err);
            }
        },

        /**
         *
         * @param {User} user
         * @param {number} minParentId
         * @param {number} maxRootId
         */
        sendPreviousMessagesToUser: async function (user, minParentId, maxRootId) {
            try {
                const wave = this;
                //if user got an unread message, and does not have it's parents
                if (minParentId && maxRootId) {
                    const minRootId = await DAL.calcRootId(minParentId, []);
                    const ids = await DAL.getUnreadIdsForUserInWave(user, wave);
                    const msgs = await DAL.getMessagesForUserInWave(wave, minRootId, maxRootId, ids);
                    user.send('message', {messages: msgs, waveId: this._id});
                } else {
                    const newMinRootId = await DAL.getMinRootIdForWave(wave, maxRootId, maxRootId);
                    const msgs = await DAL.getMessagesForUserInWave(wave, newMinRootId, maxRootId, []);
                    user.send('message', {messages: msgs, waveId: this._id});
                }
            } catch (err) {
                console.log('ERROR', err);
            }
        },

        /**
         * @param {User} user
         */
        readAllMessagesOfUser: function (user) {
            DAL.readAllMessagesForUserInWave(user, this);
        },

        save: function () {
            return DAL.saveWave(this);
        },

        /**
         * @param {User} user
         */
        quitUser: async function (user) {
            try {
                if (this.users.indexOf(user) >= 0) {
                    this.users.remove(user);

                    const userIds = this.get('userIds').slice(0);
                    userIds.splice(_.indexOf(userIds, user.id.toString()), 1);
                    this.set('userIds', userIds);

                    user.quitWave(this);

                    await this.save();
                    wave.notifyUsers();
                }
            } catch (err) {
                console.log('ERROR', err);
            }
            //keeping empty waves with messages
        },

        /**
         * @param {User} user
         */
        createInviteCode: function (user) {
            return DAL.createInviteCodeForWave(user, this);
        },

        /**
         * @param {Object} data
         * @param {boolean} withRemove
         */
        update: function (data, withRemove) {
            withRemove = withRemove || false;
            this.set('title', data.title || '');
            let notified = false;
            const userIds = this.get('userIds');

            if (this.isValid()) {
                if (!_.isEqual(data.userIds, userIds)) {
                    const newIds = _.difference(data.userIds, userIds);
                    notified = this.addUsers(newIds, true);

                    //send old messages from the wave to the new user
                    _.each(newIds, function (userId) {
                        const user = require('../SurfServer').users.get(userId);
                        this.sendOldMessagesToUser(user);
                    }, this);

                    if (withRemove) {
                        const removedIds = _.difference(userIds, data.userIds);
                        _.each(removedIds, function (userId) {
                            const user = require('../SurfServer').users.get(userId);
                            this.quitUser(user);
                        }, this);
                    }
                }

                if (!notified) {
                    this.notifyUsers();
                }

                return this.save();
            }
        },

        /**
         * @param {User} user
         */
        isMember: function (user) {
            return this.users.contains(user);
        },

        validate: function (attrs) {
            if (0 === attrs.title.trim().length) {
                return 'Empty name';
            }
        }
    }
);

/** @class */
const WaveCollection = Backbone.Collection.extend(
    /** @lends WaveCollection.prototype */
    {
        model: Wave
    }
);

module.exports = {Model: Wave, Collection: WaveCollection};
