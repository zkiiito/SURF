/*global MessageCollection, UserCollection, Communicator, app */
var Wave = Backbone.Model.extend(
    /** @lends Wave.prototype */
    {
        defaults: {
            title: '',
            userIds: [],
            current: false
        },
        idAttribute: '_id',
        /** @constructs */
        initialize: function() {
            this.messages = new MessageCollection();
            this.users = new UserCollection();
            if (this.get('userIds')) {
                var uids = this.get('userIds');
                this.addUsers(uids);
            }
        },

        /**
         * @param {Message} message
         * @returns {boolean}
         */
        addMessage: function(message) {
            if (null !== message.get('parentId')) {
                var parentMsg = this.messages.get(message.get('parentId')),
                    minParentId,
                    maxRootId;

                if (parentMsg) {
                    parentMsg.addReply(message);
                    this.messages.add(message);
                } else {
                    if (this.messages.length > 0) { //bugos adatszerkezetnel elofordulhat
                        minParentId = message.get('parentId');
                        maxRootId = this.messages.at(0).id;
                        Communicator.getMessages(this, minParentId, maxRootId);
                    }
                    /*
                    else {
                        console.log(message);
                    }
                    */
                    return false;
                }
            } else {
                this.messages.add(message);
            }
            return true;
        },

        /**
         * @param {User} user
         */
        addUser: function(user) {
            this.users.add(user);
        },

        /**
         * @param {Array} ids
         */
        addUsers: function(ids) {
            _.each(ids, function(item) {
                var user = app.model.users.get(item);
                this.addUser(user);
            }, this);
        },

        /**
         * @returns {number}
         */
        getUnreadCount: function() {
            return this.messages.reduce(function(unread, msg) {
                return unread + (msg.get('unread') ? 1 : 0);
            }, 0);
        },

        /**
         * @returns {string}
         */
        getUserNames: function() {
            return this.users.pluck('name').join(', ');
        },

        /**
         * @returns {number}
         */
        getUserCount: function() {
            return this.users.length;
        },

        /**
         * @param {Object} data
         */
        update: function(data) {
            this.set('title', data.title);

            var userIds = this.get('userIds'),
                deletedIds,
                newIds;

            if (data.userIds !== userIds) {
                newIds = _.difference(data.userIds, userIds);
                deletedIds = _.difference(userIds, data.userIds);
                this.users.remove(deletedIds);
                this.addUsers(newIds);
                this.set('userIds', data.userIds);
            }
        },

        /**
         * @param {number} messageId
         */
        setCurrentMessage: function(messageId) {
            this.currentMessageId = messageId;
        },

        /**
         * @returns {Message}
         */
        getNextUnreadMessage: function() {
            var nextUnread, msgs, i, currentMessage,
                minId = 0;

            if (this.currentMessageId) {
                currentMessage = this.messages.get(this.currentMessageId);
                minId = currentMessage.getSortableId();

                //ha van current, akkor eloszor a gyerekei kozott keresunk, majd attol felfele egyre inkabb
                nextUnread = currentMessage.getNextUnread(minId, false);

                if (nextUnread) {
                    return nextUnread;
                }
                minId = currentMessage.getRootId();
            }

            //ha nincs az aktualis korul, megyunk lefele a fo agon, az osszesben
            msgs = this.messages.filter(function(msg) {
                return msg.getSortableId() > minId && msg.get('parentId') === null;
            });
            for (i = 0; i < msgs.length; i++) {
                nextUnread = msgs[i].getNextUnread(minId, true);
                if (nextUnread) {
                    return nextUnread;
                }
            }

            //ha nem volt a fo agon, lefele semmi, akkor az elejetol kezdjuk ott ugyanugy
            if (minId > 0) {
                msgs = this.messages.filter(function(msg) {
                    return msg.getSortableId() < minId && msg.get('parentId') === null;
                });

                for (i = 0; i < msgs.length; i++) {
                    nextUnread = msgs[i].getNextUnread(0, true);
                    if (nextUnread) {
                        return nextUnread;
                    }
                }
            }

            if (!nextUnread) {
                this.trigger('noMoreUnread');
            }

            return nextUnread;
        },

        getPreviousMessages: function() {
            if (this.messages.length) {
                var maxRootId = this.messages.at(0).id;
                Communicator.getMessages(this, null, maxRootId);
            }
        },

        readAllMessages: function() {
            var unread = false;
            this.messages.each(function(msg) {
                unread = msg.readAllMessages() || unread;
            });

            if (unread) {
                this.trigger('readAll');
                Communicator.readAllMessages(this);
            }
        },

        quit: function() {
            Communicator.quitUser(this.id);
            app.currentWaveId = null;
            app.model.waves.remove(this);
            app.showWave(null);
        }
    }
);

/** @class */
var WaveCollection = Backbone.Collection.extend(
    /** @lends WaveCollection.prototype */
    {
        model: Wave
    }
);
