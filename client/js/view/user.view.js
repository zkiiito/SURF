var UserView = Backbone.View.extend({
    initialize: function(){
        _.bindAll(this, 'render', 'update');
        this.model.bind('change', this.update);
    },

    render: function() {
        var template = _.template($('#user_view').text(), this.model.toJSON());
        this.setElement(template);
        return this;
    },

    update: function() {
        this.$el.removeClass('online offline').addClass(this.model.get('status'));
        this.$el.attr('title', this.model.get('name'));
        this.$el.attr('alt', this.model.get('name'));

        if (this.$el.attr('src') !== this.model.get('avatar')) {
            this.$el.attr('src', this.model.get('avatar'));
        }

        return this;
    }
});