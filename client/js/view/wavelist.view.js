/*global __, app */
/* exported WaveListView */
var WaveListView = Backbone.View.extend({
    initialize: function () {
        _.bindAll(this, 'setCurrent', 'countMessages', 'updateMessages', 'changeUsers', 'updateTitle', 'scrollToNextUnread', 'removeWave');
        this.listenTo(this.model, 'change:current', this.setCurrent);
        this.listenTo(this.model, 'change:title', this.updateTitle);
        this.listenTo(this.model, 'remove', this.removeWave);

        this.listenTo(this.model.messages, 'change:unread', this.countMessages);
        this.listenTo(this.model, 'readAll', this.countMessages);
        this.listenTo(this.model.messages, 'add', this.countMessages);
        this.listenTo(this.model.messages, 'add', this.updateMessages);

        this.listenTo(this.model.users, 'add', this.changeUsers);
        this.listenTo(this.model.users, 'remove', this.changeUsers);
    },

    events: {
        'click' : 'scrollToNextUnread'
    },

    render: function () {
        var context = _.extend(this.model.toJSON(), {
                id: this.model.id
            }),
            template = _.template($('#wave_list_view').text());

        this.setElement(template(context));
        this.changeUsers();
        this.countMessages();
        this.setCurrent();
        return this;
    },

    setCurrent: function () {
        if (this.model.get('current')) {
            $('.waveitem').removeClass('open');
            this.$el.addClass('open');
        }
    },

    countMessages: function () {
        var msgs = this.model.getUnreadCount();
        if (msgs > 0) {
            this.$el.find('.piros').text('| ' + msgs + ' ' + __('new messages'));
            this.$el.addClass('updated');
        } else {
            this.$el.find('.piros').text('');
            this.$el.removeClass('updated');
        }
    },

    updateMessages: function (message) {
        if (message.get('userId') !== app.model.currentUser.id && message.get('unread')) {
            this.$el.addClass('updated');
        }
    },

    changeUsers: function () {
        var usercount = __('{{ usercount }} participants').replace('{{ usercount }}', this.model.getUserCount());
        this.$el.find('.usercount').text(usercount);
    },

    updateTitle: function () {
        this.$el.find('h2').text(this.model.get('title'));
    },

    scrollToNextUnread: function (e) {
        if (app.currentWaveId === this.model.id) {
            e.preventDefault();
            var nextUnread = this.model.getNextUnreadMessage();

            if (nextUnread) {
                nextUnread.setScrolled();
            }
        }

        $('body.mobile #wave-list').css('left', '-55%');
    },

    removeWave: function (wave) {
        if (wave.id === this.model.id) {
            this.$el.remove();
        }
    }
});