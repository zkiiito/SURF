/*global WaveReplyFormView */
var MessageReplyFormView = WaveReplyFormView.extend({
    events: _.extend({
        'click a.cancel': 'handleCancel'
    }, WaveReplyFormView.prototype.events),

    initialize: function () {
        WaveReplyFormView.prototype.initialize.apply(this, arguments);

        this.timeout = 75;
        _.bindAll(this, 'handleCancel', 'hide');
        this.listenTo(this.model.getWave(), 'hideReplyForm', this.hide);
    },

    render: function () {
        var template = _.template($('#messagereplyform_view').text());

        this.setElement(template({user: this.model.user.toJSON()}));
        return this;
    },

    handleCancel: function (e) {
        e.preventDefault();
        this.hide();
        return false;
    },

    scrollToNextUnread: function () {
        this.model.getWave().trigger('scrollToNextUnread');
    },

    getWaveId: function () {
        return this.model.get('waveId');
    },

    getParentId: function () {
        return this.model.id;
    },

    show: function (parent) {
        var threadEnd = parent.children('div.threadend');
        if (threadEnd.is(':visible')) {
            threadEnd.hide();
            this.$el.height(threadEnd.height()).appendTo(parent)
                .animate({height: '145px'}, this.timeout, function () {
                    $(this).find('textarea').focus();
                });
        } else {
            this.$el.hide().appendTo(parent).slideDown(this.timeout, function () {
                $(this).find('textarea').focus();
            });
        }
    },

    hide: function () {
        var that = this,
            threadEnd;
        if (this.$el.siblings('.replies').children().size() > 0) {
            threadEnd = this.$el.siblings('.threadend');
            this.$el.animate({height: threadEnd.height()}, this.timeout,
                function () {
                    threadEnd.show();
                    that.remove();
                });
        } else {
            this.$el.slideUp(this.timeout, function () {
                that.remove();
            });
        }
    }
});