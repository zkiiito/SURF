var WaveView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'setCurrent', 'addMessage', 'addUser', 'removeUser', 'updateTitle', 'showUpdateWave');
        
        this.userViews = [];
        
        this.model.bind('change:current', this.setCurrent);
        this.model.bind('change:title', this.updateTitle);
        
        this.model.messages.bind('add', this.addMessage);
        this.model.users.bind('add', this.addUser);
        this.model.users.bind('remove', this.removeUser);
    },
    events: {
        'click a.editwave' : 'showUpdateWave'
    },
    
    render: function() {
        var context = _.extend(this.model.toJSON(), {
            id: this.model.id
        });
        var template = ich.wave_view(context);
        this.setElement(template);
        this.$el.hide();
        
        this.$el.find('textarea').keydown(function(e){
            if (!e.shiftKey && 13 == e.keyCode) {
                if ($(this).val().length > 0) {
                    var form = $(this).parents('form');
                    Communicator.sendMessage($('textarea', form).val(), $('[name=wave_id]', form).val(), null);
                }
                $(this).val('');
                e.preventDefault();
            }
        });
        
        this.model.users.each(this.addUser);
        
        return this;
    },
    
    setCurrent: function() {
        if (this.model.get('current')) {
            $('.wave').hide();
            this.$el.show();
        }
    },
    
    addMessage: function(message) {
        if (null == message.get('parentId')) {
            var view = new MessageView({
                model: message
            });
            $('.messages', this.$el).append(view.render().el);
        }
    },
    
    changeUsers: function() {
        var usernames = this.model.getUserNames();
        this.$el.find('span.usernames').text(usernames);
    },
    
    addUser: function(user) {
        this.changeUsers();
        var userView = new UserView({model: user});
        this.userViews[user.id] = userView;
        
        this.$el.find('.heads').append(userView.render().el);
    },
    
    removeUser: function(user) {
        this.changeUsers();
        this.userViews[user.id].remove();
        delete this.userViews[user.id];
    },
    
    updateTitle: function() {
        this.$el.find('h2').text(this.model.get('title'));
    },
    
    showUpdateWave: function() {
        return app.view.showUpdateWave();
    }
});