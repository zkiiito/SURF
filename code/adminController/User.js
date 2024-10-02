import base from './Base.js';
import { UserModel as Model } from '../MongooseModels.js';
import redisClient from '../RedisClient.js';
import _ from 'underscore';
import SurfServer from '../SurfServer.js';

export default _.extend(base(Model), {
    update: function (req, res) {
        const user = SurfServer.users.get(req.params.id);
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
        const wave = SurfServer.waves.get(req.params.waveId);
        const user = SurfServer.users.get(req.params.userId);

        if (wave && user) {
            wave.readAllMessagesOfUser(user);
        }
        return res.json(1);
    }

});
