/*global Communicator, CryptoJS */
var EditUserView = Backbone.View.extend({
    initialize: function () {
        _.bindAll(this, 'show', 'hide');
        this.model.bind('change', this.updateFields, this);
    },
    events: {
        'click a.close' : 'hide',
        'submit form' : 'saveUser'
    },

    render: function () {
        var template = _.template($('#edituser_view').text());
        this.setElement(template());
        this.$el.hide();
        this.updateFields();

        return this;
    },

    updateFields: function () {
        this.$el.find('#edituser-name').val(this.model.get('name'));
        this.$el.find('#edituser-avatar').val(this.model.get('avatar'));

        this.$el.find('div.avatar').remove();

        var gravatarUrl = 'https://secure.gravatar.com/avatar/' + this.model.get('emailMD5') + '?s=80&d=monsterid';

        if (this.model.get('googleAvatar')) {
            this.addAvatarOption(this.model.get('googleAvatar'));
        }

        if (this.model.get('facebookAvatar')) {
            this.addAvatarOption(this.model.get('facebookAvatar'));
        }

        this.addAvatarOption(gravatarUrl);
    },

    addAvatarOption: function (url) {
        var template = $(_.template($('#edituser_avatar_view').text())({url: url}));

        template.find('img').prop('src', url);

        if (url === this.model.get('avatar')) {
            template.find('input').prop('checked', true);
        }

        this.$el.find('.ediutuser-avatar-row .right').append(template);
    },

    show: function () {
        this.$el.show();
        $('#darken').show();
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

        //callback updates current user
        Communicator.updateUser(name, avatar);

        return this.hide();
    }
});