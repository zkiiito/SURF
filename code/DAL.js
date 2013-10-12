var _ = require('underscore'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    redis = require('redis-url'),
    async = require('async');

var UserSchema = new Schema({
    name: {type: String, trim: true},
    avatar: {type: String, trim: true},
    googleId: {type: String, trim: true},
    email: {type: String, trim: true}
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

var WaveInviteSchema = new Schema({
    userId: Schema.ObjectId,
    waveId: Schema.ObjectId,
    code: {type: String, trim: true},
    usedById: Schema.ObjectId,
    created_at: {type: Date}
});

var WaveInviteModel = mongoose.model('WaveInviteModel', WaveInviteSchema);

var DAL = {
    init: function(server) {
        mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://localhost/wave0');
        redis = redis.connect(process.env.REDISCLOUD_URL || 'redis://localhost:6379');
        
        //mongoose.set('debug', true);
        
        UserModel.find().exec(function(err, users){
            var usersTmp = [];
            _.each(users, function(user) {
                usersTmp.push({name: user.name, avatar: user.avatar, _id: user._id, googleId: user.googleId});
            });
            server.users.reset(usersTmp);
            usersTmp = null;

            WaveModel.find().sort('_id').exec(function(err, waves){
                var wavesTmp = [];
                _.each(waves, function(wave){
                    wavesTmp.push({title: wave.title, userIds: wave.userIds, _id: wave._id});
                });
                server.waves.reset(wavesTmp);

                if (waves.length === 0) {
                    server.initData();
                }

                server.startServer();
            });
        });
        
        //temporary fix a sajat unreadokra: ha tobb mint 1000, lenullazzuk
        UserModel.find().exec(function(err, users){
            _.each(users, function(user) {
                redis.keys('unread-' + user._id + '-*', function(err, unreadKeys){
                    _.each(unreadKeys, function(key){
                        redis.scard(key, function(err, msgcount){
                            if (msgcount > 1000) {
                                console.log('deleteTooMuchUnread: ' + key + ' : ' + msgcount);
                                redis.del(key);
                            }
                        });
                    });
                });
            });
        });
    },
   
    saveUser: function(user) {
        var data = {
            name: user.get('name'),
            avatar: user.get('avatar'),
            googleId: user.get('googleId'),
            email: user.get('email')
        }, m;
        
        if (user.isNew()) {
            m = new UserModel(data);
            m.save();
            user.set({_id: m._id});
        } else {
            UserModel.update({_id: user.id}, data).exec();
        }
        return user;
    },
    
    saveWave: function(wave) {
        var data = {
            title: wave.get('title'),
            userIds: _.uniq(wave.get('userIds'))
        }, m;
        
        if (wave.isNew()) {
            m = new WaveModel(data);
            m.save();
            wave.set({_id: m._id});
        } else {
            WaveModel.update({_id: wave.id}, data).exec();
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
        
        if (null === m.parentId) {
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
    calcRootId: function(messageId, messages, callback) {
        MessageModel.findById(messageId, function(err, message){
            if (err) {
                console.log('calcRootId: error');
                return;
            }
            //ha gyokerelem, vagy tud arrol valamit
            if (null !== message.rootId || null === message.parentId) {
                var rootId = null;
                
                if (null !== message.rootId) {
                    rootId = message.rootId;
                }
                else if (null === message.parentId) {
                    rootId = message._id;
                    messages.push(message);
                }
                
                async.forEach(messages, function(msg){
                    MessageModel.update({_id: msg._id}, {rootId: rootId}).exec();
                });
                
                if (callback) {
                    callback(null, rootId);
                }
            }
            else
            {
                messages.push(message);
                DAL.calcRootId(message.parentId, messages, callback);
            }
        });
    },
    
    /**
     * messages queried for the user on load
     * @param User user
     * @param Function callback
     * @returns void
     */
    getLastMessagesForUser: function(user, callback) {
        var startTime = new Date().getTime();
        WaveModel.find().where('_id').in(user.waves.pluck('_id')).exec(function(err, waves) {
            //console.log(waves.length + " waves found");
            async.reduce(waves, [], function(memo, wave, callback_async_reduce){//ez nem parhuzamosan fut, de async mert az iteratornak callbackje van
                DAL.getLastMessagesForUserInWave(user, wave, memo, callback_async_reduce);
            }, function(err, results) {
                var endTime = new Date().getTime();
                console.log('LastMessagesForUser: msg query in ' + (endTime - startTime));
                console.log('LastMessagesForUser: msgs: ' + results.length);
                callback(results);
            });
	});
    },

    /**
     * Unread messages for an user in a wave
     * @param User user
     * @param Wave wave
     * @param Array memo
     * @param Function callback
     */
    getLastMessagesForUserInWave: function(user, wave, memo, callback) {
        DAL.getMinUnreadRootIdForUserInWave(user, wave, function(err, result){
            //console.log(result);
            var minRootId = null,
                unreadIds = [];
            if (!err) {//ha van unread
                minRootId = result.minRootId;
                unreadIds = result.unreadIds;
            }
            
            DAL.getMinRootIdForWave(wave, minRootId, null, function(err, newMinRootId){
                DAL.getMessagesForUserInWave(wave, newMinRootId, null, unreadIds, function(err, results){
                    if (!err) {
                        memo = _.union(memo, results);
                    }
                    callback(null, memo);
                });
            });
        });
    },
    
    /**
     * 
     * @param User user
     * @param Wave wave
     * @param Function callback
     */
    getMinUnreadRootIdForUserInWave: function(user, wave, callback) {
        DAL.getUnreadIdsForUserInWave(user, wave, function(err, results) {
            if (0 === results.length) {
                callback(true, null);
            } else {
                console.log('getMinUnreadRootIdForUserInWave: count: ' + results.length);
                //TODO: ha tul sok van, akkor hogyan mit???
                MessageModel.findOne({waveId: wave.id})
                        .where('_id').in(results)
                        .select('rootId')
                        .sort('rootId')
                        .limit(1)
                        .exec(function(err, result){
                            if (err || !result) {
                                return callback(true, null);
                            }
                            var res = {
                                minRootId: result.rootId,
                                unreadIds: results
                            };
                            callback(null, res);
                        });
            }
        });
    },

    /**
     * 
     * @param user UserModel
     * @param wave WaveModel
     * @param callback Function
     */
    getUnreadIdsForUserInWave: function(user, wave, callback) {
        var key = 'unread-' + user.id + '-' + wave.id;
        redis.smembers(key, callback);
    },
    
    getMinRootIdForWave: function(wave, minRootId, maxRootId, callback) {
        if (null === minRootId && null !== maxRootId) {
            minRootId = maxRootId;
        }
        
        DAL.countMessagesInRange(wave, minRootId, maxRootId, function(err, count){
            if (count > 10) {
                callback(null, minRootId);
            } else {
                DAL.getNextMinRootIdForWave(wave, minRootId, function(err, newMinRootId){
                    if (err || minRootId === newMinRootId) {
                        callback(null, minRootId);
                    } else {
                        DAL.getMinRootIdForWave(wave, newMinRootId, maxRootId, callback);
                    }
                });
            }
        });
    },
    
    getNextMinRootIdForWave: function(wave, minRootId, callback) {
        //ha keves, vagy ha a minRootId null
        var query = MessageModel.find({waveId: wave.id, parentId: null}).sort('-_id').limit(11);
        
        if (minRootId) {
            query.where('rootId').lt(minRootId);
        }
        
        query.exec(function(err, results){
            if (0 === results.length) {
                callback(true);
            } else {
                callback(null, _.last(results).rootId);
            }
        });
    },
    
    countMessagesInRange: function(wave, minRootId, maxRootId, callback) {
        var query = MessageModel.find({waveId: wave.id});
        
        if (!minRootId) {
            callback(null, 0);
        } else {
            query.where('rootId').gte(minRootId);
            
            if (maxRootId) {
                query.where('rootId').lt(maxRootId);
            }

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
            if (err || messages.length === 0) {
                return callback(true);
            }
            
            var res = _.map(messages, function(mmsg){
                var msg = {
                    _id: mmsg.id, 
                    userId: mmsg.userId, 
                    waveId: mmsg.waveId, 
                    parentId: mmsg.parentId, 
                    message: mmsg.message, 
                    //unread: _.indexOf(unreadIds, mmsg.id) >= 0, 
                    created_at: mmsg.created_at
                };
                
                try {
                    msg.unread = _.indexOf(unreadIds, mmsg.id) >= 0;
                }
                catch (error) {
                    /*
                     * quickfix:
                     * ez a hiba lokalban sosem jelentkezik, csak elesben
                     * valahogy a redis altal visszaadott tombbol string lesz, ha 1 elemu
                     */
                    console.log('DEBUG getMessagesForUserInWave: ' + error.message);
                    console.log('DEBUG getMessagesForUserInWave:  messages.length: ' + messages.length + 
                        ', unreadIds: ' + unreadIds.length + ' ' + (typeof unreadIds) + ' msg.id: ' + mmsg.id);
                    
                    msg.unread = true;
                    
                    if ('string' === typeof unreadIds) {
                        msg.unread = unreadIds === mmsg.id.toString();
                    }
                }
                return msg;
            });
            
            callback(null, res);
        });
    },
        
    readMessage: function(user, message) {
        var key = 'unread-' + user.id + '-' + message.waveId;
        redis.srem(key, message.id);
    },
    
    addUnreadMessage: function(user, message) {
        //itt fontos a != a !== helyett!
        if (message.get('userId') != user.id && message.id) {
            //console.log('addUnreadMessage: userid: ' + typeof user.id + ' msguserid: ' + typeof message.get('userId') + ' msgid: ' + message.id);
            var key = 'unread-' + user.id + '-' + message.get('waveId');
            redis.sadd(key, message.id);
        }
    },
    
    readAllMessagesForUserInWave: function(user, wave) {
        var key = 'unread-' + user.id + '-' + wave.id;
        redis.del(key);
    },
            
    createInviteCodeForWave: function(user, wave) {
        var code = (Math.random() + 1).toString(36).replace(/[^a-z0-9]+/g, ''),
        data = {
            userId: user.id,
            waveId: wave.id,
            code: code,
            created_at: Date.now()
        }, m;
        
        m = new WaveInviteModel(data);
        m.save();
        return code;
    },
            
    getWaveInvitebyCode: function(code, callback) {
        WaveInviteModel.findOne({code: code}).exec(function(err, result){
           if (err || !result) {
               return callback(true);
           }
           
           callback(false, result);
        });
    },
            
    removeWaveInviteByCode: function(code, callback) {
        WaveInviteModel.remove({code: code}).exec(callback);
    }    
};

module.exports = DAL;