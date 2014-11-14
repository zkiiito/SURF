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
                if (options && options.save === false) return;
                model.save();
            });
        }
    });

var Waves = Backbone.PageableCollection.extend({

    url: "/api/wave",

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

    model: Wave
});

var waves = new Waves();

var grid = new Backgrid.Grid({
    columns: [{
        name: "_id",
        cell: Backgrid.Cell.extend({
            render: function () {
                this.$el.empty();
                var id = this.model.get("_id");
                var formattedValue = $('<a href="/admin/messages/' + id + '">' + id + '</a>');
                this.$el.append(formattedValue);
                this.delegateEvents();
                return this;
            }
        }),
        sortable: true,
        editable: false
    }, {
        name: "title",
        cell: "string",
        sortable: true,
        editable: true
    }, {
        name: "userIds",
        cell: "string",
        sortable: false
    }],

    collection: waves
});

var paginator = new Backgrid.Extension.Paginator({
    collection: waves
});

$("#grid").append(grid.render().$el);
$("#paginator").append(paginator.render().$el);

waves.fetch({reset: true});