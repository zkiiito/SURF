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
        this.user = app.model.users.getUser(this.get('userId'));
        this.formatMessage();
        if (!this.isNew()) {
            this.set('unread', this.get('unread') && app.currentUser !== this.get('userId'));
        }
    },
    addReply: function(message) {
        if (null === this.messages) {
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
        var msg = this.get('message'),
            urlRegex = /((https?:\/\/|www\.)[^\s"]+)/g, //TODO: improve
            parts,i,c,matched,url;
            
        msg = strip_tags(msg);
        parts = msg.split(' ');
        for (i = 0, c = parts.length; i < c; i++) {
            matched = parts[i].match(urlRegex);
            if (matched) {//ha link
                url = matched[0];
                url = url.length > 53 ? url.substr(0,50) + '...' : url;
                parts[i] = '<a href="' + matched[0] + '" target="_blank">' + url + '</a>';
            } else {
                parts[i] = wordwrap(parts[i], 200, ' ', true);
            }
        }
        
        msg = parts.join(' ');        
        msg = nl2br(msg, true);
        
        this.set('messageFormatted', msg);
    },
    
    getSortableId: function() {
        if (!this.sortableId) {
            var timestamp = Number('0x' + this.id.substr(0, 8)),
                //machine = Number('0x' + this.id.substr(8, 6)),
                //pid = Number('0x' + this.id.substr(14, 4)),
                increment = Number('0x' + this.id.substr(18, 6));
            this.sortableId = Number(timestamp + increment);
        }
        return this.sortableId;
    },
    
    readAllMessages: function() {
        var unread = this.get('unread');
        this.set('unread', false);
        
        return unread;
    },
    
    getNextUnread: function(minId, downOnly) {
        //megnezzuk sajat magat
        if (this.getSortableId() > minId && this.get('unread')) {
            return this;
        }
        
        //megnezzuk a gyerekeit
        var msgs = this.messages.toArray(),
            nextUnread = null,
            i = 0;

        for (i = 0; i < msgs.length; i+=1)
        {
            nextUnread = msgs[i].getNextUnread(minId, true);
            if (nextUnread) {
                return nextUnread;
            }
        }
        
        //megnezzuk a szulojet
        if (!nextUnread && this.get('parentId') && !downOnly) {
            return app.model.messages.get(this.get('parentId')).getNextUnread(0, false);
        }
        
        return nextUnread;
    },
    
    getRootId: function() {
        if (this.get('parentId')) {
            return app.model.messages.get(this.get('parentId')).getRootId();
        } else {
            return this.getSortableId();
        }
    }
    
});

var MessageCollection = Backbone.Collection.extend({
    model: Message,
    
    comparator: function(msg) {
        return msg.getSortableId();
    }    
});