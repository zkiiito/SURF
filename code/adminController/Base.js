module.exports = function (Model) {
    const that = {
        index: async function (req, res) {
            const { count, data } = await that.queryAll(req, res);
            res.json([
                {total_entries: count},
                data
            ]);
        },
        queryAll: async function (req, res) {
            try {
                const page = that.parsePage(req);
                const limit = that.parseLimit(req);
                const sort = that.parseSort(req);

                let query = Model.find({}).skip((page - 1) * limit).limit(limit);

                if (sort) {
                    query.sort(sort);
                }

                const data = await query.exec();
                const count = await Model.countDocuments();
                return { count, data };
            } catch (err) {
                res.status(500).json({error: err});
            }
        },
        getById: async function (req, res) {
            try {
                const entry = await Model.findOne({_id: req.params.id});
                res.json(entry);
            } catch (err) {
                res.json({error: err});
            }
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
        update: async function (req, res) {
            try {
                delete req.body._id;
                const updated = await Model.update({_id: req.params.id}, req.body);
                res.json(updated);
            } catch (err) {
                res.status(500).json({error: err});
            }
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
            const field = req.query.sort_by;
            const sortOrder = that.parseSortOrder(req);
            const sortObj = {};

            if (field) {
                sortObj[field.toString()] = sortOrder;
                return sortObj;
            }
            return null;
        },
        parseSortOrder: function (req) {
            const order = req.query.order;
            return 'asc' === order ? 1 : -1;
        }
    };

    return that;
};
