const base = require('./Base'),
    Model = require('../MongooseModels').WaveModel,
    MessageModel = require('../MongooseModels').MessageModel,
    _ = require('underscore');

const WaveController = _.extend(base(Model), {
    index: async function (req, res) {
        const { count, data } = await WaveController.queryAll(req, res);
        const dataWithCount = await Promise.all(data.map(async (wave) => {
            const count = await MessageModel.find({waveId: wave._id}).count();
            const waveWithCount = wave.toJSON();
            waveWithCount.msgCount = count;
            waveWithCount.lastMsgCreatedAt = null;

            if (count > 0) {
                const lastMsg = await MessageModel.find({waveId: wave._id}).sort({'_id': -1}).limit(1).findOne();
                waveWithCount.lastMsgCreatedAt = lastMsg ? lastMsg.created_at : null;
            }

            return waveWithCount;
        }));

        res.json([
            {total_entries: count},
            dataWithCount
        ]);
    },

    update: function (req, res) {
        const wave = require('../SurfServer').waves.get(req.params.id);
        if (wave) {
            delete req.body._id;
            wave.update(req.body, true);
            return res.json(true);
        }
    }
});

module.exports = WaveController;
