/*global UserCollection */
var _ = require('underscore'),
    Backbone =  require('backbone'),
    MessageCollection = require('./Message').Collection,
    DAL = require('../DAL');

var User = Backbone.Model.extend({
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
    initialize: function() {
        var WaveCollection = require('./Wave').Collection;
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
        var friends = this.waves.reduce(function(friends, wave) {
            var uids = wave.get('userIds');
            _.each(uids, function(item) {
                if (item !== this.id) {
                    var user = require('../WaveServer').users.get(item);
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

    notifyFriends: function() {
        var friends = this.getFriends();

        friends.each(function(friend) {
            friend.send('updateUser', {
                user: this.toJSON()
            });
        }, this);
    },

    save: function() {
        return DAL.saveUser(this);
    },

    quitWave: function(wave) {
        this.waves.remove(wave);
    },

    handleInvite: function(invite) {
        var that = this;
        DAL.removeWaveInviteByCode(invite.code, function(err, result) {
            if (!err && result > 0) {
                var wave = require('../WaveServer').waves.get(invite.waveId);
                if (wave && !wave.isMember(that)) {
                    wave.addUser(that, true);
                    wave.save();
                    wave.sendPreviousMessagesToUser(that, null, null);
                }
            }
        });
    }

    //validate: function(){
    //check: ?
    //}
});

var UserCollection = Backbone.Collection.extend({
    model: User
});

module.exports = {Model: User, Collection: UserCollection};