var DisconnectedView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'show');
        this.counter = 5;
    },
    
    render: function() {
        var template = ich.disconnected_view({counter: this.counter});
        this.setElement(template);
        this.$el.hide();
        
        return this;
    },
        
    show: function() {
        if (this.model.reconnect) {
            var that = this;
            this.interval = setInterval(function() { that.count(); }, 1000);
        } else {
            this.$el.find('.countdown').hide();
        }

        this.$el.show();
        $('#darken').show();
        return false;
    },
            
    count: function() {
        this.counter--;
        if (this.counter > 0) {
            this.$el.find('.counter').text(this.counter);
        } else {
            clearInterval(this.interval);
            document.location.href = '/';
        }
    }
});