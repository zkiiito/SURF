var Backbone =  require('backbone'),
    Message = require('./Message');

var MessageCollection = Backbone.Collection.extend({
    model: Message 
});

module.exports = MessageCollection;