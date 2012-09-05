
var WaveListView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'setCurrent', 'countMessages', 'updateMessages', 'changeUsers', 'updateTitle');
        this.model.bind('change:current', this.setCurrent);
        this.model.bind('change:title', this.updateTitle);
        
        this.model.messages.bind('change:unread', this.countMessages);
        this.model.messages.bind('add', this.countMessages);
        this.model.messages.bind('add', this.updateMessages);
        
        this.model.users.bind('add', this.changeUsers);
        this.model.users.bind('remove', this.changeUsers);
    },
    
    render: function() {
        var context = _.extend(this.model.toJSON(), {
            id: this.model.id
        });
        var template = ich.wave_list_view(context);
        this.setElement(template);
        this.changeUsers();
        return this;
    },
    
    setCurrent: function() {
        if (this.model.get('current')) {
            $('.waveitem').removeClass('open');
            this.$el.addClass('open');
        }
    },
    
    countMessages: function() {
        var msgs = this.model.getUnreadCount();
        if (msgs > 0) {
            this.$el.find('.piros').text('| ' + msgs + ' új üzenet');
        } else {
            this.$el.find('.piros').text('');
            this.$el.removeClass('updated');
        }
    },
    
    updateMessages: function(message) {
        if (message.get('userId') != app.currentUser && message.get('unread')) {
            this.$el.addClass('updated');
        }
    },
    
    changeUsers: function() {
        var usercount = this.model.getUserCount();
        this.$el.find('.usercount').text(usercount);
    },
    
    updateTitle: function() {
        this.$el.find('h2').text(this.model.get('title'));
    }    
});