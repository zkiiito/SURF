// eslint-disable-next-line no-unused-vars
import * as token from '../jquery.tokenInput';
import { Communicator } from '../communicator';
import { __ } from '../i18n';
import { surfAppModel } from '../model/surfapp.singleton';

export const EditWaveView = Backbone.View.extend({
    initialize: function () {
        _.bindAll(this, 'show', 'hide', 'setWave', 'genUserArray', 'inviteCodeReady');
        this.userArray = [];
        this.listenTo(this.model.users, 'add', this.genUserArray);
        this.listenTo(this.model.users, 'change', this.genUserArray);
    },
    events: {
        'click a.close': 'hide',
        'submit form': 'editWave',
        'click button#editwave-invite': 'getInviteCode'
    },

    render: function () {
        var template = _.template($('#editwave_view').text());
        this.setElement(template());
        this.$el.hide();
        return this;
    },

    genUserArray: function () {
        this.userArray = this.model.users.reduce(function (userArray, user) {
            var obj = { id: user.id, name: user.get('name') + ' (' + user.get('email') + ')', readonly: true };

            if (!this.wave || (this.wave && !this.wave.users.get(user.id))) {
                userArray.push(obj);
            }

            return userArray;
        }, [], this);
    },

    initUserSuggest: function () {
        this.genUserArray();

        if (this.inited) {
            return;
        }

        this.$el.find('#editwave-users').tokenInput([], {
            theme: 'facebook',
            preventDuplicates: true,
            hintText: __('Enter username.'),
            noResultsText: __('User not found.'),
            searchingText: __('Searching...')
        });
        this.inited = true;
    },

    updateUserSuggest: function () {
        this.initUserSuggest();

        this.$el.find('#editwave-users').data('settings').local_data = this.userArray;

        var suggest = this.$el.find('#editwave-users');
        suggest.tokenInput('clear');

        if (this.wave) {
            this.wave.users.each(function (user) {
                suggest.tokenInput('add', { id: user.id, name: user.get('name'), readonly: true });
            });
        } else {
            suggest.tokenInput('add', { id: surfAppModel.currentUser.id, name: surfAppModel.currentUser.get('name'), readonly: true });
        }

    },

    show: function () {
        this.$el.find('#editwave-invitecode-block').hide();

        if (this.wave) {
            this.$el.find('input[name=title]').val(this.wave.get('title'));
            this.$el.find('h2').text(__('Edit conversation'));
            this.$el.find('#editwave-submit').text(__('Save'));
            this.$el.find('#editwave-invite').show();
        } else {
            this.$el.find('input[name=title]').val('');
            this.$el.find('h2').text(__('Add conversation'));
            this.$el.find('#editwave-submit').text(__('Create'));
            this.$el.find('#editwave-invite').hide();
        }

        this.updateUserSuggest();

        //this.$el.find('form').reset();???
        this.$el.show();
        $('#darken').show();
        this.$el.find('#editwave-title').focus();
        return false;
    },

    hide: function () {
        this.$el.hide();
        $('#darken').hide();
        return false;
    },

    setWave: function (waveId) {
        this.wave = this.model.waves.get(waveId);
        if (this.wave) {
            this.listenTo(this.wave, 'inviteCodeReady', this.inviteCodeReady);
        }
    },

    editWave: function () {
        var title = this.$el.find('#editwave-title').val(),
            users = this.$el.find('#editwave-users').tokenInput('get'),
            userIds = _.pluck(users, 'id');

        if (this.wave) {
            Communicator.updateWave(this.wave.id, title, userIds);
        } else {
            Communicator.createWave(title, userIds);
        }

        return this.hide();
    },

    getInviteCode: function (e) {
        e.preventDefault();
        this.$el.find('button#editwave-invite').hide();
        Communicator.getInviteCode(this.wave.id);
    },

    inviteCodeReady: function (code) {
        //this.$el.find('button#editwave-invite').show(); ??
        this.$el.find('#editwave-invitecode-block').show();
        var invitecode = document.location.protocol + '//' + document.location.host + '/invite/' + code;
        this.$el.find('#editwave-invitecode').val(invitecode).focus().select();
    }
});