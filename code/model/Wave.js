var _ = require('underscore'),
    Backbone =  require('backbone'),
    DAL = require('../DAL');

var Wave = Backbone.Model.extend({
    defaults: {
        title: '',
        userIds: []
    },
    idAttribute: '_id',
    initialize: function() {
        var UserCollection = require('./User').Collection,
            uids;
        this.users = new UserCollection();
        if (this.get('userIds')) {
            uids = this.get('userIds');
            this.addUsers(uids, false);
        }
    },

    addMessage: function(message) {
        //save, save unread
        message.save();

        this.users.each(function(user) {
            user.send('message', message);
            DAL.addUnreadMessage(user, message);
        }, message);
    },

    addUsers: function(userIds, notify) {
        var newUsers = [];
        _.each(userIds, function(item) {

            var user = require('../SurfServer').users.get(item);
            if (user) {
                newUsers.push(user);
                this.addUser(user, false);//itt nem notifyolunk senkit egyenkent, max globalisan
            }
        }, this);

        if (notify && newUsers.length > 0) {
            _.each(newUsers, function(user) {
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
            this.notifyUserOfExistingUsers(user);
            this.notifyUsersOfNewUser(user);
            this.notifyUsers();
            return true;
        }
        return false;
    },

    //if multi-login/user or multiple servers, need to change this
    notifyUsersOfNewUser: function(newuser) {
        this.users.each(function(user) {
            //csak ha be van lepve, es nem ismerte eddig
            //tehat most lett 1 waven vele
            if (user.socket && user !== newuser && _.intersection(newuser.waves, user.waves).length < 2) {
                user.send('updateUser', {
                    user: newuser.toFilteredJSON()
                });
            }
        }, this);
    },

    notifyUsers: function() {
        this.users.each(function(user) {
            user.send('updateWave', {
                wave: this
            });
        }, this);
    },

    notifyUserOfExistingUsers: function(newuser) {
        this.users.each(function(user) {
            //csak ha nem ismerte eddig
            //tehat most lett 1 waven vele
            if (user !== newuser && _.intersection(newuser.waves, user.waves).length < 2) {
                newuser.send('updateUser', {
                    user: user.toFilteredJSON()
                });
            }
        }, this);
    },

    sendOldMessagesToUser: function(user) {
        DAL.getLastMessagesForUserInWave(user, this, function(err, msgs) {
            if (!err) {
                user.send('message', {messages: msgs});
            }
        });
    },

    sendPreviousMessagesToUser: function(user, minParentId, maxRootId) {
        var wave = this;
        //ha olvasatlan jott, es le kell szedni addig
        if (minParentId && maxRootId) {
            DAL.calcRootId(minParentId, [], function(err, minRootId) {
                if (!err) {
                    DAL.getUnreadIdsForUserInWave(user, wave, function (err, ids) {
                        if (!err) {
                            DAL.getMessagesForUserInWave(wave, minRootId, maxRootId, ids, function (err, msgs) {
                                if (!err) {
                                    user.send('message', {messages: msgs});
                                }
                            });
                        }
                    });
                }
            });
        } else {
            DAL.getMinRootIdForWave(wave, maxRootId, maxRootId, function(err, newMinRootId) {
                if (!err) {
                    DAL.getMessagesForUserInWave(wave, newMinRootId, maxRootId, [], function (err, msgs) {
                        if (!err) {
                            user.send('message', {messages: msgs});
                        }
                    });
                }
            });
        }
    },

    readAllMessagesOfUser: function(user) {
        DAL.readAllMessagesForUserInWave(user, this);
    },

    save: function() {
        return DAL.saveWave(this);
    },

    quitUser: function(user) {
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

    createInviteCode: function(user) {
        return DAL.createInviteCodeForWave(user, this);
    },

    update: function(data) {
        this.set('title', data.title || "");
        var notified = false,
            userIds = this.get('userIds'),
            newIds;

        if (!_.isEqual(data.userIds, userIds)) {
            newIds = _.difference(data.userIds, userIds);
            notified = this.addUsers(newIds, true);

            //kikuldeni a wave tartalmat is, amibe belepett
            _.each(newIds, function(userId) {
                var user = require('../SurfServer').users.get(userId);
                this.sendOldMessagesToUser(user);
            }, this);
        }

        if (!notified) {
            this.notifyUsers();
        }

        this.save();
    },

    isMember: function(user) {
        return this.users.contains(user);
    }

    //validate: function() {
    //check userids
    //}
});

var WaveCollection = Backbone.Collection.extend({
    model: Wave
});

module.exports = {Model: Wave, Collection: WaveCollection};