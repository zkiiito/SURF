/*global app, Backgrid */
var User = Backbone.Model.extend(
    /** @lends User.prototype */
    {
        defaults: {
            name: '',
            avatar: '',
            email: ''
        },
        idAttribute: '_id',
        initialize: function () {
            Backbone.Model.prototype.initialize.apply(this, arguments);
            this.on('change', function (model, options) {
                if (options && options.save === false) {
                    return;
                }
                model.save();
            }, this);
        },

        getUnreadCountByWaveId: function (waveId) {
            var that = this,
                key = 'unread-' + waveId;
            if (undefined !== this[key]) {
                return this[key];
            }

            $.getJSON('/admin/api/unread/' + this.id + '/' + waveId, function (data) {
                that[key] = data;
                that.trigger('changeUnread');
            });

            this[key] = '*';
            return this[key];
        },

        deleteUnreadCountByWaveId: function (waveId) {
            var that = this,
                key = 'unread-' + waveId;

            if (this[key] > 0) {
                $.ajax('/admin/api/unread/' + this.id + '/' + waveId, {
                    type: 'DELETE',
                    success: function () {
                        that[key] = 0;
                        that.trigger('changeUnread');
                    }
                });
            }
        }
    }
);

var Users = Backbone.PageableCollection.extend({
    url: '/admin/api/user',

    state: {
        pageSize: 10
    },

    model: User,

    getUser: function (id) {
        var user = this.get(id);

        if (undefined === user) {
            user = new User({_id: id, name: '[loading]'});
            this.add(user);

            user.fetch({save: false});
        }

        return user;
    }
});

app.users = new Users();

app.userGrid = new Backgrid.Grid({
    columns: [{
        name: 'avatar',
        cell: Backgrid.Cell.extend({
            render: function () {
                this.$el.empty();
                var rawValue = this.model.get('avatar'),
                    formattedValue = $('<img src="' + rawValue + '" width="50">');
                this.$el.append(formattedValue);
                this.delegateEvents();
                return this;
            }
        }),
        sortable: false
    }, {
        name: 'name',
        cell: 'string'
    }, {
        name: 'email',
        cell: 'email'
    }, {
        name: '_id',
        cell: 'string',
        editable: false
    }],
    collection: app.users
});
