import { Communicator } from '../communicator';
import { MessageCollection } from './message.model';
import { surfAppModel } from './surfapp.singleton';
import { UserCollection } from './user.model';

export const Wave = Backbone.Model.extend(
    /** @lends Wave.prototype */
    {
        defaults: {
            title: '',
            userIds: [],
            current: false,
            archived: true
        },
        idAttribute: '_id',
        /** @constructs */
        initialize: function () {
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
        addMessage: function (message) {
            if (null !== message.get('parentId')) {
                var parentMsg = this.messages.get(message.get('parentId')),
                    minParentId,
                    maxRootId;

                if (parentMsg) {
                    parentMsg.addReply(message);
                    this.messages.add(message);
                } else {
                    if (this.messages.length > 0) { //errors can occur with buggy data
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

            if (Date.now() - message.get('created_at_date').getTime() < 7 * (1000 * 60 * 60 * 24)) {
                this.set('archived', false);
            }

            return true;
        },

        /**
         * @param {User} user
         */
        addUser: function (user) {
            this.users.add(user);
        },

        /**
         * @param {Array} ids
         */
        addUsers: function (ids) {
            _.each(ids, function (item) {
                var user = surfAppModel.users.get(item);
                this.addUser(user);
            }, this);
        },

        /**
         * @returns {number}
         */
        getUnreadCount: function () {
            return this.messages.reduce(function (unread, msg) {
                return unread + (msg.get('unread') ? 1 : 0);
            }, 0);
        },

        /**
         * @returns {string}
         */
        getUserNames: function () {
            return this.users.pluck('name').join(', ');
        },

        /**
         * @returns {number}
         */
        getUserCount: function () {
            return this.users.length;
        },

        /**
         * @param {Object} data
         */
        update: function (data) {
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
        setCurrentMessage: function (messageId) {
            this.currentMessageId = messageId;
        },

        /**
         * @returns {Message}
         */
        getNextUnreadMessage: function () {
            var nextUnread, msgs, i, currentMessage,
                minId = 0;

            if (this.currentMessageId) {
                currentMessage = this.messages.get(this.currentMessageId);
                minId = currentMessage.getSortableId();

                //if we have a current message, check its children, then its parents recursive
                nextUnread = currentMessage.getNextUnread(minId, false, []);

                if (nextUnread) {
                    return nextUnread;
                }
                minId = currentMessage.getRootId();
            }

            //if no unread found around the current, or no current, check the main thread, for all root elements below the current root
            msgs = this.messages.filter(function (msg) {
                return msg.getSortableId() > minId && msg.get('parentId') === null;
            });
            for (i = 0; i < msgs.length; i++) {
                nextUnread = msgs[i].getNextUnread(minId, true, []);
                if (nextUnread) {
                    return nextUnread;
                }
            }

            //if none found, check root elements from the top
            if (minId > 0) {
                msgs = this.messages.filter(function (msg) {
                    return msg.getSortableId() < minId && msg.get('parentId') === null;
                });

                for (i = 0; i < msgs.length; i++) {
                    nextUnread = msgs[i].getNextUnread(0, true, []);
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

        getPreviousMessages: function () {
            if (this.messages.length) {
                var maxRootId = this.messages.at(0).id;
                Communicator.getMessages(this, null, maxRootId);
            }
        },

        readAllMessages: function () {
            var unread = false;
            this.messages.each(function (msg) {
                unread = msg.readAllMessages() || unread;
            });

            if (unread) {
                this.trigger('readAll');
                Communicator.readAllMessages(this);
            }
        },

        quit: function () {
            Communicator.quitUser(this.id);
            surfAppModel.currentWaveId = null;
            surfAppModel.waves.remove(this);
            surfAppModel.messages.remove(surfAppModel.messages.where({ waveId: this.id }), { silent: true });

            // TODO
            // eslint-disable-next-line no-undef
            app.showLastWave();
        }
    }
);

export const WaveCollection = Backbone.Collection.extend(
    /** @lends WaveCollection.prototype */
    {
        model: Wave,

        /**
         * @param {Wave} wave
         * @returns {number}
         */
        comparator: function (wave) {
            return wave.id;
        }
    }
);
