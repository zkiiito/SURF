/*global app, Backgrid, UserView */
var Wave = Backbone.Model.extend(
    /** @lends Wave.prototype */
    {
        defaults: {
            title: '',
            userIds: [],
            current: false
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

var Waves = Backbone.PageableCollection.extend({
    url: "/api/wave",

    state: {
        pageSize: 10
    },

    model: Wave
});

app.waves = new Waves();

app.waveGrid = new Backgrid.Grid({
    columns: [{
        name: "title",
        cell: Backgrid.Cell.extend({
            render: function () {
                this.$el.empty();
                var id = this.model.get("_id"),
                    title = this.model.get("title"),
                    formattedValue = $('<a href="/admin#messages/' + id + '">' + this.formatter.fromRaw(title) + '</a>');
                this.$el.append(formattedValue);
                this.delegateEvents();
                return this;
            }
        }),
        sortable: true,
        editable: true
    }, {
        name: "users",
        cell: Backgrid.Cell.extend({
            render: function () {
                this.$el.empty();
                var ids = this.model.get("userIds");

                ids.forEach(function (id) {
                    var user = app.users.getUser(id),
                        view = new UserView({model: user});
                    this.$el.append(view.render().el);
                }, this);
                this.delegateEvents();
                return this;
            }
        }),
        editable: false,
        sortable: false
    }],

    collection: app.waves
});