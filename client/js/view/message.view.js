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
            template = _.template($('#message_view').text(), context);

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
        //if reply form is visible under this message, return after hiding
        var hideOnly = this.$el.find('> div:last-child').hasClass('replyform');

        //hide other replyforms
        this.model.getWave().trigger('hideReplyForm');

        if (hideOnly) {
            return false;
        }

        var formView = new MessageReplyFormView({model: this.model});
        formView.render();
        formView.show(this.$el);

        return false;
    },

    changeUserName: function() {
        this.$el.find('span.author').eq(0).text(this.model.user.get('name') + ':');
    }
});