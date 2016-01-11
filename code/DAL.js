var _ = require('underscore'),
    mongoose = require('mongoose'),
    redis = require('./RedisClient'),
    async = require('async'),
    net = require('net'),
    Config = require('./Config'),
    UserModel = require('./MongooseModels').UserModel,
    WaveModel = require('./MongooseModels').WaveModel,
    MessageModel = require('./MongooseModels').MessageModel,
    WaveInviteModel = require('./MongooseModels').WaveInviteModel;

/** @namespace */
var DAL = {
    /**
     * @param {SurfServer} server
     */
    init: function (server) {
        mongoose.connect(Config.mongoUrl);
        //mongoose.set('debug', true);

        UserModel.find().exec(function (err, users) {
            if (err) {
                throw err;
            }

            var usersTmp = [];
            _.each(users, function (user) {
                usersTmp.push({name: user.name,
                               avatar: user.avatar,
                               _id: user._id,
                               email: user.email,
                               googleId: user.googleId,
                               googleAvatar: user.googleAvatar,
                               facebookId: user.facebookId,
                               facebookAvatar: user.facebookAvatar
                           });
            });
            server.users.reset(usersTmp);
            usersTmp = null;

            WaveModel.find().sort('_id').exec(function (err, waves) {
                if (err) {
                    throw err;
                }

                var wavesTmp = [];
                _.each(waves, function (wave) {
                    wavesTmp.push({title: wave.title, userIds: wave.userIds, _id: wave._id});
                });
                server.waves.reset(wavesTmp);
                server.startServer();
            });
        });

        //temporary fix: delete all unread, if user has more than 1000
        UserModel.find().exec(function (err, users) {
            if (!err) {
                _.each(users, function (user) {
                    redis.keys('unread-' + user._id + '-*', function (err, unreadKeys) {
                        if (!err) {
                            _.each(unreadKeys, function (key) {
                                redis.scard(key, function (err, msgcount) {
                                    if (!err && msgcount > 1000) {
                                        console.log('deleteTooMuchUnread: ' + key + ' : ' + msgcount);
                                        redis.del(key);
                                    }
                                });
                            });
                        }
                    });
                });
            }
        });
    },

    /**
     * @param {User} user
     * @returns {User}
     */
    saveUser: function (user) {
        var data = {
            name: user.get('name'),
            avatar: user.get('avatar'),
            googleId: user.get('googleId'),
            googleAvatar: user.get('googleAvatar'),
            facebookId: user.get('facebookId'),
            facebookAvatar: user.get('facebookAvatar'),
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

    /**
     * @param {Wave} wave
     * @returns {Wave}
     */
    saveWave: function (wave) {
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

    /**
     * @param {Message} message
     * @returns {Message}
     */
    saveMessage: function (message) {
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
            m.save(function (err) {
                if (!err) {
                    DAL.calcRootId(m.parentId, [m]);
                }
            });
        }

        message.set({_id: m._id});
        return message;
    },

    /**
     * rekurzivan, elvileg csak az elejen vannak olyan esetek, hogy nincs root id-je
     * @param {number} messageId
     * @param {number} messages
     * @param {Function} callback
     */
    calcRootId: function (messageId, messages, callback) {
        MessageModel.findById(messageId, function (err, message) {
            if (err) {
                console.log('calcRootId: error');
                return;
            }
            //if knows root element, or IS a root element
            if (null !== message.rootId || null === message.parentId) {
                var rootId = null;

                if (null !== message.rootId) {
                    rootId = message.rootId;
                } else if (null === message.parentId) {
                    rootId = message._id;
                    messages.push(message);
                }

                async.forEach(messages, function (msg) {
                    MessageModel.update({_id: msg._id}, {rootId: rootId}).exec();
                });

                if (callback) {
                    callback(null, rootId);
                }
            } else {
                messages.push(message);
                DAL.calcRootId(message.parentId, messages, callback);
            }
        });
    },

    /**
     * messages queried for the user on load
     * @param {User} user
     * @param {Function} callbackWithMessages
     * @param {Function} callbackReady
     */
    getLastMessagesForUser: function (user, callbackWithMessages, callbackReady) {
        var startTime = new Date().getTime(),
            msgCount = 0;

        WaveModel.find().where('_id').in(user.waves.pluck('_id')).exec(function (err, waves) {
            if (err) {
                return callbackReady(err);
            }
            //console.log(waves.length + " waves found");
            var endTime = new Date().getTime();
            console.log('QUERY LastMessagesForUser: wave query in ' + (endTime - startTime));

            async.each(waves, function (wave, callback_async_each) {
                DAL.getLastMessagesForUserInWave(user, wave, function (err, results) {
                    if (err) {
                        return callback_async_each(err);
                    }

                    msgCount += results.length;
                    callbackWithMessages(null, results, wave._id);
                    callback_async_each();
                });
            }, function (err) {
                if (err) {
                    console.log('QUERY LastMessagesForUser ERROR: ' + err);
                    return callbackReady(err);
                }

                var allTime = new Date().getTime() - startTime,
                    socket;

                //heroku
                if (Config.graphiteKey) {
                    socket = net.createConnection(2003, "carbon.hostedgraphite.com", function () {
                        socket.write(Config.graphiteKey + '.lastmessagesforuser.time ' + allTime + '\n');
                        socket.end();
                    });
                }

                console.log('QUERY LastMessagesForUser: msg query in ' + allTime);
                console.log('QUERY LastMessagesForUser: msgs: ' + msgCount);
                callbackReady();
            });
        });
    },

    /**
     * Unread messages for an user in a wave
     * @param {User} user
     * @param {Wave} wave
     * @param {Array} memo
     * @param {Function} callback
     */
    getLastMessagesForUserInWave: function (user, wave, callback) {
        console.log('QUERY getLastMessagesForUserInWave: ' + wave.id);
        DAL.getMinUnreadRootIdForUserInWave(user, wave, function (err, result) {
            //console.log(result);
            var minRootId = null,
                unreadIds = [];
            if (!err) {//we have unread messages!
                minRootId = result.minRootId;
                unreadIds = result.unreadIds;
            }

            DAL.getMinRootIdForWave(wave, minRootId, null, function (err, newMinRootId) {
                if (err) {
                    return callback(err);
                }
                DAL.getMessagesForUserInWave(wave, newMinRootId, null, unreadIds, function (err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, results);
                });
            });
        });
    },

    /**
     *
     * @param {User} user
     * @param {Wave} wave
     * @param {Function} callback
     */
    getMinUnreadRootIdForUserInWave: function (user, wave, callback) {
        DAL.getUnreadIdsForUserInWave(user, wave, function (err, results) {
            if (err || 0 === results.length) {
                callback(true, null);
            } else {
                console.log('QUERY getMinUnreadRootIdForUserInWave: ' + wave.id + ' count: ' + results.length);

                var res, endTime, startTime = new Date().getTime();

                MessageModel.findOne({waveId: wave.id})
                    .where('_id').in(results)
                    .select('rootId')
                    .sort('rootId')
                    .limit(1)
                    .exec(
                        function (err, result) {
                            endTime = new Date().getTime();
                            console.log('QUERY getMinUnreadRootIdForUserInWave: ' + wave.id + ' query in ' + (endTime - startTime));

                            if (err || !result) {
                                return callback(true, null);
                            }
                            res = {
                                minRootId: result.rootId,
                                unreadIds: results
                            };
                            callback(null, res);
                        }
                    );
            }
        });
    },

    /**
     *
     * @param {User} user
     * @param {Wave} wave
     * @param {Function} callback
     */
    getUnreadIdsForUserInWave: function (user, wave, callback) {
        var startTime = new Date().getTime(),
            key = 'unread-' + user.id + '-' + wave.id;
        redis.smembers(key, function (err, results) {
            var endTime = new Date().getTime();
            console.log('QUERY getUnreadIdsForUserInWave: ' + wave.id + ' query in ' + (endTime - startTime));
            callback(err, results);
        });
    },

    /**
     *
     * @param {Wave} wave
     * @param {number} minRootId
     * @param {number} maxRootId
     * @param {Function} callback
     */
    getMinRootIdForWave: function (wave, minRootId, maxRootId, callback) {
        console.log('QUERY getMinRootIdForWave: ' + wave.id);
        if (null === minRootId && null !== maxRootId) {
            minRootId = maxRootId;
        }

        DAL.countMessagesInRange(wave, minRootId, maxRootId, function (err, count) {
            if (err) {
                return callback(err);
            }
            if (count > 10) {
                callback(null, minRootId);
            } else {
                DAL.getNextMinRootIdForWave(wave, minRootId, function (err, newMinRootId) {
                    if (err || minRootId === newMinRootId) {
                        callback(null, minRootId);
                    } else {
                        DAL.getMinRootIdForWave(wave, newMinRootId, maxRootId, callback);
                    }
                });
            }
        });
    },

    /**
     * @param {Wave} wave
     * @param {number} minRootId
     * @param {Function} callback
     */
    getNextMinRootIdForWave: function (wave, minRootId, callback) {
        //if not enough, or minRootId is null
        var startTime = new Date().getTime(),
            query = MessageModel.find({waveId: wave.id, parentId: null}).sort('-_id').limit(11);


        if (minRootId) {
            //if parentId is null, rootId = _id, we have index on _id
            query.where('_id').lt(minRootId);
        }

        query.exec(function (err, results) {
            var endTime = new Date().getTime();
            console.log('QUERY getNextMinRootIdForWave: ' + wave.id + ' query in ' + (endTime - startTime));
            if (err || 0 === results.length) {
                callback(true);
            } else {
                callback(null, _.last(results).rootId);
            }
        });
    },

    /**
     * @param {Wave} wave
     * @param {number} minRootId
     * @param {number} maxRootId
     * @param {Function} callback
     */
    countMessagesInRange: function (wave, minRootId, maxRootId, callback) {
        if (!minRootId) {
            callback(null, 0);
        } else {
            var startTime = new Date().getTime(),
                query = MessageModel.find({waveId: wave.id});
            query.where('rootId').gte(minRootId);

            if (maxRootId) {
                query.where('rootId').lt(maxRootId);
            }

            query.count(function (err, count) {
                if (err) {
                    return callback(err, 0);
                }
                var endTime = new Date().getTime();
                console.log('QUERY countMessagesInRange: query in ' + (endTime - startTime));
                callback(null, count);
            });
        }
    },

    /**
     * @param {Wave} wave
     * @param {number} minRootId
     * @param {number} maxRootId
     * @param {Array} unreadIds
     * @param {Function} callback
     */
    getMessagesForUserInWave: function (wave, minRootId, maxRootId, unreadIds, callback) {
        var startTime = new Date().getTime(),
            query = MessageModel.find({waveId: wave.id})
                    .sort('_id');

        if (minRootId) {
            query.where('rootId').gte(minRootId);
        }

        if (maxRootId) {
            query.where('rootId').lt(maxRootId);
        }

        query.exec(function (err, messages) {
            var res, endTime = new Date().getTime();
            console.log('QUERY getMessagesForUserInWave: ' + wave.id + ' query in ' + (endTime - startTime));

            if (err) {
                return callback(err);
            }

            if (messages.length === 0) {
                return callback(false, []);
            }

            res = _.map(messages, function (mmsg) {
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
                } catch (error) {
                    /*
                     * quickfix:
                     * sometimes redis returning an array with 1 item, it becomes a string. mostly on heroku.
                     */
                    console.log('DEBUG getMessagesForUserInWave: ' + wave.id + ' error: ' + error.message);
                    console.log('DEBUG getMessagesForUserInWave: ' + wave.id + ' messages.length: ' + messages.length +
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

    /**
     * @param {User} user
     * @param {Message} message
     */
    readMessage: function (user, message) {
        var key = 'unread-' + user.id + '-' + message.waveId;
        redis.srem(key, message.id);
    },

    /**
     * @param {User} user
     * @param {Message} message
     */
    addUnreadMessage: function (user, message) {
        if (message.get('userId') !== user.id.toString() && message.id) {
            //console.log('addUnreadMessage: userid: ' + typeof user.id + ' msguserid: ' + typeof message.get('userId') + ' msgid: ' + message.id);
            var key = 'unread-' + user.id + '-' + message.get('waveId');
            redis.sadd(key, message.id);
        }
    },

    /**
     * @param {User} user
     * @param {Wave} wave
     */
    readAllMessagesForUserInWave: function (user, wave) {
        var key = 'unread-' + user.id + '-' + wave.id;
        redis.del(key);
    },

    /**
     * @param {User} user
     * @param {Wave} wave
     */
    createInviteCodeForWave: function (user, wave) {
        var m,
            code = (Math.random() + 1).toString(36).replace(/\W/g, ''),
            data = {
                userId: user.id,
                waveId: wave.id,
                code: code,
                created_at: Date.now()
            };

        m = new WaveInviteModel(data);
        m.save();
        return code;
    },

    /**
     * @param {string} code
     * @param {Function} callback
     */
    getWaveInvitebyCode: function (code, callback) {
        WaveInviteModel.findOne({code: code}).exec(callback);
    },

    /**
     * @param {string} code
     * @param {Function} callback
     */
    removeWaveInviteByCode: function (code, callback) {
        WaveInviteModel.remove({code: code}).exec(callback);
    }
};

module.exports = DAL;