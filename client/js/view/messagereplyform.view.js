var MessageReplyFormView = WaveReplyFormView.extend({
    events: _.extend({
       'click a.cancel': 'handleCancel'
    }, WaveReplyFormView.prototype.events),
    
    initialize: function() {
        WaveReplyFormView.prototype.initialize.apply(this, arguments);
        _.bindAll(this, 'handleCancel');
    },
            
    render: function() {
        var template = ich.messagereplyform_view({user: this.model.user.toJSON()});

        this.setElement(template);
        return this;
    },
    
    handleCancel: function(e){
        e.preventDefault();
        this.$el.find('form').unbind();
        this.messageView.hideReplyForm(this.$el);
        return false;
    },
            
    setMessageView: function(messageView) {
        this.messageView = messageView;
    },
            
    scrollToNextUnread: function() {
        app.model.waves.get(this.model.get('waveId')).trigger('scrollToNextUnread');
    },
            
    getWaveId: function() {
        return this.model.get('waveId');
    },
            
    getParentId: function() {
        return this.model.id;
    }
});