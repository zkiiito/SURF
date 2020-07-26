const base = require('./Base'),
    Model = require('../MongooseModels').MessageModel,
    _ = require('underscore');

const MessageController = _.extend(base(Model), {
    index: async function (req, res) {
        const page = MessageController.parsePage(req);
        const limit = MessageController.parseLimit(req);

        try {
            const data = await Model.find({waveId: req.params.waveId}).skip((page - 1) * limit).limit(limit).exec();
            const count = await Model.find({waveId: req.params.waveId}).count();

            const rootIds = _.pluck(data, 'rootId');

            const data2 = await Model.find().where('rootId').in(rootIds).exec();

            res.json([
                {total_entries: count},
                data2
            ]);
        } catch (err) {
            res.status(500).json({error: err});
        }
    }
});

module.exports = MessageController;
