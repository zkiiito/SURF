var WaveReplyFormView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'submitForm', 'handleKeydown');
    },
            
    events: {
        'submit form': 'submitForm',
        'keydown textarea': 'handleKeydown'
    },
            
    render: function() {
        var template = ich.wavereplyform_view();

        this.setElement(template);
        return this;
    },

    submitForm: function(e) {
        e.preventDefault();
        var textarea = this.$el.find('textarea');
        if (textarea.val().length > 0) {
            Communicator.sendMessage(textarea.val(), this.getWaveId(), this.getParentId());
        }
        textarea.val('');
        return false;
    },

    handleKeydown: function(e) {
        if (!e.shiftKey && 13 === e.keyCode) {
            e.preventDefault();
            this.$el.find('form').submit();
        }
        else if (32 === e.keyCode && ' ' === $(e.target).val()) {
            e.preventDefault();
            this.scrollToNextUnread();
        }
        e.stopPropagation();
    },
            
    scrollToNextUnread: function() {
        this.model.trigger('scrollToNextUnread');
    },
            
    getWaveId: function() {
        return this.model.id;
    },
            
    getParentId: function() {
        return null;
    }
});