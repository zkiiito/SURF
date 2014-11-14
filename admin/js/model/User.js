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

    // Initial pagination states
    state: {
        pageSize: 10
        /*sortKey: "updated",
         order: 1*/
    },

    // You can remap the query parameters from `state` keys from
    // the default to those your server supports
    queryParams: {
        totalPages: null,
        totalRecords: null,
        sortKey: "sort"
        /*q: "state:closed repo:jashkenas/backbone"*/
    },

    parseState: function (resp, queryParams, state, options) {
        return {totalRecords: resp.total_count};
    },
    parseRecords: function (resp, options) {
        return resp.items;
    },
    model: User
});

var users = new Users();

var grid = new Backgrid.Grid({
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

var paginator = new Backgrid.Extension.Paginator({
    collection: users
});

$("#grid").append(grid.render().$el);
$("#paginator").append(paginator.render().$el);

users.fetch({reset: true});