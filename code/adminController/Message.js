var base = require('./Base'),
    Model = require('../MongooseModels').MessageModel,
    _ = require('underscore');

var MessageController = _.extend(base(Model), {
    index: function (req, res) {
        var page = MessageController.parsePage(req),
            limit = MessageController.parseLimit(req);

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

module.exports = MessageController;