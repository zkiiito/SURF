/*global UserView, MessageReplyFormView, Notification, __, dateFormat */
var MessageView = Backbone.View.extend({
    initialize: function () {
        this.hasReplyForm = false;
        _.bindAll(this, 'addMessage', 'readMessage', 'replyMessage', 'onReadMessage', 'scrollTo', 'changeUserName');
        this.model.bind('messagesCreated', function () {
            this.model.messages.bind('add', this.addMessage);
        }, this);
        this.model.bind('change:unread', this.onReadMessage);
        this.model.bind('change:scrolled', this.scrollTo);
        this.model.user.bind('change:name', this.changeUserName);

        var date = new Date(this.model.get('created_at'));
        this.model.set('dateFormatted', dateFormat(date, 'mmm d HH:MM'));
    },
    events: {
        'click': 'readMessage',
        'dblclick': 'replyMessage',
        'click a.reply' : 'replyMessage',
        'click a.threadend' : 'replyMessage'
    },
    render: function () {
        var context = _.extend(this.model.toJSON(), {id: this.model.id, user: this.model.user.toJSON()}),
            template = _.template($('#message_view').text()),
            userView = new UserView({model: this.model.user});

        this.setElement(template(context));
        if (!this.model.get('unread')) {
            this.$el.children('table').removeClass('unread');
        }

        this.$el.find('.message-header').html(userView.render().el);
        this.$el.children('div.threadend').hide();

        if (this.model.isCurrentUserMentioned()) {
            this.mention();
        }

        return this;
    },

    addMessage: function (message) {
        var view = new MessageView({
            model: message
        });

        this.$el.children('.replies').append(view.render().el);
        if (this.model.messages.length === 1) {
            if (this.$el.children('div.replyform').size() === 0) {
                //if reply form is not present
                this.$el.children('div.threadend').show();
            }
        }
    },

    readMessage: function (e) {
        e.stopPropagation();
        this.model.read();
        this.model.setCurrent();
    },

    onReadMessage: function () {
        if (!this.model.get('unread')) {
            this.$el.children('table').removeClass('unread');
        }
    },

    scrollTo: function () {
        //console.log('scroll');
        var scrollTop = this.$el.position().top,
            wavesContainer = this.$el.parents('.waves-container');

        this.$el.triggerHandler('click');

        if (scrollTop < 0 || scrollTop > wavesContainer.height()) {
            wavesContainer.scrollTop(this.$el.position().top + wavesContainer.scrollTop() - wavesContainer.height() * 0.3);
        }

        this.$el.children('table').focus();
    },

    replyMessage: function (e) {
        e.preventDefault();
        //if reply form is visible under this message, return after hiding
        var hideOnly = this.$el.find('> div:last-child').hasClass('replyform'),
            formView;

        //hide other replyforms
        this.model.getWave().trigger('hideReplyForm');

        if (hideOnly) {
            return false;
        }

        formView = new MessageReplyFormView({model: this.model});
        formView.render();

        //do not show reply form on mobile
        if ($('body').hasClass('mobile')) {
            formView.$el.find('form').submit();
        } else {
            formView.show(this.$el);
        }

        return false;
    },

    changeUserName: function () {
        this.$el.find('span.author').eq(0).text(this.model.user.get('name') + ':');
    },

    mention: function () {
        if (!(window.Notification)) {
            return;
        }

        var notification,
            that = this,
            notificationText = __('{{ participantName }} mentioned you in {{ waveName }}!')
                .replace('{{ participantName }}', this.model.user.get('name'))
                .replace('{{ waveName }}', this.model.getWave().get('title'));

        if (Notification.permission === "granted") {
            // If it's okay let's create a notification
            notification = new Notification(notificationText, {tag: 'mentionNotification', icon: '/images/surf-ico.png'});
        } else if (Notification.permission !== 'denied') {
            // Otherwise, we need to ask the user for permission
            // Note, Chrome does not implement the permission static property
            // So we have to check for NOT 'denied' instead of 'default'

            Notification.requestPermission(function (permission) {
                // If the user is okay, let's create a notification
                if (permission === "granted") {
                    notification = new Notification(notificationText, {tag: 'mentionNotification', icon: '/images/surf-ico.png'});
                }
            });
        }

        if (notification) {
            notification.onclick = function () {
                //TODO: showWave
                that.model.setScrolled();
            };

            notification.onshow = function () {
                setTimeout(notification.close.bind(notification), 5000);
            };
        }
    }
});