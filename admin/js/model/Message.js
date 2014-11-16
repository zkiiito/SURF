var Message = Backbone.Model.extend(
    /** @lends Message.prototype */
    {
        defaults: {
            userId: null,
            waveId: null,
            rootId: null,
            parentId: null,
            message: '',
            created_at: null
        },
        idAttribute: '_id',
        /** @constructs */
        initialize: function () {
            Backbone.Model.prototype.initialize.apply(this, arguments);
            this.on("change", function (model, options) {
                if (options && options.save === false) {
                    return;
                }
                model.save();
            });
        },

        isRoot: function () {
            return this.get('parentId') === null;
        },

        getParent: function (collection) {
            return collection.get(this.get('parentId'));
        },

        getDepth: function (collection) {
            if (this.depth === undefined) {
                this.depth = this.isRoot() ? 0 : 1 + this.getParent(collection).getDepth(collection);
            }
            return this.depth;
        },

        getPath: function (collection) {
            if (this.path === undefined) {
                if (this.isRoot()) {
                    this.path = [this.get('_id')];
                } else {
                    this.path = this.getParent(collection).getPath(collection);//ezt itt letarolni! de ures arrayyal hivni!
                    this.path.push(this.get('_id'));
                }
            }
            return this.path.slice(); //just a copy of a copy of a
        }
    }
);

var Messages = Backbone.PageableCollection.extend({
    url: "/api/message/",

    // Initial pagination states
    state: {
        pageSize: 100
    },

    model: Message,

    comparator: function(msgA, msgB) {
        /*
         ha a parentidjuk azonos: tehat 1 szinten vannak, akkor a datumuk alapjan.

         ha nem ugyanaz: akkor lekerjuk a pathot, es a rovidebb path utolso allomasa szerint. tehat:

         1-2-3-6-7
         1-2-3-4-9-12

         itt a 3-as ideje szerint.

         1-2-3
         1-2
         itt a rovidebb path nyer, mivel a hosszabbnal van elteres

         return -1 if the first model should come before the second, 1 if the first model should come after.
         */

        if (msgA.get('parentId') === msgB.get('parentId')) {
            return msgA.get('created_at') < msgB.get('created_at') ? -1 : 1;
        }
        var pathA = msgA.getPath(this),
            pathB = msgB.getPath(this),
            i = 0;

        while (pathA[i] === pathB[i]) {
            i++;
        }

        if (pathA[i] === undefined) {
            return -1;
        }

        if (pathB[i] === undefined) {
            return 1;
        }

        return this.get(pathA[i]).get('created_at') < this.get(pathB[i]).get('created_at') ? -1 : 1;
    }
});

var messages = new Messages();

var messageGrid = new Backgrid.Grid({
    columns: [{
        name: "user",
        cell: Backgrid.Cell.extend({
            render: function () {
                this.$el.empty();
                var user = users.getUser(this.model.get('userId'));
                var view = new UserView({model: user});
                this.$el.append(view.render().el);
                this.delegateEvents();
                return this;
            }
        }),
        editable: false,
        sortable: false
    }, {
        name: "message",
        cell: Backgrid.Cell.extend({
            render: function () {
                this.$el.empty();
                var depth = this.model.getDepth(messageGrid.collection);
                var rawValue = this.model.get('message');
                var formattedValue = this.formatter.fromRaw(rawValue);

                this.$el.append($('<div>').css('margin-left', depth * 20 + 'px').text(formattedValue));
                this.delegateEvents();
                return this;
            }
        }),
        editable: true,
        sortable:false
    }, {
        name: "created_at",
        cell: "datetime",
        editable: false,
        sortable: false
    }],
    collection: messages
});