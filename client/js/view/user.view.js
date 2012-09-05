var UserView = Backbone.View.extend({
    initialize: function(){
        _.bindAll(this, 'render', 'updateStatus');
        this.model.bind('change:status', this.updateStatus);
    },    
    
    render: function() {
        var template = ich.user_view(this.model.toJSON());
        this.setElement(template);        
        return this;
    },
    
    updateStatus: function() {
        this.$el.removeClass('online offline').addClass(this.model.get('status'));
        return this;
    }
});