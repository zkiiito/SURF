var _ = require('underscore'),
    Backbone =  require('backbone'),
    DAL = require('../DAL');

var Wave = Backbone.Model.extend(
    /** @lends Wave.prototype */
    {
        defaults: {
            title: '',
            userIds: []
        },
        idAttribute: '_id',

        /** @constructs */
        initialize: function () {
            var UserCollection = require('./User').Collection,
                uids;
            this.users = new UserCollection();
            if (this.get('userIds')) {
                uids = this.get('userIds');
                this.addUsers(uids, false);
            }
        },

        /**
         * @param {Message} message
         */
        addMessage: function (message) {
            //save, save unread
            message.save();

            this.users.each(function (user) {
                user.send('message', message);
                DAL.addUnreadMessage(user, message);
            }, message);
        },

        /**
         * @param {Array} userIds
         * @param {boolean} notify
         * @returns {boolean}
         */
        addUsers: function (userIds, notify) {
            var newUsers = [];
            _.each(userIds, function (item) {

                var user = require('../SurfServer').users.get(item);
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
            var userIds = this.get('userIds');
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
        sendOldMessagesToUser: function (user) {
            DAL.getLastMessagesForUserInWave(user, this, function (err, msgs) {
                if (!err) {
                    user.send('message', {messages: msgs});
                }
            });
        },

        /**
         *
         * @param {User} user
         * @param {number} minParentId
         * @param {number} maxRootId
         */
        sendPreviousMessagesToUser: function (user, minParentId, maxRootId) {
            var wave = this;
            //if user got an unread message, and does not have it's parents
            if (minParentId && maxRootId) {
                DAL.calcRootId(minParentId, [], function (err, minRootId) {
                    if (!err) {
                        DAL.getUnreadIdsForUserInWave(user, wave, function (err, ids) {
                            if (!err) {
                                DAL.getMessagesForUserInWave(wave, minRootId, maxRootId, ids, function (err, msgs) {
                                    if (!err) {
                                        user.send('message', {messages: msgs, waveId: this._id});
                                    }
                                });
                            }
                        });
                    }
                });
            } else {
                DAL.getMinRootIdForWave(wave, maxRootId, maxRootId, function (err, newMinRootId) {
                    if (!err) {
                        DAL.getMessagesForUserInWave(wave, newMinRootId, maxRootId, [], function (err, msgs) {
                            if (!err) {
                                user.send('message', {messages: msgs, waveId: this._id});
                            }
                        });
                    }
                });
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
        quitUser: function (user) {
            if (this.users.indexOf(user) >= 0) {
                this.users.remove(user);

                var userIds = this.get('userIds');
                userIds.splice(_.indexOf(userIds, user.id.toString()), 1);
                this.set('userIds', userIds);

                user.quitWave(this);

                this.save();
                this.notifyUsers();
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
         * @param {bool} withRemove
         */
        update: function (data, withRemove) {
            withRemove = withRemove || false;
            this.set('title', data.title || "");
            var notified = false,
                userIds = this.get('userIds'),
                newIds,
                removedIds;

            if (this.isValid()) {
                if (!_.isEqual(data.userIds, userIds)) {
                    newIds = _.difference(data.userIds, userIds);
                    notified = this.addUsers(newIds, true);

                    //send old messages from the wave to the new user
                    _.each(newIds, function (userId) {
                        var user = require('../SurfServer').users.get(userId);
                        this.sendOldMessagesToUser(user);
                    }, this);

                    if (withRemove) {
                        removedIds = _.difference(userIds, data.userIds);
                        _.each(removedIds, function (userId) {
                            var user = require('../SurfServer').users.get(userId);
                            this.quitUser(user);
                        }, this);
                    }
                }

                if (!notified) {
                    this.notifyUsers();
                }

                this.save();
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
var WaveCollection = Backbone.Collection.extend(
    /** @lends WaveCollection.prototype */
    {
        model: Wave
    }
);

module.exports = {Model: Wave, Collection: WaveCollection};