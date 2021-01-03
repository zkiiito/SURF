const _ = require('underscore'),
    mysql = require('mysql2/promise'),
    Config = require('./Config'),
    GraphiteClient = require('./GraphiteClient');

let connection;

/** @namespace */
const DALMySql = {
    /**
     * @param {SurfServer} server
     */
    init: async function (server) {
        connection = await mysql.createConnection(Config.mysql);
        console.log('connected as id ' + connection.threadId);

        const users = await connection.query('SELECT id, name, avatar, email, google_id, google_avatar, facebook_id, facebook_avatar from user');
        const usersTmp = users.map((user) => ({
            name: user.name,
            avatar: user.avatar,
            _id: user.id,
            email: user.email,
            googleId: user.google_id,
            googleAvatar: user.google_avatar,
            facebookId: user.facebook_id,
            facebookAvatar: user.facebook_avatar
        }));
        server.users.reset(usersTmp);

        const waves = await connection.query('SELECT id, title FROM wave ORDER BY id');
        const waveUser = await connection.query('SELECT wave_id, user_id FROM wave_user');
        const wavesTmp = waves.map((wave) => {
            const userIds = _.pluck(_.where(waveUser, {wave_id: wave.id}), 'user_id');
            return {title: wave.title, userIds: userIds, _id: wave.id};
        });

        server.waves.reset(wavesTmp);
        server.startServer();
    },

    /**
     * @param {User} user
     */
    saveUser: async function (user) {
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
            const res = await connection.query('INSERT INTO user SET ?', data);
            user.set({_id: res.insertId});
        } else {
            await connection.query('UPDATE user SET ? WHERE id = ?', [data, user.id]);
        }
        return user;
    },

    /**
     * @param {Wave} wave
     */
    saveWave: async function (wave) {
        const data = {
            title: wave.get('title') || null
        };

        if (wave.isNew()) {
            const res = await connection.query('INSERT INTO wave SET ?', data);
            console.log(res.insertId);
            wave.set({_id: res.insertId});
        } else {
            await connection.query('UPDATE wave SET ? WHERE id = ?', [data, wave.id]);
        }
        return DALMySql.saveWaveUserIds(wave);
    },

    saveWaveUserIds: async function (wave) {
        const res = await connection.query('SELECT user_id FROM wave_user WHERE wave_id = ?', [wave.id]);
        const userIdsDB = _.pluck(res, 'user_id');
        const userIds = _.uniq(_.map(wave.get('userIds'), Number));

        const promises = userIds.map(userId => {
            if (userIdsDB.indexOf(userId) === -1) {
                return connection.query('INSERT INTO wave_user SET ?', {
                    wave_id: wave.id,
                    user_id: userId
                });
            }
        }).filter(Boolean);

        await Promise.all(promises);
        return wave;
    },

    /**
     * @param {Message} message
     */
    saveMessage: async function (message) {
        const m = {
            user_id: message.get('userId'),
            wave_id: message.get('waveId'),
            parent_id: message.get('parentId'),
            message: message.get('message')
        };

        await connection.beginTransaction();

        const res = await DALMySql.queryTransaction('INSERT INTO message SET ?', m, false);
        message.set({_id: res.insertId});

        if (null === message.get('parentId')) {
            await DALMySql.queryTransaction('UPDATE message SET root_id = ? WHERE id = ?', [message.id, message.id], true);
        } else {
            const res = await DALMySql.queryTransaction('SELECT root_id FROM message WHERE id = ?', [m.parent_id], false);
            await DALMySql.queryTransaction('UPDATE message SET root_id = ? where id = ?', [res[0].root_id, message.id], true);
        }
        return message;
    },

    queryTransaction: async function (query, queryParams, commit) {
        let result;
        try {
            result = await connection.query(query, queryParams);
        } catch (err) {
            await connection.rollback();
            throw err;
        }

        if (commit) {
            try {
                await connection.commit();
            } catch (err) {
                await connection.rollback();
                throw err;
            }
        }
        return result;
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
    getMinUnreadRootIdForUserInWave: async function (user, wave) {
        const startTime = new Date().getTime();

        const res = await connection.query('SELECT MIN(message.root_id) AS minRootId FROM message ' +
                'INNER JOIN unread ON unread.message_id = message.id ' +
                'WHERE message.wave_id = ? AND unread.user_id = ?',
        [wave.id, user.id]);

        const endTime = new Date().getTime();
        console.log('QUERY getMinUnreadRootIdForUserInWave: ' + wave.id + ' query in ' + (endTime - startTime));
        console.log('QUERY getMinUnreadRootIdForUserInWave: ' + wave.id + ' count: ' + res.length);

        if (_.first(res).minRootId === null) {
            throw new Error('minRootId null');
        } else {
            const ids = await DALMySql.getUnreadIdsForUserInWave(user, wave);
            return {
                minRootId: _.first(res).minRootId,
                unreadIds: ids
            };
        }
    },

    /**
     *
     * @param {User} user
     * @param {Wave} wave
     */
    getUnreadIdsForUserInWave: async function (user, wave) {
        const startTime = new Date().getTime();

        const results = await connection.query('SELECT message_id FROM unread WHERE wave_id = ? AND user_id = ?', [wave.id, user.id]);
        const endTime = new Date().getTime();
        console.log('QUERY getUnreadIdsForUserInWave: ' + wave.id + ' query in ' + (endTime - startTime));
        return _.pluck(results, 'message_id');
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
    getNextMinRootIdForWave: async function (wave, minRootId) {
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

        const results = await connection.query(query, queryParams);
        const endTime = new Date().getTime();
        console.log('QUERY getNextMinRootIdForWave: ' + wave.id + ' query in ' + (endTime - startTime));

        if (0 === results.length) {
            return null;
        } else {
            return _.last(results).root_id;
        }
    },

    /**
     * @param {Wave} wave
     * @param {number} minRootId
     * @param {number} maxRootId
     */
    countMessagesInRange: async function (wave, minRootId, maxRootId) {
        if (!minRootId) {
            return 0;
        }
        const startTime = new Date().getTime();
        const queryParams = [wave.id, minRootId];
        let query = 'SELECT count(id) AS count FROM message WHERE wave_id = ? AND root_id >= ?';

        if (maxRootId) {
            query += ' AND root_id < ?';
            queryParams.push(maxRootId);
        }

        const res = await connection.query(query, queryParams);
        const endTime = new Date().getTime();
        console.log('QUERY countMessagesInRange: query in ' + (endTime - startTime));
        return res[0].count;
    },

    /**
     * @param {Wave} wave
     * @param {number} minRootId
     * @param {number} maxRootId
     * @param {Array} unreadIds
     */
    getMessagesForUserInWave: async function (wave, minRootId, maxRootId, unreadIds) {
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

        const messages = await connection.query(query, queryParams);
        const endTime = new Date().getTime();
        console.log('QUERY getMessagesForUserInWave: ' + wave.id + ' query in ' + (endTime - startTime));

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

        return res;
    },

    /**
     * @param {User} user
     * @param {Message} message
     */
    readMessage: async function (user, message) {
        await connection.query('DELETE FROM unread WHERE user_id = ? AND message_id = ?', [user.id, message.id]);
    },

    /**
     * @param {User} user
     * @param {Message} message
     */
    addUnreadMessage: async function (user, message) {
        if (message.get('userId') !== user.id && message.id) {
            await connection.query('INSERT INTO unread SET ?', {user_id: user.id, wave_id: message.get('waveId'), message_id: message.id});
        }
    },

    /**
     * @param {User} user
     * @param {Wave} wave
     */
    readAllMessagesForUserInWave: async function (user, wave) {
        await connection.query('DELETE FROM unread WHERE user_id = ? AND wave_id = ?', [user.id, wave.id]);
    },

    /**
     * @param {User} user
     * @param {Wave} wave
     */
    createInviteCodeForWave: async function (user, wave) {
        const code = (Math.random() + 1).toString(36).replace(/\W/g, '');
        const data = {
            user_id: user.id,
            wave_id: wave.id,
            code: code
        };

        await connection.query('INSERT INTO invite SET ?', data);
        return code;
    },

    /**
     * @param {string} code
     */
    getWaveInvitebyCode: async function (code) {
        const res = await connection.query('SELECT wave_id as waveId, code FROM invite WHERE code = ?', [code]);
        return _.first(res);
    },

    /**
     * @param {string} code
     */
    removeWaveInviteByCode: async function (code) {
        await connection.query('DELETE FROM invite WHERE code = ?', [code]);
        return {result: {ok: 1}};
    },

    shutdown: async function () {
        await connection.end();
        console.log('mysql down');
    }
};

module.exports = DALMySql;
