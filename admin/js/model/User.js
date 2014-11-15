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
            this.on("change", function (model, options) {
                if (options && options.save === false) return;
                model.save();
            });
        }
    });

var Users = Backbone.PageableCollection.extend({
    url: "/api/user",

    state: {
        pageSize: 10
    },

    model: User
});

var users = new Users();

var userGrid = new Backgrid.Grid({
    columns: [{
        name: "_id",
        cell: "string",
        editable: false
    }, {
        name: "name",
        cell: "string"
    }, {
        name: "email",
        cell: "email"
    }, {
        name: "avatar",
        cell: Backgrid.Cell.extend({
            render: function () {
                this.$el.empty();
                var rawValue = this.model.get("avatar");
                var formattedValue = $('<img src="' + rawValue + '" width="50">');
                this.$el.append(formattedValue);
                this.delegateEvents();
                return this;
            }
        }),
        sortable: false
    }],
    collection: users
});

var userPaginator = new Backgrid.Extension.Paginator({
    collection: users
});

$("#grid").append(userGrid.render().$el);
$("#paginator").append(userPaginator.render().$el);

users.fetch({reset: true});