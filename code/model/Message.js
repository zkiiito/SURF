import Backbone from 'backbone';
import DAL from '../DALMongoRedis.js';

const Message = Backbone.Model.extend(
    /** @lends Message.prototype */
    {
        defaults: {
            userId: null,
            waveId: null,
            parentId: null,
            message: '',
            unread: true,
            created_at: null
        },
        idAttribute: '_id',
        /** @constructs */
        initialize: function () {
            if (this.isNew()) {
                this.set('created_at', Date.now());
            }
        },
        save: function () {
            return DAL.saveMessage(this);
        },
        validate: function (attrs) {
            if (0 === attrs.message.trim().length) {
                return 'Empty message';
            }
        }
    }
);

/** @class */
const MessageCollection = Backbone.Collection.extend(
    /** @lends MessageCollection.prototype */
    {
        model: Message
    }
);

export { Message as Model, MessageCollection as Collection };
