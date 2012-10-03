var WaveView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'setCurrent', 'addMessage', 'addUser', 'removeUser', 'updateTitle', 
                        'showUpdateWave', 'scrollToNextUnread', 'scrollToBottom', 'readAllMessages',
                        'quitWave', 'removeWave');
        
        this.userViews = [];
        
        this.model.bind('change:current', this.setCurrent);
        this.model.bind('change:title', this.updateTitle);
        this.model.bind('noMoreUnread', this.scrollToBottom);
        this.model.bind('remove', this.removeWave);
        
        this.model.messages.bind('add', this.addMessage);
        this.model.users.bind('add', this.addUser);
        this.model.users.bind('remove', this.removeUser);
    },
    events: {
        'click a.editwave' : 'showUpdateWave',
        'click a.gounread' : 'scrollToNextUnread',
        'click a.getprevmessages' : 'getPreviousMessages',
        'click a.readall' : 'readAllMessages',
        'click a.quit' : 'quitWave'
    },
    
    render: function() {
        var context = _.extend(this.model.toJSON(), {
            id: this.model.id
        }),
            template = ich.wave_view(context),
            that = this;
            
        this.setElement(template);
        this.$el.hide();
        
        this.$el.find('textarea').keydown(function(e){
            if (!e.shiftKey && 13 === e.keyCode) {
                if ($(this).val().length > 0) {
                    var form = $(this).parents('form');
                    Communicator.sendMessage($('textarea', form).val(), $('[name=wave_id]', form).val(), null);
                }
                $(this).val('');
                e.preventDefault();
            }
            e.stopPropagation();
        });
        
        $('body').keydown(function(e){
            var nodeName = $(e.target).prop('nodeName');
            
            if ('INPUT' === nodeName || 'TEXTBOX' === nodeName) {
                return;
            }
            else if (app.currentWave === that.model.id && 32 === e.keyCode) {
                e.preventDefault();
                that.scrollToNextUnread();
            }
        });
        
        this.model.users.each(this.addUser);
        
        return this;
    },
    
    setCurrent: function() {
        if (this.model.get('current')) {
            $('.wave').hide();
            this.$el.show();
            this.scrollToNextUnread();
        }
    },
    
    addMessage: function(message) {
        if (null === message.get('parentId')) {
            var view = new MessageView({model: message}),
                targetPos = this.model.messages.where({parentId: null}).indexOf(message),
                viewElement = view.render().el;
            
            if (0 === targetPos) {
                this.$el.find('div.getprevmessages').after(viewElement);
            } else {
                this.$el.find('.messages > .message').eq(targetPos - 1).after(viewElement);
            }
            
            //$('.messages', this.$el).append(view.render().el);
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
    },
    
    scrollToNextUnread: function(e) {
        if (e) {
            e.preventDefault();
        }
        var nextUnread = this.model.getNextUnreadMessage();
        
        if (nextUnread) {
            nextUnread.setScrolled();
        }
    },
    
    scrollToBottom: function() {
        var wavesContainer = this.$el.find('.waves-container');
        wavesContainer.scrollTop(wavesContainer.prop('scrollHeight')).focus();
    },
    
    getPreviousMessages: function(e) {
        e.preventDefault();
        //this.$el.find('div.getprevmessages').hide();
        this.model.getPreviousMessages();
    },
    
    readAllMessages: function(e) {
        e.preventDefault();
        this.model.readAllMessages();
    },
    
    quitWave: function(e) {
        e.preventDefault();
        if (confirm('Biztosan kilépsz a következő beszélgetésből: ' + this.model.get('title') + "?\n\nHa később vissza szeretnél lépni, a beszélgetés résztvevői újra meghívhatnak.")) {
            this.model.quit();
        }
    },
    
    removeWave: function(wave) {
        if (wave.id === this.model.id) {
            this.$el.remove();
        }
    }    
});