var _ = require('underscore'),
    Backbone =  require('backbone'),
    DAL = require('../DAL');

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
        if (this.isNew()) {
            this.set('created_at', Date.now());
        }
    },
    save: function() {
        return DAL.saveMessage(this);
    }

    //validate: function(){
    //check: parentId
    //parent member of wave?
    //
    //}
});

var MessageCollection = Backbone.Collection.extend({
    model: Message
});

module.exports = { Model: Message, Collection: MessageCollection };