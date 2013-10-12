var Backbone =  require('backbone'),
    User = require('./User');
    
var UserCollection = Backbone.Collection.extend({
    model: User 
});

module.exports = UserCollection;