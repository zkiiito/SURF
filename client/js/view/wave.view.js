/*global WaveReplyFormView, UserView, MessageView, __, confirm */
var WaveView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'setCurrent', 'addMessage', 'addUser', 'removeUser', 'updateTitle',
                        'showUpdateWave', 'scrollToNextUnread', 'scrollToBottom', 'readAllMessages',
                        'quitWave', 'removeWave', 'countOfflineUsers', 'readAll');

        this.userViews = [];

        this.model.bind('change:current', this.setCurrent);
        this.model.bind('change:title', this.updateTitle);
        this.model.bind('noMoreUnread', this.scrollToBottom);
        this.model.bind('remove', this.removeWave);
        this.model.bind('readAll', this.readAll);
        this.model.bind('scrollToNextUnread', this.scrollToNextUnread);

        this.model.messages.bind('add', this.addMessage);
        this.model.users.bind('add', this.addUser);
        this.model.users.bind('remove', this.removeUser);
        this.model.users.bind('change', this.countOfflineUsers);
    },
    events: {
        'click a.editwave' : 'showUpdateWave',
        'click a.gounread' : 'scrollToNextUnread',
        'click a.getprevmessages' : 'getPreviousMessages',
        'click a.readall' : 'readAllMessages',
        'click a.quit' : 'quitWave'
    },

    render: function() {
        var context = _.extend(this.model.toJSON(), {id: this.model.id}),
            template = _.template($('#wave_view').text(), context),
            formView = new WaveReplyFormView({model: this.model});

        this.setElement(template);
        this.$el.hide();

        formView.render().$el.appendTo(this.$el.find('.waves-container'));

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
        this.countOfflineUsers();
    },

    removeUser: function(user) {
        this.changeUsers();
        this.userViews[user.id].remove();
        delete this.userViews[user.id];
        this.countOfflineUsers();
    },

    countOfflineUsers: function() {
        var counter = this.$el.find('.offline-list'),
            offlineCount = this.model.users.where({status: 'offline'}).length;

        if (offlineCount > 0) {
            counter.find('.count').text(offlineCount);
            counter.show();
        } else {
            counter.hide();
        }
    },

    updateTitle: function() {
        this.$el.find('h2').text(this.model.get('title'));
    },

    showUpdateWave: function() {
        return app.view.showUpdateWave();
    },

    scrollToNextUnread: function(e) {
        ga('send', 'event', 'WaveView', 'scrollToNextUnread');

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
        ga('send', 'event', 'WaveView', 'getPreviousMessages');
        this.model.getPreviousMessages();
    },

    readAllMessages: function(e) {
        ga('send', 'event', 'WaveView', 'readAllMessages');

        e.preventDefault();
        this.model.readAllMessages();
    },

    quitWave: function(e) {
        ga('send', 'event', 'WaveView', 'quitWave');

        e.preventDefault();

        var question =  __("Do you want to leave conversation {{ title }}" +
            "?\n\nIf you want to come back later, participants can invite you")
            .replace('{{ title }}', this.model.get('title'));

        if (confirm(question)) {
            this.model.quit();
        }
    },

    removeWave: function(wave) {
        if (wave.id === this.model.id) {
            this.$el.remove();
        }
    },

    readAll: function() {
        this.$el.find('table.unread').removeClass('unread');
    }
});