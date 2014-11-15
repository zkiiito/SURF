var base = require('./Base'),
    Model = require('../MongooseModels').MessageModel,
    _ = require('underscore');

module.exports = _.extend(base(Model), {
    index: function (req, res) {
        var page = Math.max(parseInt(req.param('page'), 10), 1) || 1,
            limit = Math.max(parseInt(req.param('per_page'), 10), 1) || 20;

        Model.find({waveId: req.params.waveId}).skip((page - 1) * limit).limit(limit).exec(function (err, data) {
            if (!err) {
                Model.find({waveId: req.params.waveId}).count(function (err, count) {
                    if (err) {
                        res.status(500).json({error: err});
                    } else {
                        var rootIds = _.pluck(data, 'rootId');

                        Model.find().where('rootId').in(rootIds).exec(function (err, data) {
                            if (err) {
                                res.status(500).json({error: err});
                            }

                            res.json([
                                {total_entries: count},
                                data
                            ]);
                        });
                    }
                });
            }
        });
    }
});