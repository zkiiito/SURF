import Backbone from 'backbone';
import $ from 'jquery';
import { surfAppModel } from '../model/surfapp.singleton';
import { template, bindAll } from '../utils';

export const UserView = Backbone.View.extend({
    initialize: function () {
        bindAll(this, 'render', 'update', 'chatInPrivate');
        this.listenTo(this.model, 'change', this.update);
    },

    events: {
        'dblclick': 'chatInPrivate'
    },

    render: function () {
        var userTemplate = template($('#user_view').text());
        this.setElement(userTemplate(this.model.toJSON()));
        this.$el.attr('src', this.model.get('avatar'));//kesobb kell beallitani, mert kulonben nem talalja az {{}} avatar imaget
        return this;
    },

    update: function () {
        this.$el.removeClass('online offline').addClass(this.model.get('status'));
        this.$el.attr('title', this.model.get('name'));
        this.$el.attr('alt', this.model.get('name'));

        if (this.$el.attr('src') !== this.model.get('avatar')) {
            this.$el.attr('src', this.model.get('avatar'));
        }

        return this;
    },

    chatInPrivate: function () {
        surfAppModel.currentUser.chatInPrivateWaveWithUser(this.model);
    }
});