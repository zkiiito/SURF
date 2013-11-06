var DisconnectedView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'show');
    },
    
    render: function() {
        var template = ich.disconnected_view();
        this.setElement(template);
        this.$el.hide();
        
        return this;
    },
        
    show: function() {
        this.$el.show();
        $('#darken').show();
        //console.log(this.model.reconnect);
        return false;
    }
});