const _ = require('underscore'),
    mongoose = require('mongoose'),
    redis = require('./RedisClient'),
    Config = require('./Config'),
    GraphiteClient = require('./GraphiteClient'),
    UserModel = require('./MongooseModels').UserModel,
    WaveModel = require('./MongooseModels').WaveModel,
    MessageModel = require('./MongooseModels').MessageModel,
    WaveInviteModel = require('./MongooseModels').WaveInviteModel;

/** @namespace */
const DAL = {
    /**
     * @param {SurfServer} server
     */
    init: async function (server) {
        mongoose.Promise = global.Promise;
        mongoose.set('debug', Config.mongoDebug);
        await mongoose.connect(Config.mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

        const users = await UserModel.find().exec();

        const usersTmp = users.map((user) => {
            return {
                name: user.name,
                avatar: user.avatar,
                _id: user._id,
                email: user.email,
                googleId: user.googleId,
                googleAvatar: user.googleAvatar,
                facebookId: user.facebookId,
                facebookAvatar: user.facebookAvatar
            };
        });
        server.users.reset(usersTmp);

        const waves = await WaveModel.find().sort('_id').exec();
        server.waves.reset(waves.map(wave => {
            return {title: wave.title, userIds: wave.userIds, _id: wave._id};
        }));
        server.startServer();

        //temporary fix: delete all unread, if user has more than 1000
        users.forEach(user => {
            redis.keys('unread-' + user._id + '-*', function (err, unreadKeys) {
                if (!err) {
                    unreadKeys.forEach((key) => {
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
    },

    /**
     * @param {User} user
     * @return {Promise}
     */
    saveUser: function (user) {
        const data = {
            name: user.get('name'),
            avatar: user.get('avatar'),
            googleId: user.get('googleId'),
            googleAvatar: user.get('googleAvatar'),
            facebookId: user.get('facebookId'),
            facebookAvatar: user.get('facebookAvatar'),
            email: user.get('email')
        };

        if (user.isNew()) {
            const m = new UserModel(data);
            user.set({_id: m._id});
            return m.save();
        } else {
            return UserModel.updateOne({_id: user.id}, data).exec();
        }
    },

    /**
     * @param {Wave} wave
     */
    saveWave: function (wave) {
        const data = {
            title: wave.get('title'),
            userIds: _.uniq(wave.get('userIds'))
        };

        if (wave.isNew()) {
            const m = new WaveModel(data);
            wave.set({_id: m._id});
            return m.save();
        } else {
            return WaveModel.updateOne({_id: wave.id}, data).exec();
        }
    },

    /**
     * @param {Message} message
     */
    saveMessage: async function (message) {
        const m = new MessageModel({
            userId: message.get('userId'),
            waveId: message.get('waveId'),
            parentId: message.get('parentId'),
            message: message.get('message'),
            created_at: message.get('created_at')
        });

        if (null === m.parentId) {
            m.rootId = m._id;
            await m.save();
        } else {
            await m.save();
            await DAL.calcRootId(m.parentId, [m]);
        }

        // todo RETURN
        message.set({_id: m._id});
    },

    /**
     * rekurzivan, elvileg csak az elejen vannak olyan esetek, hogy nincs root id-je
     * @param {string} messageId
     * @param {any[]} messages
     */
    calcRootId: async function (messageId, messages) {
        const message = await MessageModel.findById(messageId);

        //if knows root element, or IS a root element
        if (null !== message.rootId || null === message.parentId) {
            let rootId = null;

            if (null !== message.rootId) {
                rootId = message.rootId;
            } else if (null === message.parentId) {
                rootId = message._id;
                messages.push(message);
            }

            await MessageModel.updateMany({_id: { $in: messages.map(msg => msg._id)}}, {rootId: rootId}).exec();

            return rootId;
        } else {
            messages.push(message);
            return await DAL.calcRootId(message.parentId, messages);
        }
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
            const results = await DAL.getLastMessagesForUserInWave(user, wave);
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
        const { minRootId, unreadIds } = await DAL.getMinUnreadRootIdForUserInWave(user, wave);

        const newMinRootId = await DAL.getMinRootIdForWave(wave, minRootId, null);
        return DAL.getMessagesForUserInWave(wave, newMinRootId, null, unreadIds);
    },

    /**
     *
     * @param {User} user
     * @param {Wave} wave
     */
    getMinUnreadRootIdForUserInWave: async function (user, wave) {
        const defaultResult = {
            minRootId: null,
            unreadIds: [],
        };

        try {
            const unreadIds = await DAL.getUnreadIdsForUserInWave(user, wave);
            if (0 === unreadIds.length) {
                return defaultResult;
            }
            console.log('QUERY getMinUnreadRootIdForUserInWave: ' + wave.id + ' count: ' + unreadIds.length);

            const startTime = new Date().getTime();

            const message = await MessageModel.findOne({waveId: wave.id})
                .where('_id').in(unreadIds)
                .select('rootId')
                .sort('rootId')
                .limit(1)
                .exec();

            const endTime = new Date().getTime();
            console.log('QUERY getMinUnreadRootIdForUserInWave: ' + wave.id + ' query in ' + (endTime - startTime));

            if (!message) {
                return defaultResult;
            }

            return {
                minRootId: message.rootId,
                unreadIds: unreadIds
            };
        } catch (err) {
            return defaultResult;
        }
    },

    /**
     *
     * @param {User} user
     * @param {Wave} wave
     */
    getUnreadIdsForUserInWave: function (user, wave) {
        return new Promise((resolve) => {
            const startTime = new Date().getTime();
            const key = 'unread-' + user.id + '-' + wave.id;
            redis.smembers(key, function (err, results) {
                const endTime = new Date().getTime();
                console.log('QUERY getUnreadIdsForUserInWave: ' + wave.id + ' query in ' + (endTime - startTime));
                resolve(results);
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

        const count = await DAL.countMessagesInRange(wave, minRootId, maxRootId);
        if (count > 10) {
            return minRootId;
        } else {
            try {
                const newMinRootId = await DAL.getNextMinRootIdForWave(wave, minRootId);
                if (!newMinRootId || minRootId === newMinRootId) {
                    return minRootId;
                } else {
                    return DAL.getMinRootIdForWave(wave, newMinRootId, maxRootId);
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
        const query = MessageModel.find({waveId: wave.id, parentId: null}).sort('-_id').limit(11);

        if (minRootId) {
            //if parentId is null, rootId = _id, we have index on _id
            query.where('_id').lt(minRootId);
        }

        const results = await query.exec();
        const endTime = new Date().getTime();

        console.log('QUERY getNextMinRootIdForWave: ' + wave.id + ' query in ' + (endTime - startTime));
        if (0 === results.length) {
            return null;
        } else {
            return _.last(results).rootId;
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
        } else {
            const startTime = new Date().getTime();
            const query = MessageModel.find({waveId: wave.id});

            query.where('rootId').gte(minRootId);

            if (maxRootId) {
                query.where('rootId').lt(maxRootId);
            }

            try {
                const count = await query.countDocuments();
                const endTime = new Date().getTime();
                console.log('QUERY countMessagesInRange: query in ' + (endTime - startTime));
                return count;
            } catch (err) {
                return 0;
            }
        }
    },

    /**
     * @param {Wave} wave
     * @param {number} minRootId
     * @param {number} maxRootId
     * @param {Array} unreadIds
     */
    getMessagesForUserInWave: async function (wave, minRootId, maxRootId, unreadIds) {
        const startTime = new Date().getTime();
        const query = MessageModel.find({waveId: wave.id})
            .sort('_id');

        if (minRootId) {
            query.where('rootId').gte(minRootId);
        }

        if (maxRootId) {
            query.where('rootId').lt(maxRootId);
        }

        const messages = await query.exec();
        const endTime = new Date().getTime();
        console.log('QUERY getMessagesForUserInWave: ' + wave.id + ' query in ' + (endTime - startTime));

        return messages.map((mmsg) => {
            const msg = {
                _id: mmsg.id,
                userId: mmsg.userId,
                waveId: mmsg.waveId,
                parentId: mmsg.parentId,
                message: mmsg.message,
                //unread: _.indexOf(unreadIds, mmsg.id) >= 0,
                created_at: mmsg.created_at
            };


            if ('string' === typeof unreadIds) {
                msg.unread = unreadIds === mmsg.id.toString();
            } else {
                msg.unread = unreadIds.includes(mmsg.id);
            }
            return msg;
        });
    },

    /**
     * @param {User} user
     * @param {Message} message
     */
    readMessage: function (user, message) {
        const key = 'unread-' + user.id + '-' + message.waveId;
        redis.srem(key, message.id);
    },

    /**
     * @param {User} user
     * @param {Message} message
     */
    addUnreadMessage: function (user, message) {
        if (message.get('userId') !== user.id.toString() && message.id) {
            //console.log('addUnreadMessage: userid: ' + typeof user.id + ' msguserid: ' + typeof message.get('userId') + ' msgid: ' + message.id);
            const key = 'unread-' + user.id + '-' + message.get('waveId');
            redis.sadd(key, message.id.toString());
        }
    },

    /**
     * @param {User} user
     * @param {Wave} wave
     */
    readAllMessagesForUserInWave: function (user, wave) {
        const key = 'unread-' + user.id + '-' + wave.id;
        redis.del(key);
    },

    /**
     * @param {User} user
     * @param {Wave} wave
     */
    createInviteCodeForWave: async function (user, wave) {
        const code = (Math.random() + 1).toString(36).replace(/\W/g, '');
        const data = {
            userId: user.id,
            waveId: wave.id,
            code: code,
            created_at: Date.now()
        };

        const m = new WaveInviteModel(data);
        await m.save();
        return code;
    },

    /**
     * @param {string} code
     */
    getWaveInvitebyCode: function (code) {
        return WaveInviteModel.findOne({code: code}).exec();
    },

    /**
     * @param {string} code
     */
    removeWaveInviteByCode: function (code) {
        return WaveInviteModel.deleteOne({code: code}).exec();
    },

    shutdown: function () {
        return new Promise((resolve) => {
            mongoose.connection.close(function () {
                console.log('mongoose down');
                redis.quit(function () {
                    console.log('redis down');
                    resolve();
                });
            });
        });
    }
};

module.exports = DAL;
