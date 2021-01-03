const _ = require('underscore'),
    async = require('async'),
    mysql = require('mysql'),
    Config = require('./Config'),
    GraphiteClient = require('./GraphiteClient');

let connection;

/** @namespace */
const DALMySql = {
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

            const usersTmp = users.map((user) => {
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

            connection.query('SELECT id, title FROM wave ORDER BY id', function (err, waves) {
                if (err) {
                    throw err;
                }

                connection.query('SELECT wave_id, user_id FROM wave_user', function (err, waveUser) {
                    if (err) {
                        throw err;
                    }

                    const wavesTmp = waves.map((wave) => {
                        const userIds = _.pluck(_.where(waveUser, {wave_id: wave.id}), 'user_id');
                        return {title: wave.title, userIds: userIds, _id: wave.id};
                    });

                    server.waves.reset(wavesTmp);
                    server.startServer();
                });
            });
        });
    },

    /**
     * @param {User} user
     */
    saveUser: function (user) {
        return new Promise((resolve, reject) => {
            const data = {
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
                        return reject(err);
                    }
                    user.set({_id: res.insertId});
                    return resolve(user);
                });
            } else {
                connection.query('UPDATE user SET ? WHERE id = ?', [data, user.id], function (err) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(user);
                });
            }
        });
    },

    /**
     * @param {Wave} wave
     */
    saveWave: function (wave) {
        return new Promise((resolve, reject) => {
            const data = {
                title: wave.get('title') || null
            };

            if (wave.isNew()) {
                connection.query('INSERT INTO wave SET ?', data, function (err, res) {
                    if (err) {
                        console.log(err);
                        return reject(err);
                    }
                    console.log(res.insertId);
                    wave.set({_id: res.insertId});
                    return resolve(DALMySql.saveWaveUserIds(wave));
                });
            } else {
                connection.query('UPDATE wave SET ? WHERE id = ?', [data, wave.id], function (err) {
                    if (err) {
                        console.log(err);
                        return reject(err);
                    }
                    return resolve(DALMySql.saveWaveUserIds(wave));
                });
            }
        });
    },

    saveWaveUserIds: function (wave) {
        return new Promise((resolve, reject) => {
            connection.query('SELECT user_id FROM wave_user WHERE wave_id = ?', [wave.id], function (err, res) {
                if (err) {
                    console.log(err);
                    return reject(err);
                }

                const userIdsDB = _.pluck(res, 'user_id');
                const userIds = _.uniq(_.map(wave.get('userIds'), function (id) {
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
                                return reject(err);
                            }
                            console.log('insert:', wave.id, userId);
                            callback(err);
                        });
                    } else {
                        callback(null);
                    }
                }, function (err) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(wave);
                });
            });
        });
    },

    /**
     * @param {Message} message
     */
    saveMessage: function (message) {
        return new Promise((resolve, reject) => {
            const m = {
                user_id: message.get('userId'),
                wave_id: message.get('waveId'),
                parent_id: message.get('parentId'),
                message: message.get('message')
            };

            connection.beginTransaction(function (err) {
                if (err) {
                    return reject(err);
                }

                DALMySql.queryTransaction('INSERT INTO message SET ?', m, false, function (err, res) {
                    if (err) {
                        return reject(err);
                    }

                    message.set({_id: res.insertId});

                    if (null === message.get('parentId')) {
                        DALMySql.queryTransaction('UPDATE message SET root_id = ? WHERE id = ?', [message.id, message.id], true, function (err) {
                            if (err) {
                                return reject(err);
                            }
                            return resolve(message);
                        });
                    } else {
                        DALMySql.queryTransaction('SELECT root_id FROM message WHERE id = ?', [m.parent_id], false, function (err, res) {
                            if (err) {
                                return reject(err);
                            }
                            DALMySql.queryTransaction('UPDATE message SET root_id = ? where id = ?', [res[0].root_id, message.id], true, function (err) {
                                if (err) {
                                    return reject(err);
                                }
                                return resolve(message);
                            });
                        });
                    }
                });
            });
        });
    },

    queryTransaction: function (query, queryParams, commit) {
        return new Promise((resolve, reject) => {
            connection.query(query, queryParams, function (err, result) {
                if (err) {
                    return connection.rollback(function () {
                        return reject(err);
                    });
                }

                if (commit) {
                    connection.commit(function (err) {
                        if (err) {
                            return connection.rollback(function () {
                                return reject(err);
                            });
                        }

                        return resolve(result);
                    });
                } else {
                    return resolve(result);
                }
            });
        });
    },

    /**
     * messages queried for the user on load
     * @param {User} user
     * @param {Function} callbackWithMessages
     */
    getLastMessagesForUser: async function (user, callbackWithMessages) {
        const startTime = new Date().getTime();
        let msgCount = 0;

        for (let wave of user.waves.toArray()) {
            const results = await DALMySql.getLastMessagesForUserInWave(user, wave);
            msgCount += results.length;
            callbackWithMessages(null, results, wave._id);
        }

        const allTime = new Date().getTime() - startTime;
        GraphiteClient.track('.lastmessagesforuser.time', allTime);

        console.log('QUERY LastMessagesForUser: msg query in ' + allTime);
        console.log('QUERY LastMessagesForUser: msgs: ' + msgCount);
    },

    /**
     * Unread messages for an user in a wave
     * @param {User} user
     * @param {Wave} wave
     */
    getLastMessagesForUserInWave: async function (user, wave) {
        console.log('QUERY getLastMessagesForUserInWave: ' + wave.id);
        const { minRootId, unreadIds } = await DALMySql.getMinUnreadRootIdForUserInWave(user, wave);

        const newMinRootId = await DALMySql.getMinRootIdForWave(wave, minRootId, null);
        return DALMySql.getMessagesForUserInWave(wave, newMinRootId, null, unreadIds);
    },

    /**
     *
     * @param {User} user
     * @param {Wave} wave
     */
    getMinUnreadRootIdForUserInWave: function (user, wave) {
        return new Promise((resolve, reject) => {
            const startTime = new Date().getTime();

            connection.query('SELECT MIN(message.root_id) AS minRootId FROM message ' +
                'INNER JOIN unread ON unread.message_id = message.id ' +
                'WHERE message.wave_id = ? AND unread.user_id = ?',
            [wave.id, user.id], async function (err, res) {
                const endTime = new Date().getTime();
                console.log('QUERY getMinUnreadRootIdForUserInWave: ' + wave.id + ' query in ' + (endTime - startTime));
                console.log('QUERY getMinUnreadRootIdForUserInWave: ' + wave.id + ' count: ' + res.length);

                if (err || _.first(res).minRootId === null) {
                    reject(err);
                } else {
                    const ids = await DALMySql.getUnreadIdsForUserInWave(user, wave);
                    return resolve({
                        minRootId: _.first(res).minRootId,
                        unreadIds: ids
                    });
                }
            });
        });
    },

    /**
     *
     * @param {User} user
     * @param {Wave} wave
     */
    getUnreadIdsForUserInWave: function (user, wave) {
        return new Promise((resolve, reject) => {
            const startTime = new Date().getTime();

            connection.query('SELECT message_id FROM unread WHERE wave_id = ? AND user_id = ?', [wave.id, user.id], function (err, results) {
                const endTime = new Date().getTime();
                console.log('QUERY getUnreadIdsForUserInWave: ' + wave.id + ' query in ' + (endTime - startTime));
                if (err) {
                    return reject(err);
                }
                resolve(_.pluck(results, 'message_id'));
            });
        });
    },

    /**
     *
     * @param {Wave} wave
     * @param {number} minRootId
     * @param {number} maxRootId
     */
    getMinRootIdForWave: async function (wave, minRootId, maxRootId) {
        console.log('QUERY getMinRootIdForWave: ' + wave.id);
        if (null === minRootId && null !== maxRootId) {
            minRootId = maxRootId;
        }

        const count = await DALMySql.countMessagesInRange(wave, minRootId, maxRootId);
        if (count > 10) {
            return minRootId;
        } else {
            try {
                const newMinRootId = await DALMySql.getNextMinRootIdForWave(wave, minRootId);
                if (!newMinRootId || minRootId === newMinRootId) {
                    return minRootId;
                } else {
                    return DALMySql.getMinRootIdForWave(wave, newMinRootId, maxRootId);
                }
            } catch (err) {
                return minRootId;
            }
        }
    },

    /**
     * @param {Wave} wave
     * @param {number} minRootId
     */
    getNextMinRootIdForWave: function (wave, minRootId) {
        return new Promise((resolve, reject) => {
            //if not enough, or minRootId is null
            const startTime = new Date().getTime();
            const queryParams = [wave.id];
            let query = 'SELECT root_id FROM message WHERE wave_id = ? AND parent_id IS NULL';

            if (minRootId) {
                //if parentId is null, rootId = _id, we have index on _id
                query += ' AND id < ?';
                queryParams.push(minRootId);
            }

            query += ' ORDER BY id DESC LIMIT 11';

            connection.query(query, queryParams, function (err, results) {
                const endTime = new Date().getTime();
                console.log('QUERY getNextMinRootIdForWave: ' + wave.id + ' query in ' + (endTime - startTime));
                if (err) {
                    return reject(err);
                }

                if (0 === results.length) {
                    return resolve(null);
                } else {
                    resolve(_.last(results).root_id);
                }
            });
        });
    },

    /**
     * @param {Wave} wave
     * @param {number} minRootId
     * @param {number} maxRootId
     */
    countMessagesInRange: function (wave, minRootId, maxRootId) {
        return new Promise((resolve, reject) => {
            if (!minRootId) {
                return resolve(0);
            }
            const startTime = new Date().getTime();
            const queryParams = [wave.id, minRootId];
            let query = 'SELECT count(id) AS count FROM message WHERE wave_id = ? AND root_id >= ?';

            if (maxRootId) {
                query += ' AND root_id < ?';
                queryParams.push(maxRootId);
            }

            connection.query(query, queryParams, function (err, res) {
                if (err) {
                    return reject(err);
                }
                const endTime = new Date().getTime();
                console.log('QUERY countMessagesInRange: query in ' + (endTime - startTime));
                resolve(res[0].count);
            });
        });
    },

    /**
     * @param {Wave} wave
     * @param {number} minRootId
     * @param {number} maxRootId
     * @param {Array} unreadIds
     */
    getMessagesForUserInWave: function (wave, minRootId, maxRootId, unreadIds) {
        return new Promise((resolve, reject) => {
            const startTime = new Date().getTime();
            const queryParams = [wave.id];
            let query = 'SELECT * FROM message WHERE wave_id = ?';

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
                const endTime = new Date().getTime();
                console.log('QUERY getMessagesForUserInWave: ' + wave.id + ' query in ' + (endTime - startTime));

                if (err) {
                    return reject(err);
                }

                const res = messages.map((mmsg) => {
                    return {
                        _id: mmsg.id,
                        userId: mmsg.user_id,
                        waveId: mmsg.wave_id,
                        parentId: mmsg.parent_id,
                        message: mmsg.message,
                        unread: unreadIds.includes(mmsg.id),
                        created_at: mmsg.created_at
                    };
                });

                resolve(res);
            });
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
     */
    createInviteCodeForWave: function (user, wave) {
        return new Promise((resolve, reject) => {
            const code = (Math.random() + 1).toString(36).replace(/\W/g, '');
            const data = {
                user_id: user.id,
                wave_id: wave.id,
                code: code
            };

            connection.query('INSERT INTO invite SET ?', data, function (err) {
                if (err) {
                    return reject(err);
                }
                return resolve(code);
            });
        });
    },

    /**
     * @param {string} code
     */
    getWaveInvitebyCode: function (code) {
        return new Promise((resolve, reject) => {
            connection.query('SELECT wave_id as waveId, code FROM invite WHERE code = ?', [code], function (err, res) {
                if (err) {
                    return reject(err);
                }
                return resolve(_.first(res));
            });
        });
    },

    /**
     * @param {string} code
     */
    removeWaveInviteByCode: function (code) {
        return new Promise((resolve, reject) => {
            connection.query('DELETE FROM invite WHERE code = ?', [code], function (err) {
                if (err) {
                    return reject(err);
                }
                return resolve({result: {ok: 1}});
            });
        });
    },

    shutdown: function () {
        return new Promise((resolve, reject) => {
            connection.end(function (err) {
                console.log('mysql down' + (err || ''));
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
};

module.exports = DALMySql;
