module.exports = function (Model) {
    var that = {
        index: function (req, res) {
            that.queryAll(req, res, function (count, data) {
                res.json([
                    {total_entries: count},
                    data
                ]);
            });
        },
        queryAll: function (req, res, callback) {
            var page = that.parsePage(req),
                limit = that.parseLimit(req),
                sort = that.parseSort(req),
                query;

            query = Model.find({}).skip((page - 1) * limit).limit(limit);

            if (sort) {
                query.sort(sort);
            }

            query.exec(function (err, data) {
                if (!err) {
                    Model.count(function (err, count) {
                        if (err) {
                            res.status(500).json({error: err});
                        } else {
                            callback(count, data);
                        }
                    });
                }
            });
        },
        getById: function (req, res) {
            Model.findOne({_id: req.params.id}, function (err, entry) {
                if (err) {
                    res.json({error: err});
                } else {
                    res.json(entry);
                }
            });
        },
        /*
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
        }, /*
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
         }*/
        parsePage: function (req) {
            return Math.max(parseInt(req.query.page, 10), 1) || 1;
        },
        parseLimit: function (req) {
            return Math.max(parseInt(req.query.per_page, 10), 1) || 20;
        },
        parseSort: function (req) {
            var field = req.query.sort_by,
                sortOrder = that.parseSortOrder(req),
                sortObj = {};

            if (field) {
                sortObj[field.toString()] = sortOrder;
                return sortObj;
            }
            return null;
        },
        parseSortOrder: function (req) {
            var order = req.query.order;
            return 'asc' === order ? 1 : -1;
        }
    };

    return that;
};
