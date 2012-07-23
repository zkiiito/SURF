var _ = require('underscore'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    redis = require('redis-url'),
    async = require('async');

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
    
    getLastMessagesForUserOld: function(user, callback) {
        var wave_messages = [];
	var calls = 0;
	var isread_calls = 0;
	WaveModel.find({}, function(err, waves) {
            calls += waves.length;
            console.log(waves.length + " waves found");
            for (wid in waves) {
                MessageModel.find({waveId: waves[wid].id}, function(err, messages) {
                    isread_calls += messages.length;
                    console.log(messages.length + ' msgs found');
                    for (mid in messages) {
                        (function(msg) {
                            var key = 'unread-' + user.id + '-' + msg.waveId;
                            redis.sismember([key, msg.id], function(err, result) {
                                console.log(key + ' ' + msg.id + ' ' + result);
                                msg = {_id: msg.id, userId: msg.userId, waveId: msg.waveId, parentId: msg.parentId, message: msg.message, unread: result};
                                wave_messages.push(msg);
                                isread_calls--;
                                if (!calls && !isread_calls) {
                                    callback(wave_messages);
                                }
                            });
                        })(messages[mid]);
                    }
                    calls--;
                });
            }
	});
    },
    
    getLastMessagesForUser: function(user, callback) {
        WaveModel.find({}, function(err, waves) {
            //console.log(waves.length + " waves found");
            async.reduce(waves, [], function(memo, wave, callback){//ez nem parhuzamosan fut
                MessageModel.find({waveId: wave.id}, function(err, messages) {
                    //console.log(messages.length + ' msgs found');
                    async.map(messages, function(msg, callback) {
                        var key = 'unread-' + user.id + '-' + msg.waveId;
                        redis.sismember([key, msg.id], function(err, result) {
                            //console.log(key + ' ' + msg.id + ' ' + result);
                            msg = {_id: msg.id, userId: msg.userId, waveId: msg.waveId, parentId: msg.parentId, message: msg.message, unread: result};
                            callback(null, msg);
                        });
                    }, function(err, results) {
                        memo = _.union(memo, results);
                        callback(null, memo);
                    });
                });
            }, function(err, results) {
                callback(results);
            });
	});        
    },    
    
    readMessage: function(user, message) {
        var key = 'unread-' + user.id + '-' + message.waveId;
        console.log(key);
        redis.srem(key, message.id);
        console.log(user.id + ' read ' + message.id);
    },
    
    addUnreadMessage: function(user, message) {
        var key = 'unread-' + user.id + '-' + message.get('waveId');
        console.log(key + ' added ' + message.id);
        redis.sadd(key, message.id);
        redis.sadd('unread-sets', key);//nyomon akarjuk kovetni, h mik vannak
    }
};

exports.DAL = DAL;