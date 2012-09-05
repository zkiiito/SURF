var MessageView = Backbone.View.extend({
    initialize: function() {
        this.hasReplyForm = false;
        _.bindAll(this, 'addMessage', 'readMessage', 'replyMessage', 'onReadMessage', 'scrollTo');
        this.model.messages.bind('add', this.addMessage);//ezt nem itt kene, hanem amikor letrejon ott a messages
        this.model.bind('change:unread', this.onReadMessage);
        this.model.bind('change:scrolled', this.scrollTo)
        
        var date = new Date(this.model.get('created_at'));        
        this.model.set('dateFormatted', date.format('mmm d HH:MM'));
    },
    events: {
        'click': 'readMessage',
        'click a.reply' : 'replyMessage',
        'click a.threadend' : 'replyMessage'
    },
    render: function() {
        var context = _.extend(this.model.toJSON(), {id: this.model.id, user: this.model.user.toJSON()});        
        var template = ich.message_view(context);
        
        this.setElement(template);
        if (!this.model.get('unread')) {
            this.$el.children('table').removeClass('unread');
        }
        
        var userView = new UserView({model: this.model.user});
        this.$el.find('.message-header').html(userView.render().el);
        this.$el.children('div.threadend').hide();
        
        return this;
    },
    
    addMessage: function(message) {
        var view = new MessageView({
            model: message
        });
        
        this.$el.children('.replies').append(view.render().el);
        if (this.model.messages.length == 1) {
            if (this.$el.children('div.replyform').size() == 0)//ha nincs kint a replyform
                this.$el.children('div.threadend').show();
        }
    },

    readMessage: function(e) {
        e.stopPropagation();
        this.model.read();
        this.model.setCurrent();
    },
    
    onReadMessage: function() {
        if (!this.model.get('unread'))
            this.$el.children('table').removeClass('unread');
    },
    
    scrollTo: function() {
        //console.log('scroll');
        var scrollTop = this.$el.position().top;
        
        this.$el.triggerHandler('click');
                
        var wavesContainer = this.$el.parents('.waves-container');
        //wavesContainer = $('.wave').filter(':visible').find('.waves-container');
        if (scrollTop < 0 || scrollTop > wavesContainer.height())
            wavesContainer.scrollTop(this.$el.position().top + wavesContainer.scrollTop() - wavesContainer.height() * 0.3);
        
        this.$el.children('table').focus();
    },
    
    replyMessage: function(e) {
        e.preventDefault();
        
        $('.message .replyform').find('form').unbind();
        $('.message .replyform').remove();

        var context = _.extend(this.model.toJSON(), {id: this.model.id, user: this.model.user.toJSON()});
        var form = ich.replyform_view(context);

        this.$el.append(form);
        this.$el.children('div.threadend').hide();//ha latszik-ha nem.

        this.$el.find('textarea').keydown(function(e){
            if (!e.shiftKey && 13 == e.keyCode) {
                if ($(this).val().length > 0) {
                    var form = $(this).parents('form');
                    Communicator.sendMessage($('textarea', form).val(), $('[name=wave_id]', form).val(), $('[name=parent_id]', form).val());
                }
                $(this).val('');
                e.preventDefault();
            }
            e.stopPropagation();
        }).focus();
        
        this.$el.find('a.cancel').click(function(e){
            e.preventDefault();
            var parent = $(this).parents('.notification');//nem lehet tobb notificationon belul
            parent.find('form').unbind();
            if (parent.siblings('.replies').children().size() > 0)
                parent.siblings('.threadend').show();
            parent.remove();
            return false;
        });
        
       return false;
    }
});