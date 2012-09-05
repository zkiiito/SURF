var Message = Backbone.Model.extend({
    defaults: {
        userId: null,
        waveId: null,
        parentId: null,
        message: '',
        unread: true,
        created_at: null
    },
    idAttribute: '_id',
    initialize: function() {
         this.messages = new MessageCollection(); //nem itt kene
         this.user = app.model.users.get(this.get('userId'));
         this.formatMessage();
         if (!this.isNew()) {
            this.set('unread', this.get('unread') && app.currentUser != this.get('userId'));
         }
    },
    addReply: function(message) {
        if (null == this.messages) {
            this.messages = new MessageCollection();
        }
        this.messages.add(message);
    },
    
    read: function() {
        if (this.get('unread')) {
            this.set('unread', false);
            Communicator.readMessage(this);
        }
    },
    
    formatMessage: function() {
        var msg = this.get('message');
        msg = strip_tags(msg);
        
        //TODO: improve
        var urlRegex = /((https?:\/\/|www\.)[^\s"]+)/g;
        msg = msg.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
        
        msg = nl2br(msg, true);
        
        this.set('messageFormatted', msg);
    }
    
});

var MessageCollection = Backbone.Collection.extend({
    model: Message
});