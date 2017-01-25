var _ = require('underscore'),
    async = require('async'),
    mysql = require('mysql'),
    Config = require('./Config'),
    GraphiteClient = require('./GraphiteClient'),
    connection;

/** @namespace */
var DALMySql = {
    /**
     * @param {SurfServer} server
     */
    init: function (server) {
        connection = mysql.createConnection(Config.mysql);
        connection.connect(function (err) {
            if (err) {
                console.error('error connecting: ' + err.stack);
                return;
            }

            console.log('connected as id ' + connection.threadId);
        });

        connection.query('SELECT id, name, avatar, email, google_id, google_avatar, facebook_id, facebook_avatar from user', function (err, users) {
            if (err) {
                throw err;
            }

            var usersTmp = _.map(users, function (user) {
                return {
                    name: user.name,
                    avatar: user.avatar,
                    _id: user.id,
                    email: user.email,
                    googleId: user.google_id,
                    googleAvatar: user.google_avatar,
                    facebookId: user.facebook_id,
                    facebookAvatar: user.facebook_avatar
                };
            });
            server.users.reset(usersTmp);
            usersTmp = null;

            connection.query('SELECT id, title FROM wave ORDER BY id', function (err, waves) {
                if (err) {
                    throw err;
                }

                connection.query('SELECT wave_id, user_id FROM wave_user', function (err, waveUser) {
                    if (err) {
                        throw err;
                    }

                    var wavesTmp = _.map(waves, function (wave) {
                        var userIds = _.pluck(_.where(waveUser, {wave_id: wave.id}), 'user_id');
                        return {title: wave.title, userIds: userIds, _id: wave.id};
                    });

                    server.waves.reset(wavesTmp);
                    server.startServer();
                });
            });
        });

        //temporary fix: delete all unread, if user has more than 1000
        /*
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
        */
    },

    /**
     * @param {User} user
     * @param {Function} callback
     */
    saveUser: function (user, callback) {
        var data = {
            name: user.get('name'),
            avatar: user.get('avatar'),
            google_id: user.get('googleId') || null,
            google_avatar: user.get('googleAvatar') || null,
            facebook_id: user.get('facebookId') || null,
            facebook_avatar: user.get('facebookAvatar') || null,
            email: user.get('email')
        };

        if (user.isNew()) {
            connection.query('INSERT INTO user SET ?', data, function (err, res) {
                if (err) {
                    console.log(err);
                    return callback(err);
                }
                user.set({_id: res.insertId});
                return callback(null, user);
            });
        } else {
            connection.query('UPDATE user SET ? WHERE id = ?', [data, user.id], function (err) {
                if (err) {
                    return callback(err);
                }
                return callback(null, user);
            });
        }
    },

    /**
     * @param {Wave} wave
     * @param {Function} callback
     */
    saveWave: function (wave, callback) {
        var data = {
            title: wave.get('title') || null
        };

        if (wave.isNew()) {
            connection.query('INSERT INTO wave SET ?', data, function (err, res) {
                if (err) {
                    console.log(err);
                    return callback(err);
                }
                console.log(res.insertId);
                wave.set({_id: res.insertId});
                return DALMySql.saveWaveUserIds(wave, callback);
            });
        } else {
            connection.query('UPDATE wave SET ? WHERE id = ?', [data, wave.id], function (err) {
                if (err) {
                    console.log(err);
                    return callback(err);
                }
                return DALMySql.saveWaveUserIds(wave, callback);
            });
        }
    },

    saveWaveUserIds: function (wave, callback) {
        connection.query('SELECT user_id FROM wave_user WHERE wave_id = ?', [wave.id], function (err, res) {
            if (err) {
                console.log(err);
                return;
            }

            var userIdsDB = _.pluck(res, 'user_id'),
                userIds = _.uniq(_.map(wave.get('userIds'), function (id) {
                    return parseInt(id, 10);
                }));

            //transaction?
            async.each(userIds, function (userId, callback) {
                if (userIdsDB.indexOf(userId) === -1) {
                    connection.query('INSERT INTO wave_user SET ?', {
                        wave_id: wave.id,
                        user_id: userId
                    }, function (err) {
                        if (err) {
                            console.log(err);
                        }
                        console.log('insert:', wave.id, userId);
                        callback(err);
                    });
                } else {
                    callback(null);
                }
            }, function (err) {
                return callback(err, wave);
            });
        });
    },

    /**
     * @param {Message} message
     * @param {Function} callback
     */
    saveMessage: function (message, callback) {
        var m = {
            user_id: message.get('userId'),
            wave_id: message.get('waveId'),
            parent_id: message.get('parentId'),
            message: message.get('message')
        };

        connection.beginTransaction(function (err) {
            if (err) {
                return callback(err);
            }

            DALMySql.queryTransaction('INSERT INTO message SET ?', m, false, function (err, res) {
                if (err) {
                    return callback(err);
                }

                message.set({_id: res.insertId});

                if (null === message.get('parentId')) {
                    DALMySql.queryTransaction('UPDATE message SET root_id = ? WHERE id = ?', [message.id, message.id], true, function (err) {
                        if (err) {
                            return callback(err);
                        }
                        return callback(null, message);
                    });
                } else {
                    DALMySql.queryTransaction('SELECT root_id FROM message WHERE id = ?', [m.parent_id], false, function (err, res) {
                        if (err) {
                            return callback(err);
                        }
                        DALMySql.queryTransaction('UPDATE message SET root_id = ? where id = ?', [res[0].root_id, message.id], true, function (err) {
                            return callback(err, message);
                        });
                    });
                }
            });
        });
    },

    queryTransaction: function (query, queryParams, commit, callback) {
        connection.query(query, queryParams, function (err, result) {
            if (err) {
                return connection.rollback(function () {
                    return callback(err);
                });
            }

            if (commit) {
                connection.commit(function (err) {
                    if (err) {
                        return connection.rollback(function () {
                            return callback(err);
                        });
                    }

                    return callback(null, result);
                });
            } else {
                return callback(null, result);
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

        async.each(user.waves.toArray(), function (wave, callback_async_each) {
            DALMySql.getLastMessagesForUserInWave(user, wave, function (err, results) {
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

            var allTime = new Date().getTime() - startTime;
            GraphiteClient.track('.lastmessagesforuser.time', allTime);

            console.log('QUERY LastMessagesForUser: msg query in ' + allTime);
            console.log('QUERY LastMessagesForUser: msgs: ' + msgCount);
            callbackReady();
        });
    },

    /**
     * Unread messages for an user in a wave
     * @param {User} user
     * @param {Wave} wave
     * @param {Function} callback
     */
    getLastMessagesForUserInWave: function (user, wave, callback) {
        console.log('QUERY getLastMessagesForUserInWave: ' + wave.id);
        DALMySql.getMinUnreadRootIdForUserInWave(user, wave, function (err, result) {
            //console.log(result);
            var minRootId = null,
                unreadIds = [];
            if (!err) {//we have unread messages!
                minRootId = result.minRootId;
                unreadIds = result.unreadIds;
            }

            DALMySql.getMinRootIdForWave(wave, minRootId, null, function (err, newMinRootId) {
                if (err) {
                    return callback(err);
                }
                DALMySql.getMessagesForUserInWave(wave, newMinRootId, null, unreadIds, function (err, results) {
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
        var endTime, startTime = new Date().getTime();

        connection.query('SELECT MIN(message.root_id) AS minRootId FROM message ' +
            'INNER JOIN unread ON unread.message_id = message.id ' +
            'WHERE message.wave_id = ? AND unread.user_id = ?',
            [wave.id, user.id], function (err, res) {
                endTime = new Date().getTime();
                console.log('QUERY getMinUnreadRootIdForUserInWave: ' + wave.id + ' query in ' + (endTime - startTime));
                console.log('QUERY getMinUnreadRootIdForUserInWave: ' + wave.id + ' count: ' + res.length);

                if (err || _.first(res).minRootId === null) {
                    callback(true, null);
                } else {
                    DALMySql.getUnreadIdsForUserInWave(user, wave, function (err, ids) {
                        var result = {
                            minRootId: _.first(res).minRootId,
                            unreadIds: ids
                        };
                        return callback(err, result);
                    });
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
        var startTime = new Date().getTime();

        connection.query('SELECT message_id FROM unread WHERE wave_id = ? AND user_id = ?', [wave.id, user.id], function (err, results) {
            var endTime = new Date().getTime();
            console.log('QUERY getUnreadIdsForUserInWave: ' + wave.id + ' query in ' + (endTime - startTime));
            callback(err, _.pluck(results, 'message_id'));
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

        DALMySql.countMessagesInRange(wave, minRootId, maxRootId, function (err, count) {
            if (err) {
                return callback(err);
            }
            if (count > 10) {
                callback(null, minRootId);
            } else {
                DALMySql.getNextMinRootIdForWave(wave, minRootId, function (err, newMinRootId) {
                    if (err || minRootId === newMinRootId) {
                        callback(null, minRootId);
                    } else {
                        DALMySql.getMinRootIdForWave(wave, newMinRootId, maxRootId, callback);
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
            query = 'SELECT root_id FROM message WHERE wave_id = ? AND parent_id IS NULL',
            queryParams = [wave.id];
            //query = MessageModel.find({waveId: wave.id, parentId: null}).sort('-_id').limit(11);

        if (minRootId) {
            //if parentId is null, rootId = _id, we have index on _id
            query += ' AND id < ?';
            queryParams.push(minRootId);
        }

        query += ' ORDER BY id DESC LIMIT 11';

        connection.query(query, queryParams, function (err, results) {
            var endTime = new Date().getTime();
            console.log('QUERY getNextMinRootIdForWave: ' + wave.id + ' query in ' + (endTime - startTime));
            if (err || 0 === results.length) {
                callback(true);
            } else {
                callback(null, _.last(results).root_id);
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
                query = 'SELECT count(id) AS count FROM message WHERE wave_id = ? AND root_id >= ?',
                queryParams = [wave.id, minRootId];

            if (maxRootId) {
                query += ' AND root_id < ?';
                queryParams.push(maxRootId);
            }

            connection.query(query, queryParams, function (err, res) {
                if (err) {
                    return callback(err, 0);
                }
                var endTime = new Date().getTime();
                console.log('QUERY countMessagesInRange: query in ' + (endTime - startTime));
                callback(null, res[0].count);
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
            query = 'SELECT * FROM message WHERE wave_id = ?',
            queryParams = [wave.id];

        if (minRootId) {
            query += ' AND root_id >= ?';
            queryParams.push(minRootId);
        }

        if (maxRootId) {
            query += ' AND root_id < ?';
            queryParams.push(maxRootId);
        }

        query += ' ORDER BY id';

        connection.query(query, queryParams, function (err, messages) {
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
                    userId: mmsg.user_id,
                    waveId: mmsg.wave_id,
                    parentId: mmsg.parent_id,
                    message: mmsg.message,
                    unread: _.indexOf(unreadIds, mmsg.id) >= 0,
                    created_at: mmsg.created_at
                };

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
        connection.query('DELETE FROM unread WHERE user_id = ? AND message_id = ?', [user.id, message.id]);
    },

    /**
     * @param {User} user
     * @param {Message} message
     */
    addUnreadMessage: function (user, message) {
        if (message.get('userId') !== user.id && message.id) {
            connection.query('INSERT INTO unread SET ?', {user_id: user.id, wave_id: message.get('waveId'), message_id: message.id}, function (err) {
                if (err) {
                    console.log(err);
                }
            });
        }
    },

    /**
     * @param {User} user
     * @param {Wave} wave
     */
    readAllMessagesForUserInWave: function (user, wave) {
        connection.query('DELETE FROM unread WHERE user_id = ? AND wave_id = ?', [user.id, wave.id]);
    },

    /**
     * @param {User} user
     * @param {Wave} wave
     * @param {Function} callback
     */
    createInviteCodeForWave: function (user, wave, callback) {
        var code = (Math.random() + 1).toString(36).replace(/\W/g, ''),
            data = {
                user_id: user.id,
                wave_id: wave.id,
                code: code
            };

        connection.query('INSERT INTO invite SET ?', data, function (err) {
            return callback(err, code);
        });
    },

    /**
     * @param {string} code
     * @param {Function} callback
     */
    getWaveInvitebyCode: function (code, callback) {
        connection.query('SELECT wave_id as waveId, code FROM invite WHERE code = ?', [code], function (err, res) {
            return callback(err, _.first(res));
        });
    },

    /**
     * @param {string} code
     * @param {Function} callback
     */
    removeWaveInviteByCode: function (code, callback) {
        connection.query('DELETE FROM invite WHERE code = ?', [code], function (err) {
            return callback(err, {result: {ok: 1}});
        });
    },

    /**
     * @param {Function} callback
     */
    shutdown: function (callback) {
        connection.end(function (err) {
            console.log('mysql down' + (err || ''));
            callback();
        });
    }
};

module.exports = DALMySql;