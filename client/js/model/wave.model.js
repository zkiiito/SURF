var Wave = Backbone.Model.extend({
    defaults: {
        title: '',
        userIds: [],
        current: false
    },
    idAttribute: '_id',
    initialize: function() {
        this.messages = new MessageCollection();
        this.users = new UserCollection();
        if (this.get('userIds')) {
            var uids = this.get('userIds');
            this.addUsers(uids);
        }
    },
    
    addMessage: function(message) {
        if (null !== message.get('parentId')) {
            var parentMsg = this.messages.get(message.get('parentId'));
            if (parentMsg) {
                parentMsg.addReply(message);
                this.messages.add(message);
            } else {
                if (this.messages.length > 0) { //bugos adatszerkezetnel elofordulhat
                    var minParentId = message.get('parentId'),
                        maxRootId = this.messages.at(0).id;
                    Communicator.getMessages(this, minParentId, maxRootId);
                } else {
                    console.log(message);
                }
                return false;
            }
        } else {
            this.messages.add(message);
        }
        return true;
    },
    
    addUser: function(user) {
        this.users.add(user);
    },
    
    addUsers: function(ids) {
        _.each(ids, function(item){
            var user = app.model.users.get(item);
            this.addUser(user);
        }, this);        
    },
    
    getUnreadCount: function() {
        return this.messages.reduce(function(unread, msg){return unread + (msg.get('unread') ? 1 : 0);}, 0);
    },
    
    getUserNames: function() {
        return this.users.pluck('name').join(', ');
    },
    
    getUserCount: function() {
        return this.users.length +  ' résztvevő';
    },
    
    update: function(data) {
        this.set('title', data.title);
        
        var userIds = this.get('userIds');
        if (data.userIds !== userIds) {
            var newIds = _.difference(data.userIds, userIds),
                deletedIds = _.difference(userIds, data.userIds);
            this.users.remove(deletedIds);
            this.addUsers(newIds);
            this.set('userIds', data.userIds);
        }
    },
    
    setCurrentMessage: function(messageId) {
        this.currentMessageId = messageId;
    },
    
    getNextUnreadMessage: function() {
        var minId = 0,
            nextUnreadMessage;
        
        if (this.currentMessageId) {
            var currentMessage = this.messages.get(this.currentMessageId);
            minId = currentMessage.getSortableId();
            
            //ha van current, akkor eloszor a gyerekei kozott keresunk, majd attol felfele egyre inkabb
            nextUnreadMessage = currentMessage.getNextUnread(minId);
        }
        
        if (!nextUnreadMessage) {
            nextUnreadMessage = this.messages.find(function(msg){return msg.get('unread') && msg.getSortableId() > minId;});
        }

        //ha nincs utana, megyunk visszafele
        if (!nextUnreadMessage) {
            nextUnreadMessage = this.messages.find(function(msg){return msg.get('unread') && msg.getSortableId() < minId;});
        }

        if (!nextUnreadMessage) {
            this.trigger('noMoreUnread');
        }
        
        return nextUnreadMessage;
    },
    
    getPreviousMessages: function() {
        var maxRootId = this.messages.at(0).id;
        Communicator.getMessages(this, null, maxRootId);
    },
    
    readAllMessages: function() {
        var unread = false;
        this.messages.each(function(msg){
            unread = msg.readAllMessages() || unread;
        });
        
        if (unread) {
            Communicator.readAllMessages(this);
        }
    }
});

var WaveCollection = Backbone.Collection.extend({
    model: Wave    
});
