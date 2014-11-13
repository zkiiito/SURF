var Model = require('../MongooseModels').UserModel,
    _ = require('underscore');

module.exports = {
    index: function (req, res) {
        var page = Math.max(parseInt(req.param('page'), 10), 1) || 1,
            limit = Math.max(parseInt(req.param('per_page'), 10), 1) || 20;

        Model.find({}).skip((page - 1) * limit).limit(limit).exec(function (err, data) {
            if (!err) {
                Model.count(function (err, count) {
                    if (err) {
                        res.status(500).json({error: err});
                    } else {
                        res.json({
                            total_count: count,
                            items: data
                        });
                    }
                });
            }
        });
    },
    /*
    getById: function (req, res) {
        Model.find({_id: req.params.id}, function (err, contact) {
            if (err) {
                res.json({error: 'Contact not found.'});
            } else {
                res.json(contact);
            }
        });
    },
    add: function (req, res) {
        var newContact = new Model(req.body);
        newContact.save(function (err, contact) {
            if (err) {
                res.json({error: 'Error adding contact.'});
            } else {
                res.json(contact);
            }
        });
    },
    */
    update: function (req, res) {
        delete req.body._id;
        Model.update({_id: req.params.id}, req.body, function (err, updated) {
            if (err) {
                res.status(500).json({error: err});
            } else {
                res.json(updated);
            }
        });
    },
    delete: function (req, res) {
        Model.findOne({_id: req.params.id}, function (err, contact) {
            if (err) {
                res.json({error: 'Contact not found.'});
            } else {
                contact.remove(function (err, contact) {
                    res.json(200, {status: 'Success'});
                });
            }
        });
    }
};
