var base = require('./Base'),
    Model = require('../MongooseModels').UserModel,
    redisClient = require('../RedisClient'),
    _ = require('underscore');

module.exports = _.extend(base(Model), {
    update: function (req, res) {
        var user = require('../SurfServer').users.get(req.params.id);
        if (user) {
            delete req.body._id;
            user.update(req.body);
            return res.json(true);
        }
    },

    getUnreadCountByWave: function (req, res) {
        var key = 'unread-' + req.params.userId + '-' + req.params.waveId;
        redisClient.scard(key, function (err, result) {
            if (err) {
                return res.json('[error]');
            }
            return res.json(result);
        });
    },

    deleteUnreadCountByWave: function (req, res) {
        var wave = require('../SurfServer').waves.get(req.params.waveId),
            user = require('../SurfServer').users.get(req.params.userId);

        if (wave && user) {
            wave.readAllMessagesOfUser(user);
        }
        return res.json(1);
    }

});
