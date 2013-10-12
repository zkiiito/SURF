var _ = require('underscore'),
    Backbone =  require('backbone'),
    WaveCollection = require('./WaveCollection'),
    UserCollection = require('./UserCollection'),
    MessageCollection = require('./MessageCollection'),
    DAL = require('../DAL');

var User = Backbone.Model.extend({
    defaults: {
        name: '',
        avatar: '',
        status: 'offline'
    },
    initialize: function() {
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
        var friends = this.waves.reduce(function(friends, wave){
            var uids = wave.get('userIds');
            _.each(uids, function(item){
                if (item !== this.id) {
                    var user = WaveServer.users.get(item);
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
    
    notifyFriends: function(){
        var friends = this.getFriends();

        friends.each(function(friend){
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
        DAL.removeWaveInviteByCode(invite.code, function(err, result){
            if (!err && result > 0) {
                var wave = WaveServer.waves.get(invite.waveId);
                if (wave && !wave.isMember(that)) {
                    wave.addUser(that, true);
                    wave.save();
                }
            }
        });
    }
    
    //validate: function(){
    //check: ?
    //}
});

module.exports = User;