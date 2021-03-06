/*global app, Backgrid, UserView */
var Wave = Backbone.Model.extend(
    /** @lends Wave.prototype */
    {
        defaults: {
            title: '',
            userIds: [],
            msgCount: 0,
            lastMsgCreatedAt: null
        },
        idAttribute: '_id',
        initialize: function () {
            Backbone.Model.prototype.initialize.apply(this, arguments);
            this.on('change', function (model, options) {
                if (options && options.save === false) {
                    return;
                }
                model.save();
            });
        },
        removeUser: function (userId) {
            if (this.get('userIds').indexOf(userId) >= 0) {
                this.set('userIds', _.without(this.get('userIds'), userId));
            }
        }
    }
);

var Waves = Backbone.PageableCollection.extend({
    url: '/admin/api/wave',

    state: {
        pageSize: 10
    },

    model: Wave
});

app.waves = new Waves();

app.waveGrid = new Backgrid.Grid({
    columns: [{
        name: 'title',
        cell: Backgrid.Cell.extend({
            render: function () {
                this.$el.empty();
                var id = this.model.get('_id'),
                    title = this.model.get('title'),
                    formattedValue = $('<a href="/admin#messages/' + id + '">' + this.formatter.fromRaw(title) + '</a>');
                this.$el.append(formattedValue);
                this.delegateEvents();
                return this;
            }
        }),
        sortable: true,
        editable: true
    }, {
        name: 'users',
        cell: Backgrid.Cell.extend({
            render: function () {
                this.$el.empty();
                var ids = this.model.get('userIds');

                ids.forEach(function (id) {
                    var user = app.users.getUser(id),
                        view = new UserView({model: user});

                    view.setWave(this.model);
                    this.$el.append(view.render().el);
                }, this);
                this.delegateEvents();
                return this;
            }
        }),
        editable: false,
        sortable: false
    }, {
        name: 'msgCount',
        label: 'Message count',
        cell: 'integer',
        sortable: false,
        editable: false
    }, {
        name: 'lastMsgCreatedAt',
        label: 'Last message',
        cell: 'datetime',
        sortable: false,
        editable: false
    }],

    collection: app.waves
});