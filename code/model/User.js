/*global UserCollection */
var crypto = require('crypto'),
    _ = require('underscore'),
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
        var friends = this.getFriends().map(function(f) {
            return f.toFilteredJSON();
        });

        this.socket.emit('init', {
            me: this.toSelfJSON(),
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
                if (item !== this.id.toString()) {
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
                user: this.toFilteredJSON()
            });
        }, this);
    },

    save: function() {
        return DAL.saveUser(this);
    },

    update: function(data) {
        var name = data.name || "",
            avatar = data.avatar || "";

        name = name.substr(0, 30);

        if (name.length && avatar.length) {
            this.set({name: name, avatar: avatar});
            this.save();
            this.notifyFriends();
            this.send('updateUser', {
                user: this.toSelfJSON()
            });
        }
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
    },

    /**
     * Filters public properties
     * @returns {Object} Public JSON
     */
    toFilteredJSON: function() {
        var json = this.toJSON(),
            emailParts = json.email.split('@');

        json.email = emailParts[0].substr(0, 2) + '..@' + emailParts[1];
        return _.pick(json, 'id', '_id', 'name', 'avatar', 'status', 'email');
    },

    toSelfJSON: function() {
        var json = this.toJSON(),
            emailMD5 = crypto.createHash('md5').update(json.email).digest('hex');

        _.extend(json, {emailMD5: emailMD5});

        return json;
    }


    //validate: function(){
    //check: ?
    //}
});

var UserCollection = Backbone.Collection.extend({
    model: User
});

module.exports = {Model: User, Collection: UserCollection};