var base = require('./Base'),
    Model = require('../MongooseModels').WaveModel,
    MessageModel = require('../MongooseModels').MessageModel,
    _ = require('underscore'),
    async = require('async');

var WaveController = _.extend(base(Model), {
    index: function (req, res) {
        WaveController.queryAll(req, res, function (count, data) {
            async.map(data, function (wave, callback) {
                MessageModel.find({waveId: wave._id}).count(function (err, count) {
                    if (err) {
                        callback(err, null);
                    }

                    var wave2 = wave.toJSON();//mongoose model to simple object
                    wave2.msgCount = count;
                    wave2.lastMsgCreatedAt = null;

                    if (count > 0) {
                        MessageModel.find({waveId: wave._id}).sort({'_id': -1}).limit(1).findOne(function (err, lastMsg) {
                            if (err) {
                                callback(err, null);
                            }

                            wave2.lastMsgCreatedAt = lastMsg ? lastMsg.created_at : null;
                            callback(null, wave2);
                        });
                    } else {
                        callback(null, wave2);
                    }
                });
            }, function (err, dataWithCount) {
                if (err) {
                    res.status(500).json(err);
                }

                res.json([
                    {total_entries: count},
                    dataWithCount
                ]);
            });
        });
    },

    update: function (req, res) {
        var wave = require('../SurfServer').waves.get(req.params.id);
        if (wave) {
            delete req.body._id;
            wave.update(req.body, true);
            return res.json(true);
        }
    }
});

module.exports = WaveController;