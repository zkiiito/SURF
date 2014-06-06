var UserView = Backbone.View.extend({
    initialize: function () {
        _.bindAll(this, 'render', 'update', 'chatInPrivate');
        this.model.bind('change', this.update);
    },

    events: {
        'dblclick': 'chatInPrivate'
    },

    render: function () {
        var template = _.template($('#user_view').text(), this.model.toJSON());
        this.setElement(template);
        this.$el.attr('src', this.model.get('avatar'));//kesobb kell beallitani, mert kulonben nem talalja az {{}} avatar imaget
        return this;
    },

    update: function () {
        this.$el.removeClass('online offline').addClass(this.model.get('status'));
        this.$el.attr('title', this.model.get('name'));
        this.$el.attr('alt', this.model.get('name'));

        if (this.$el.attr('src') !== this.model.get('avatar')) {
            this.$el.attr('src', this.model.get('avatar'));
        }

        return this;
    },

    chatInPrivate: function () {
        app.model.currentUser.chatInPrivateWaveWithUser(this.model);
    }
});