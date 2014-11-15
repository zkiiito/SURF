var Message = Backbone.Model.extend(
    /** @lends Message.prototype */
    {
        defaults: {
            userId: null,
            waveId: null,
            parentId: null,
            message: '',
            created_at: null
        },
        idAttribute: '_id',
        /** @constructs */
        initialize: function () {
            Backbone.Model.prototype.initialize.apply(this, arguments);
            this.on("change", function (model, options) {
                if (options && options.save === false) return;
                model.save();
            });
        }
    }
);

var Messages = Backbone.PageableCollection.extend({
    url: "/api/message/" + waveId,

    // Initial pagination states
    state: {
        pageSize: 10
    },

    model: Message
});

var messages = new Messages();

var grid = new Backgrid.Grid({
    columns: [{
        name: "_id",
        cell: "string",
        editable: false,
        sortable: false
    }, {
        name: "userId",
        cell: "string",
        editable: false,
        sortable: false
    }, {
        name: "parentId",
        cell: "string",
        editable: false,
        sortable: false
    }, {
        name: "message",
        cell: "string",
        editable: true,
        sortable: false
    }, {
        name: "created_at",
        cell: "datetime",
        editable: false,
        sortable: false
    }],
    collection: messages
});

var paginator = new Backgrid.Extension.Paginator({
    collection: messages
});

$("#grid").append(grid.render().$el);
$("#paginator").append(paginator.render().$el);

messages.fetch({reset: true});