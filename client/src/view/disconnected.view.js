import Backbone from 'backbone';
import _ from 'underscore';
import $ from 'jquery';
export const DisconnectedView = Backbone.View.extend({
    initialize: function () {
        _.bindAll(this, 'show');
        this.counterStart = 3;
        this.counter = this.counterStart;
    },

    render: function () {
        var template = _.template($('#disconnected_view').text());
        this.setElement(template({ counter: this.counter }));
        this.$el.hide();

        return this;
    },

    show: function () {
        if (this.model.reconnect) {
            var that = this;
            this.interval = setInterval(function () { that.count(); }, 1000);
        } else {
            this.$el.find('.countdown').hide();
        }

        this.$el.show();
        $('#darken').show();
        return false;
    },

    count: function () {
        this.counter--;
        if (this.counter > 0) {
            this.$el.find('.counter').text(this.counter);
        } else {
            var that = this;

            clearInterval(that.interval);

            $.ajax('images/surf-ico.png?' + Math.random(), { timeout: 900 })
                .fail(function () {
                    that.counterStart *= 2;
                    that.counter = that.counterStart;
                    that.interval = setInterval(function () { that.count(); }, 1000);
                })
                .done(function () {
                    document.location.href = '/';
                });
        }
    }
});