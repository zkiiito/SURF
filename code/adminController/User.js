var base = require('./Base'),
    Model = require('../MongooseModels').UserModel,
    redisClient = require('../RedisClient'),
    _ = require('underscore');

module.exports = _.extend(base(Model), {
    update: function (req, res) {
        const user = require('../SurfServer').users.get(req.params.id);
        if (user) {
            delete req.body._id;
            user.update(req.body);
            return res.json(true);
        }
    },

    getUnreadCountByWave: async function (req, res) {
        const key = 'unread-' + req.params.userId + '-' + req.params.waveId;
        try {
            const result = await redisClient.sCard(key);
            return res.json(result);
        } catch (err) {
            return res.json('[error]');
        }
    },

    deleteUnreadCountByWave: function (req, res) {
        const wave = require('../SurfServer').waves.get(req.params.waveId);
        const user = require('../SurfServer').users.get(req.params.userId);

        if (wave && user) {
            wave.readAllMessagesOfUser(user);
        }
        return res.json(1);
    }

});
