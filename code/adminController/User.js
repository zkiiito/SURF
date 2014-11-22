var base = require('./Base'),
    Model = require('../MongooseModels').UserModel,
    redisClient = require('../RedisClient'),
    _ = require('underscore');

module.exports = _.extend(base(Model), {
    getUnreadCountByWave: function (req, res) {
        var key = 'unread-' + req.param('userId') + '-' + req.param('waveId');
        redisClient.scard(key, function (err, result) {
            if (err) {
                return res.json('[error]');
            }
            return res.json(result);
        });
    },

    deleteUnreadCountByWave: function (req, res) {
        var key = 'unread-' + req.param('userId') + '-' + req.param('waveId');
        redisClient.del(key);
        return res.json(1);
    }

});
