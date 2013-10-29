var MessageView = Backbone.View.extend({
    initialize: function() {
        this.hasReplyForm = false;
        _.bindAll(this, 'addMessage', 'readMessage', 'replyMessage', 'onReadMessage', 'scrollTo', 'changeUserName');
        this.model.messages.bind('add', this.addMessage);//ezt nem itt kene, hanem amikor letrejon ott a messages
        this.model.bind('change:unread', this.onReadMessage);
        this.model.bind('change:scrolled', this.scrollTo);
        this.model.user.bind('change:name', this.changeUserName);
        
        var date = new Date(this.model.get('created_at'));        
        this.model.set('dateFormatted', date.format('mmm d HH:MM'));
    },
    events: {
        'click': 'readMessage',
        'click a.reply' : 'replyMessage',
        'click a.threadend' : 'replyMessage'
    },
    render: function() {
        var context = _.extend(this.model.toJSON(), {id: this.model.id, user: this.model.user.toJSON()}),
            template = ich.message_view(context);
        
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
        if (this.model.messages.length === 1) {
            if (this.$el.children('div.replyform').size() === 0) {
                //ha nincs kint a replyform
                this.$el.children('div.threadend').show();
            }
        }
    },

    readMessage: function(e) {
        e.stopPropagation();
        this.model.read();
        this.model.setCurrent();
    },
    
    onReadMessage: function() {
        if (!this.model.get('unread')) {
            this.$el.children('table').removeClass('unread');
        }
    },
    
    scrollTo: function() {
        //console.log('scroll');
        var scrollTop = this.$el.position().top,
            wavesContainer = this.$el.parents('.waves-container');
            //wavesContainer = $('.wave').filter(':visible').find('.waves-container');
        
        this.$el.triggerHandler('click');
                
        if (scrollTop < 0 || scrollTop > wavesContainer.height()) {
            wavesContainer.scrollTop(this.$el.position().top + wavesContainer.scrollTop() - wavesContainer.height() * 0.3);
        }
        
        this.$el.children('table').focus();
    },
    
    replyMessage: function(e) {
        e.preventDefault();
        var timeout = 75;
        
        if (this.$el.find('> div:last-child').hasClass('replyform')) {
            return false;
        }
        
        $('.message .replyform').find('form').unbind();
        $('.message .replyform:visible').each(function(id, el) {
            el = $(el);
            if (el.siblings('.replies').children().size() > 0) {
                el.siblings('.threadend').delay(timeout).slideDown(timeout);
            }
            el.slideUp(timeout, function(){el.remove();});
        });

        var context = _.extend(this.model.toJSON(), {id: this.model.id, user: this.model.user.toJSON()}),
            form = ich.replyform_view(context);

        form.hide().appendTo(this.$el).slideDown(timeout);
        this.$el.children('div.threadend').slideUp(timeout);//ha latszik-ha nem.
        
        this.$el.find('form').submit(function(){
            var textarea = $(this).find('textarea');
            if (textarea.val().length > 0) {
                Communicator.sendMessage(textarea.val(), $('[name=wave_id]', $(this)).val(), $('[name=parent_id]', $(this)).val());
            }
            textarea.val('');
            return false;
        });

        this.$el.find('textarea').keydown(function(e){
            if (!e.shiftKey && 13 === e.keyCode) {
                e.preventDefault();
                $(this).parents('form').submit();
            }
            else if (32 === e.keyCode && ' ' === $(this).val()) {
                e.preventDefault();
                that.scrollToNextUnread();
            }            
            e.stopPropagation();
        }).focus();
        
        this.$el.find('a.cancel').click(function(e){
            e.preventDefault();
            var parent = $(this).parents('.notification');//nem lehet tobb notificationon belul
            parent.find('form').unbind();
            if (parent.siblings('.replies').children().size() > 0) {
                parent.siblings('.threadend').delay(timeout).slideDown(timeout);
            }
            parent.slideUp(timeout, function(){parent.remove();});
            return false;
        });
        
       return false;
    },
    
    changeUserName: function() {
        this.$el.find('span.author').eq(0).text(this.model.user.get('name') + ':');
    }
});