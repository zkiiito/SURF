/*global Communicator, app, swal */
/* exported WaveReplyFormView */
var WaveReplyFormView = Backbone.View.extend({
    initialize: function () {
        _.bindAll(this, 'submitForm', 'handleKeydown');
    },

    events: {
        'submit form': 'submitForm',
        'keydown textarea': 'handleKeydown'
    },

    render: function () {
        var template = _.template($('#wavereplyform_view').text());
        this.setElement(template());
        return this;
    },

    submitForm: function (e) {
        e.preventDefault();
        var textarea = this.$el.find('textarea');
        var that = this;

        //prompt for message on mobile
        if ($('body').hasClass('mobile') && 0 === textarea.val().length) {
            swal({
                title: '',
                content: {
                    element: 'input',
                    attributes: {
                        placeholder: textarea.prop('placeholder')
                    }
                }
            }).then(function (inputValue) {
                if (inputValue.length > 0) {
                    Communicator.sendMessage(inputValue, that.getWaveId(), that.getParentId());
                }
            });
        } else {
            if (textarea.val().length > 0) {
                Communicator.sendMessage(textarea.val(), this.getWaveId(), this.getParentId());
            }
            textarea.val('');
        }
        return false;
    },

    handleKeydown: function (e) {
        if (!e.shiftKey && 13 === e.keyCode) {
            //enter
            e.preventDefault();
            this.$el.find('form').submit();
        } else if (32 === e.keyCode && ' ' === $(e.target).val()) {
            //space
            e.preventDefault();
            this.scrollToNextUnread();
        } else if (!e.shiftKey && 9 === e.keyCode) {
            //tab
            e.preventDefault();
            this.mentionUser();
        }
        e.stopPropagation();
    },

    scrollToNextUnread: function () {
        this.model.trigger('scrollToNextUnread');
    },

    getWaveId: function () {
        return this.model.id;
    },

    getWave: function () {
        return app.model.waves.get(this.getWaveId());
    },

    getParentId: function () {
        return null;
    },

    mentionUser: function () {
        var search, users, replace, allFunc,
            replaceSelect = 0,
            textarea = this.$el.find('textarea'),
            caretPos = textarea[0].selectionEnd || 0,
            atpos = textarea.val().lastIndexOf('@', caretPos);

        if (atpos > -1 && caretPos - atpos < 50) {
            search = textarea.val().substring(atpos + 1, caretPos).toLowerCase();
            users = this.getWave().users.filter(function (user) {
                return user.get('name').toLowerCase().indexOf(search) === 0;
            });

            if (users.length > 0) {
                if (1 === users.length) {
                    replace = users[0].get('name');
                } else {
                    replace = users[0].get('name').substr(0, search.length);
                    allFunc = function (user) {
                        return user.get('name').substr(0, replace.length) === replace;
                    };

                    while (_.all(users, allFunc)) {
                        replace = users[0].get('name').substr(0, replace.length + 1);
                    }

                    replace = replace.substr(0, replace.length - 1) + '?';
                    replaceSelect = 1;
                }
                textarea.val(textarea.val().substring(0, atpos + 1) + replace + textarea.val().substr(caretPos));
                textarea[0].selectionStart = atpos + 1 + replace.length - replaceSelect;
                textarea[0].selectionEnd = atpos + 1 + replace.length;
            }
        }
    }
});