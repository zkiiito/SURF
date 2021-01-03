/*global UserView, MessageReplyFormView, Notification, __, dateFormat, messageTemplate, linkPreviewTemplate */
var MessageView = Backbone.View.extend({
    initialize: function () {
        if (this.model.messages) {
            this.listenTo(this.model.messages, 'add', this.addMessage);
        } else {
            this.listenTo(this.model, 'messagesCreated', function () {
                this.listenTo(this.model.messages, 'add', this.addMessage);
                this.stopListening(this.model, 'messagesCreated');
            });
        }
        this.listenTo(this.model, 'change:unread', this.onReadMessage);
        this.listenTo(this.model, 'change:scrolled', this.scrollTo);
        this.listenTo(this.model.user, 'change:name', this.changeUserName);
        this.listenTo(this.model, 'linkpreview', this.addLinkPreview);

        var date = this.model.get('created_at_date');
        this.model.set('dateFormatted', this.formatDate(date));
    },
    inRender: false,
    events: {
        'click': 'readMessage',
        'dbltap': 'replyMessage',
        'click a.reply' : 'replyMessage',
        'click a.threadend' : 'replyMessage'
    },
    render: function () {
        var context = _.extend(this.model.toJSON(), {id: this.model.id, user: this.model.user.toJSON()}),
            userView = new UserView({model: this.model.user}),
            that = this;

        this.setElement(messageTemplate(context));
        if (!this.model.get('unread')) {
            this.$el.children('table').removeClass('unread');
        }

        this.$el.find('.message-header').html(userView.render().el);
        this.$el.children('div.threadend').hide();

        if (this.model.isCurrentUserMentioned()) {
            this.mention();
        }

        if (this.model.messages) {
            this.inRender = true;
            this.model.messages.each(this.addMessage, this);
            this.inRender = false;
        }

        this.model.linkPreviews.forEach(function (linkPreviewData) {
            that.addLinkPreview(linkPreviewData);
        });

        return this;
    },

    addMessage: function (message) {
        var view = new MessageView({
            model: message
        });

        this.$el.children('.replies').append(view.render().el);
        if (this.inRender || this.model.messages.length === 1) {
            if (this.$el.children('div.replyform').length === 0) {
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
            wavesContainer = this.$el.parents('.waves-container'),
            wh = wavesContainer.height();

        this.$el.triggerHandler('click');

        if (scrollTop < 0 || scrollTop > wh) {
            wavesContainer.scrollTop(scrollTop + wavesContainer.scrollTop() - wh * 0.3);
        }

        this.$el.children('table').focus();
    },

    replyMessage: function (e) {
        if ('TEXTAREA' === e.target.nodeName) {
            return;
        }

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
        formView.show(this.$el);

        return false;
    },

    changeUserName: function () {
        this.$el.find('span.author').eq(0).text(this.model.user.get('name') + ':');
    },

    mention: function () {
        if (typeof Notification === 'undefined') {
            return;
        }

        var notification,
            notificationsEnabled = false,
            that = this,
            notificationText;

        if (Notification.permission === 'granted') {
            notificationsEnabled = true;
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission(function (permission) {
                if (permission === 'granted') {
                    notificationsEnabled = true;
                }
            });
        }

        if (notificationsEnabled) {
            notificationText = __('{{ participantName }} mentioned you in {{ waveName }}!')
                .replace('{{ participantName }}', this.model.user.get('name'))
                .replace('{{ waveName }}', this.model.getWave().get('title'));

            try {
                notification = new Notification(notificationText, {
                    tag: 'mentionNotification',
                    icon: '/images/surf-ico.png'
                });

                notification.onclick = function () {
                    //showWave?
                    that.model.setScrolled();
                };

                notification.onshow = function () {
                    setTimeout(notification.close.bind(notification), 5000);
                };
            } catch (ignore) {
                //notification constructor not supported on chrome mobile
            }
        }
    },

    addLinkPreview: function (data) {
        var linkPreview = $(linkPreviewTemplate(_.extend({title: null, image: null, description: null}, data)));
        if (!data.image) {
            linkPreview.find('img').remove();
        }

        this.$el.children('table').append(linkPreview);
    },

    formatDate(d) {
        const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];

        const date = new Date(d);

        return `${monthNames[date.getMonth()]} ${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }
});
