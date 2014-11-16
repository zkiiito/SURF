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
                if (options && options.save === false) {
                    return;
                }
                model.save();
            });
        }
    }
);

var Users = Backbone.PageableCollection.extend({
    url: "/api/user",

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

var users = new Users();

var userGrid = new Backgrid.Grid({
    columns: [{
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
    }, {
        name: "name",
        cell: "string"
    }, {
        name: "email",
        cell: "email"
    }, {
        name: "_id",
        cell: "string",
        editable: false
    }],
    collection: users
});

var UserView = Backbone.View.extend({
    initialize: function () {
        _.bindAll(this, 'render');
        this.listenTo(this.model, 'change', this.render);
    },

    render: function () {
        this.$el.empty();
        this.$el.append($('<img src="' + this.model.get("avatar") + '" width="20">'));
        this.$el.append($('<span>').text(this.model.get('name')));

        return this;
    }
});
