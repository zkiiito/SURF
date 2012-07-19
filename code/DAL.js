var _ = require('underscore'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    redis = require('redis-url');

var UserSchema = new Schema({
    name: { type: String, trim: true},
    avatar: { type: String, trim: true}
});
var UserModel = mongoose.model('UserModel', UserSchema);

var MessageSchema = new Schema({
    userId: Schema.ObjectId,
    waveId: Schema.ObjectId,
    parentId: Schema.ObjectId,
    message: {type: String, trim: true},
    created_at: { type: Date, 'default': Date.now }
});
var MessageModel = mongoose.model('MessageModel', MessageSchema);

var WaveSchema = new Schema({
    title: {type: String, trim: true},
    userIds: {type: [String]}
});
var WaveModel = mongoose.model('WaveModel', WaveSchema);

DAL = {
    server: null,
    init: function(server) {
        DAL.server = server;
        mongoose.connect(process.env.MONGOHQ_URL || 'mongodb://localhost/my_databas2e');
        redis = redis.connect(process.env.REDISTOGO_URL || 'redis://localhost:6379');
        
        UserModel.find({}, function(err, users){
            var usersTmp = [];
            _.each(users, function(user) {
                usersTmp.push({name: user.name, avatar: user.avatar, _id: user._id});
            });
            DAL.server.users.reset(usersTmp);
            usersTmp = null;

            WaveModel.find({}, function(err, waves){
                var wavesTmp = [];
                _.each(waves, function(wave){
                    wavesTmp.push({title: wave.title, userIds: wave.userIds, _id: wave._id});
                })
                server.waves.reset(wavesTmp);

                if (waves.length == 0) {
                    DAL.initData();
                }

                DAL.server.startServer();
            });
        });
    },
    
    initData: function() {
        console.log('init data');
        var users = [];
        var uids = [];

        for (var i = 1; i <= 50; i++) {
            var u = new User({name: 'teszt' + i, avatar: 'images/head' + (i%6 + 1) + '.png'});
            u.save();
            users.push(u);
            uids.push(u.id.toString());

        }    

        DAL.server.users.reset(users);

        var wave = new Wave({title: 'Csillag-delta tejbevávé', userIds: uids});
        wave.save();
        DAL.server.waves.reset([wave]);
    },
    
    saveUser: function(user) {
        var m = new UserModel({
            name: user.get('name'),
            avatar: user.get('avatar')
        });
        m.save();
        user.set({_id: m._id});
        return user;
    },
    
    saveWave: function(wave) {
        var m = new WaveModel({
            title: wave.get('title'),
            userIds: wave.get('userIds')
        });
        m.save();
        wave.set({_id: m._id});
        return wave;
    },
    
    saveMessage: function(message) {
        var m = new MessageModel({
            userId: message.get('userId'),
            waveId: message.get('waveId'),
            parentId: message.get('parentId'),
            message: message.get('message')
        });
        m.save();
        message.set({_id: m._id});
        return message;
    },
    
    getMessage: function(id) {
        //root id meghatarozashoz
    },
    
    getLastMessagesForUserInWave: function(userId, waveId) {
        
    },
    
    getLastMessagesForUser: function(userId, callback) {
        MessageModel.find({}, callback);
    },
    
    readMessage: function(user, message) {
        var key = 'unread-' + user.id + '-' + message.waveId;
        //console.log(key);
        redis.srem(key, message.id);
        //console.log(user.id + ' read ' + message.id);
    },
    
    addUnreadMessage: function(user, message) {
        var key = 'unread-' + user.id + '-' + message.get('waveId');
        //console.log(key);
        redis.sadd(key, message.id);
    }
};

exports.DAL = DAL;