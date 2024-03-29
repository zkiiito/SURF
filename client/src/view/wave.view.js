import { __ } from '../i18n';
import { MessageView } from './message.view';
import { UserView } from './user.view';
import { WaveReplyFormView } from './wavereplyform.view';

const waveTemplate = _.template($('#wave_view').text());
export const WaveView = Backbone.View.extend({
    initialize: function () {
        _.bindAll(this, 'setCurrent', 'addMessage', 'addUser', 'removeUser', 'updateTitle',
            'showUpdateWave', 'scrollToNextUnread', 'scrollToBottom', 'readAllMessages',
            'quitWave', 'removeWave', 'countOfflineUsers', 'readAll');

        this.userViews = [];

        this.listenTo(this.model, 'change:current', this.setCurrent);
        this.listenTo(this.model, 'change:title', this.updateTitle);
        this.listenTo(this.model, 'noMoreUnread', this.scrollToBottom);
        this.listenTo(this.model, 'remove', this.removeWave);
        this.listenTo(this.model, 'readAll', this.readAll);
        this.listenTo(this.model, 'scrollToNextUnread', this.scrollToNextUnread);

        this.listenTo(this.model.messages, 'add', this.addMessage);
        this.listenTo(this.model.users, 'add', this.addUser);
        this.listenTo(this.model.users, 'remove', this.removeUser);
        this.listenTo(this.model.users, 'change', this.countOfflineUsers);
    },
    events: {
        'click a.editwave': 'showUpdateWave',
        'click a.gounread': 'scrollToNextUnread',
        'click div.wavetop': 'scrollToNextUnread',
        'click a.getprevmessages': 'getPreviousMessages',
        'click a.readall': 'readAllMessages',
        'click a.quit': 'quitWave'
    },

    render: function () {
        var context = _.extend(this.model.toJSON(), { id: this.model.id }),
            formView = new WaveReplyFormView({ model: this.model });

        this.setElement(waveTemplate(context));
        this.$el.hide();

        formView.render().$el.appendTo(this.$el.find('.waves-container'));

        this.model.users.each(this.addUser);

        this.fragmentMode = true;
        this.fragment = $(document.createDocumentFragment());
        this.model.messages.each(this.addMessage, this);
        this.fragmentMode = false;
        this.$el.find('.messages').append(this.fragment);

        return this;
    },

    setCurrent: function () {
        if (this.model.get('current')) {
            $('.wave').hide();
            this.$el.show();
            this.scrollToNextUnread();
        }
    },

    addMessage: function (message) {
        if (null === message.get('parentId')) {
            var view = new MessageView({ model: message }),
                viewElement = view.render().el,
                targetPos;

            if (this.fragmentMode) {
                this.fragment.append(viewElement);
            } else {
                targetPos = this.model.messages.where({ parentId: null }).indexOf(message);
                if (0 === targetPos) {
                    this.$el.find('div.getprevmessages').after(viewElement);
                } else {
                    this.$el.find('.messages > .message').eq(targetPos - 1).after(viewElement);
                }
            }
        }
    },

    changeUsers: function () {
        var usernames = this.model.getUserNames();
        this.$el.find('span.usernames').text(usernames);
    },

    addUser: function (user) {
        this.changeUsers();
        var userView = new UserView({ model: user });
        this.userViews[user.id] = userView;

        this.$el.find('.heads').append(userView.render().el);
        this.countOfflineUsers();
    },

    removeUser: function (user) {
        this.changeUsers();
        this.userViews[user.id].remove();
        delete this.userViews[user.id];
        this.countOfflineUsers();
    },

    countOfflineUsers: function () {
        var counter = this.$el.find('.offline-list'),
            offlineCount = this.model.users.where({ status: 'offline' }).length;

        if (offlineCount > 0) {
            counter.find('.count').text(offlineCount);
            counter.show();
        } else {
            counter.hide();
        }
    },

    updateTitle: function () {
        this.$el.find('h2').text(this.model.get('title'));
    },

    showUpdateWave: function () {
        // TODO
        // eslint-disable-next-line no-undef
        return app.view.showUpdateWave();
    },

    scrollToNextUnread: function (e) {
        if (e) {
            e.preventDefault();
        }
        var nextUnread = this.model.getNextUnreadMessage();

        if (nextUnread) {
            nextUnread.setScrolled();
        }

        return false;
    },

    scrollToBottom: function () {
        var wavesContainer = this.$el.find('.waves-container');
        wavesContainer.scrollTop(wavesContainer.prop('scrollHeight')).focus();
    },

    getPreviousMessages: function (e) {
        e.preventDefault();
        //this.$el.find('div.getprevmessages').hide();
        this.model.getPreviousMessages();
    },

    readAllMessages: function (e) {
        e.preventDefault();
        this.model.readAllMessages();
    },

    quitWave: function (e) {
        e.preventDefault();

        var question = __('Do you want to leave conversation {{ title }}' +
            '?\n\nIf you want to come back later, participants can invite you')
            .replace('{{ title }}', this.model.get('title'));

        if (confirm(question)) {
            this.model.quit();
        }
    },

    removeWave: function (wave) {
        if (wave.id === this.model.id) {
            this.$el.remove();
        }
    },

    readAll: function () {
        this.$el.find('table.unread').removeClass('unread');
    }
});