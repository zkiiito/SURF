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