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
    
    setCurrent: function() {
        var wave = app.model.waves.get(this.get('waveId'));
        wave.setCurrentMessage(this.id);
    },
    
    setScrolled: function() {
        this.trigger('change:scrolled');
    },
    
    formatMessage: function() {
        var msg = this.get('message');
        msg = strip_tags(msg);
        
        //TODO: improve
        var urlRegex = /((https?:\/\/|www\.)[^\s"]+)/g;
        msg = msg.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
        
        msg = nl2br(msg, true);
        
        this.set('messageFormatted', msg);
    },
    
    getSortableId: function() {
        if (!this.sortableId) {
            var timestamp = Number('0x' + this.id.substr(0, 8));
            //var machine = Number('0x' + this.id.substr(8, 6));
            //var pid = Number('0x' + this.id.substr(14, 4));
            var increment = Number('0x' + this.id.substr(18, 6));
            this.sortableId = Number(timestamp + increment);
        }
        return this.sortableId;
    },
    
    readAllMessages: function() {
        unread = this.get('unread');
        this.set('unread', false);
        
        return unread;
    },
    
    getNextUnread: function(minId) {
        var nextUnread = this.messages.find(function(msg){return msg.get('unread') && msg.getSortableId() > minId});
        
        if (!nextUnread && this.get('parentId'))
            return app.model.messages.get(this.get('parentId')).getNextUnread(minId);
        
        return nextUnread;
    }
    
});

var MessageCollection = Backbone.Collection.extend({
    model: Message,
    
    comparator: function(msg) {
        return msg.getSortableId();
    }    
});