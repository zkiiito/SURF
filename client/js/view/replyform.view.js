var ReplyFormView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'submitForm', 'handleKeydown', 'handleCancel');
    },
            
    events: {
        'submit form': 'submitForm',
        'keydown textarea': 'handleKeydown',
        'click a.cancel': 'handleCancel'
    },
            
    render: function() {
        var context = _.extend(this.model.toJSON(), {id: this.model.id, user: this.model.user.toJSON()}),
        template = ich.replyform_view(context);

        this.setElement(template);
        return this;
    },

    submitForm: function(e) {
        e.preventDefault();
        var textarea = this.$el.find('textarea');
        if (textarea.val().length > 0) {
            Communicator.sendMessage(textarea.val(), this.model.get('waveId'), this.model.id);
        }
        textarea.val('');
        return false;
    },

    handleKeydown: function(e) {
        if (!e.shiftKey && 13 === e.keyCode) {
            e.preventDefault();
            this.$el.find('form').submit();
        }
        else if (32 === e.keyCode && ' ' === $(this).val()) {
            e.preventDefault();
            this.messageView.scrollToNextUnread();
        }
        e.stopPropagation();
    },
            
    handleCancel: function(e){
        e.preventDefault();
        this.$el.find('form').unbind();
        this.messageView.hideReplyForm(this.$el);
        return false;
    },
            
    setMessageView: function(messageView) {
        this.messageView = messageView;
    }
});