import Backbone from 'backbone';
import $ from 'jquery';
import { Communicator } from '../communicator';
import { __ } from '../i18n';
import { template, bindAll } from '../utils';

export const EditUserView = Backbone.View.extend({
    initialize: function () {
        bindAll(this, 'show', 'hide', 'testNotification');
        this.listenTo(this.model, 'change', this.updateFields);
    },
    events: {
        'click a.close': 'hide',
        'submit form': 'saveUser',
        'click button#edituser-notification-test': 'testNotification'
    },

    render: function () {
        var edituserTemplate = template($('#edituser_view').text());
        this.setElement(edituserTemplate());
        this.$el.hide();
        this.updateFields();

        return this;
    },

    updateFields: function () {
        this.$el.find('#edituser-name').val(this.model.get('name'));
        this.$el.find('#edituser-avatar').val(this.model.get('avatar'));
        this.$el.find('input#edituser-show-pictures').attr('checked', this.model.get('showPictures'));
        this.$el.find('input#edituser-show-videos').attr('checked', this.model.get('showVideos'));
        this.$el.find('input#edituser-show-linkpreviews').attr('checked', this.model.get('showLinkPreviews'));

        this.$el.find('div.avatar').remove();

        var gravatarUrl = 'https://secure.gravatar.com/avatar/' + this.model.get('emailMD5') + '?s=80&d=monsterid';

        if (this.model.get('googleAvatar')) {
            this.addAvatarOption(this.model.get('googleAvatar'));
        }

        this.addAvatarOption(gravatarUrl);
    },

    addAvatarOption: function (url) {
        var edituserAvatarTemplate = $(template($('#edituser_avatar_view').text())({ url: url }));

        edituserAvatarTemplate.find('img').prop('src', url);

        if (url === this.model.get('avatar')) {
            edituserAvatarTemplate.find('input').prop('checked', true);
        }

        this.$el.find('.ediutuser-avatar-row .right').append(edituserAvatarTemplate);
    },

    show: function () {
        this.$el.show();
        $('#darken').show();
        this.checkNotification();
        return false;
    },

    hide: function () {
        this.$el.hide();
        $('#darken').hide();
        return false;
    },

    saveUser: function (e) {
        e.preventDefault();
        var name = this.$el.find('#edituser-name').val(),
            avatar = this.$el.find('input[name=edituser-avatar-cb]:checked').val();

        this.model.set('showPictures', this.$el.find('input#edituser-show-pictures').is(':checked'), { silent: true });
        this.model.set('showVideos', this.$el.find('input#edituser-show-videos').is(':checked'), { silent: true });
        this.model.set('showLinkPreviews', this.$el.find('input#edituser-show-linkpreviews').is(':checked'), { silent: true });
        this.model.saveLocalAttributes();

        //callback updates current user
        Communicator.updateUser(name, avatar);

        return this.hide();
    },

    checkNotification: function () {
        if (!(window.Notification)) {
            this.$el.find('#edituser-notification-status').text(__('Not supported'));
            this.$el.find('#edituser-notification-test').hide();
        }

        if (Notification.permission === 'granted') {
            this.$el.find('#edituser-notification-status').text(__('Enabled'));
        } else {
            this.$el.find('#edituser-notification-status').text(__('Disabled'));
        }
    },

    testNotification: function () {
        var that = this;
        Notification.requestPermission(function (permission) {
            if (permission === 'granted') {
                var notification = new Notification('Test notification', { tag: 'mentionNotification', icon: '/images/surf-ico.png' });
                notification.onshow = function () {
                    setTimeout(notification.close.bind(notification), 5000);
                };

                that.checkNotification();
            }
        });
    }
});