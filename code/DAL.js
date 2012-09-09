var _ = require('underscore'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    redis = require('redis-url'),
    async = require('async');

var UserSchema = new Schema({
    name: {type: String, trim: true},
    avatar: {type: String, trim: true},
    googleId: {type: String, trim: true}
});
var UserModel = mongoose.model('UserModel', UserSchema);

var MessageSchema = new Schema({
    userId: Schema.ObjectId,
    waveId: Schema.ObjectId,
    parentId: Schema.ObjectId,
    rootId: Schema.ObjectId,
    message: {type: String, trim: true},
    created_at: {type: Date}
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
        mongoose.connect(process.env.MONGOHQ_URL || 'mongodb://localhost/wave0');
        redis = redis.connect(process.env.REDISTOGO_URL || 'redis://localhost:6379');
        
        //mongoose.set('debug', true);
        
        UserModel.find().exec(function(err, users){
            var usersTmp = [];
            _.each(users, function(user) {
                usersTmp.push({name: user.name, avatar: user.avatar, _id: user._id, googleId: user.googleId});
            });
            DAL.server.users.reset(usersTmp);
            usersTmp = null;

            WaveModel.find().sort('_id').exec(function(err, waves){
                var wavesTmp = [];
                _.each(waves, function(wave){
                    wavesTmp.push({title: wave.title, userIds: wave.userIds, _id: wave._id});
                })
                server.waves.reset(wavesTmp);

                if (waves.length == 0) {
                    DAL.server.initData();
                }

                DAL.server.startServer();
            });
        });
        
        //temporary fix
        MessageModel.find({rootId: null}).exec(function(err, messages){
            _.each(messages, function(message){
                if (null == message.rootId) {
                    if (null == message.parentId)
                        MessageModel.findByIdAndUpdate(message._id, {rootId: message._id}).exec();
                    else
                        DAL.calcRootId(message.parentId, [message]);
                }
            });
        });        
    },
        
    saveUser: function(user) {
        var m = new UserModel({
            name: user.get('name'),
            avatar: user.get('avatar'),
            googleId: user.get('googleId')
        });
        m.save();
        user.set({_id: m._id});
        return user;
    },
    
    saveWave: function(wave) {
        var data = {
            title: wave.get('title'),
            userIds: _.uniq(wave.get('userIds'))
        };
        
        if (wave.isNew()) {
            var m = new WaveModel(data);
            m.save();
            wave.set({_id: m._id});
        }
        else
        {
            WaveModel.findByIdAndUpdate(wave.id, data, function(err, doc){});
        }
        return wave;
    },
    
    saveMessage: function(message) {
        var m = new MessageModel({
            userId: message.get('userId'),
            waveId: message.get('waveId'),
            parentId: message.get('parentId'),
            message: message.get('message'),
            created_at: message.get('created_at')
        });
        
        if (null == m.parentId) {
            m.rootId = m._id;
            m.save();
        } else {
            m.save(function(err, msg){
                DAL.calcRootId(m.parentId, [m]);
            });
        }
        
        message.set({_id: m._id});
        return message;
    },
    
    //rekurzivan, elvileg csak az elejen vannak olyan esetek, hogy nincs root id-je
    calcRootId: function(messageId, messages) {
        MessageModel.findById(messageId, function(err, message){
            if (err) {
                console.log('error van');
                return;
            }
            //ha gyokerelem, vagy tud arrol valamit
            if (null != message.rootId || null == message.parentId) {
                var rootId = null;
                
                if (null != message.rootId) {
                    rootId = message.rootId;
                }
                else if (null == message.parentId) {
                    rootId = message._id;
                    messages.push(message);
                }
                
                async.forEach(messages, function(msg){
                    MessageModel.findByIdAndUpdate(msg._id, {rootId: rootId}).exec();
                });
            }
            else
            {
                messages.push(message);
                DAL.calcRootId(message.parentId, messages);
            }
        });
    },
    
    getLastMessagesForUser: function(user, callback) {
        var startTime = new Date().getTime();
        WaveModel.find().where('_id').in(user.waves.pluck('_id')).exec(function(err, waves) {
            //console.log(waves.length + " waves found");
            async.reduce(waves, [], function(memo, wave, callback_async_reduce){//ez nem parhuzamosan fut, de async mert az iteratornak callbackje van
                DAL.getLastMessagesForUserInWave(user, wave, memo, callback_async_reduce);
            }, function(err, results) {
                var endTime = new Date().getTime();
                console.log('msg query in ' + (endTime - startTime));
                callback(results);
            });
	});
    },
    /*
    getLastMessagesForUserInWave2: function(user, wave, memo, callback) {
        MessageModel.find({waveId: wave.id}).sort('_id').exec(function(err, messages) {
            //console.log(messages.length + ' msgs found');
            async.map(messages, function(msg, callback_async_map) {
                var key = 'unread-' + user.id + '-' + msg.waveId;
                redis.sismember([key, msg.id], function(err, result) {
                    //console.log(key + ' ' + msg.id + ' ' + result);
                    msg = {
                        _id: msg.id, 
                        userId: msg.userId, 
                        waveId: msg.waveId, 
                        parentId: msg.parentId, 
                        message: msg.message, 
                        unread: result, 
                        created_at: msg.created_at
                    };
                    callback_async_map(null, msg);
                });
            }, function(err, results) {
                memo = _.union(memo, results);
                callback(null, memo);
            });
        });
    },
    */
    getLastMessagesForUserInWave: function(user, wave, memo, callback) {
        DAL.getMinUnreadRootIdForUserInWave(user, wave, function(err, result){
            console.log(result);
            var minRootId = null,
                unreadIds = [];
            if (!err) {//ha van unread
                minRootId = result.minRootId;
                unreadIds = result.unreadIds;
            }
            
            DAL.getMinRootIdForWave(wave, minRootId, null, function(err, newMinRootId){
                DAL.getMessagesForUserInWave(wave, newMinRootId, null, unreadIds, function(err, results){
                    memo = _.union(memo, results);
                    callback(null, memo);
                });
            });
        });
    },
    
    getMinUnreadRootIdForUserInWave: function(user, wave, callback) {
        var key = 'unread-' + user.id + '-' + wave.id;
        redis.smembers(key, function(err, results) {
            if (0 == results.length)
                callback(true, null);
            else
                MessageModel.find({waveId: wave.id})
                        .where('_id').in(results)
                        .select('rootId')
                        .sort('rootId')
                        .limit(1)
                        .exec(function(err, result){
                            var res = {
                                minRootId: _.first(result).rootId,
                                unreadIds: results
                            }
                            callback(null, res);
                        });
        });
    },
    
    getMinRootIdForWave: function(wave, minRootId, maxRootId, callback) {
        if (null == minRootId && null != maxRootId)
            minRootId = maxRootId;
        
        DAL.countMessagesInRange(wave, minRootId, maxRootId, function(err, count){
            if (count > 10)
                callback(null, minRootId)
            else
                DAL.getNextMinRootIdForWave(wave, minRootId, function(err, newMinRootId){
                    if (err || minRootId == newMinRootId)
                        callback(null, minRootId);
                    else
                        DAL.getMinRootIdForWave(wave, newMinRootId, maxRootId, callback);
                });
        });
    },
    
    getNextMinRootIdForWave: function(wave, minRootId, callback) {
        //ha keves, vagy ha a minRootId null
        var query = MessageModel.find({waveId: wave.id, parentId: null}).sort('-_id').limit(11);
        
        if (minRootId)
            query.where('rootId').lt(minRootId);
        
        query.exec(function(err, results){
            if (0 == results.length)
                callback(true);
            else
                callback(null, _.last(results).rootId);
        });
    },
    
    countMessagesInRange: function(wave, minRootId, maxRootId, callback) {
        var query = MessageModel.find({waveId: wave.id});
        
        if (!minRootId) {
            callback(null, 0);
        } else {
            query.where('rootId').gte(minRootId);
            
            if (maxRootId)
                query.where('rootId').lt(maxRootId);

            query.count(function(err, count) {
                callback(null, count);
            });
        }
    },
        
    getMessagesForUserInWave: function(wave, minRootId, maxRootId, unreadIds, callback) {
        var query = MessageModel.find({waveId: wave.id})
                    .sort('_id');
                    
        if (minRootId) {
            query.where('rootId').gte(minRootId);
        }
            
        if (maxRootId) {
            query.where('rootId').lt(maxRootId);
        }
        
        query.exec(function(err, messages){
            var res = _.map(messages, function(msg){
                msg = {
                    _id: msg.id, 
                    userId: msg.userId, 
                    waveId: msg.waveId, 
                    parentId: msg.parentId, 
                    message: msg.message, 
                    unread: _.indexOf(unreadIds, msg.id) >= 0, 
                    created_at: msg.created_at
                };
                return msg;
            });
            
            callback(null, res);
        });
    },
        
    readMessage: function(user, message) {
        var key = 'unread-' + user.id + '-' + message.waveId;
        console.log(key);
        redis.srem(key, message.id);
        console.log(user.id + ' read ' + message.id);
    },
    
    addUnreadMessage: function(user, message) {
        if (message.get('userId') != user.id) {
            var key = 'unread-' + user.id + '-' + message.get('waveId');
            console.log(key + ' added ' + message.id);
            redis.sadd(key, message.id);
            redis.sadd('unread-sets', key);//nyomon akarjuk kovetni, h mik vannak
        }
    }
};

exports.DAL = DAL;