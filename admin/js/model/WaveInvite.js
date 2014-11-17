/*global app, Backgrid, UserView */
var WaveInvite = Backbone.Model.extend(
    /** @lends WaveInvite.prototype */
    {
        defaults: {
            userId: '',
            waveId: '',
            created_at: '',
            code: ''
        },
        idAttribute: '_id',
        initialize: function () {
            Backbone.Model.prototype.initialize.apply(this, arguments);
            this.on("change", function (model, options) {
                if (options && options.save === false) {
                    return;
                }
                model.save();
            });
        }
    }
);

var WaveInvites = Backbone.PageableCollection.extend({
    url: "/api/waveinvite",

    state: {
        pageSize: 10
    },

    model: WaveInvite
});

app.waveInvites = new WaveInvites();

app.waveInviteGrid = new Backgrid.Grid({
    columns: [{
        name: "user",
        cell: Backgrid.Cell.extend({
            render: function () {
                this.$el.empty();
                var user = app.users.getUser(this.model.get('userId')),
                    view = new UserView({model: user});
                this.$el.append(view.render().el);
                this.delegateEvents();
                return this;
            }
        }),
        editable: false,
        sortable: false
    }, {
        name: "waveId",
        cell: "string"
    }, {
        name: "code",
        cell: "string"
    }, {
        name: "created_at",
        cell: "datetime",
        editable: false
    }],
    collection: app.waveInvites
});
