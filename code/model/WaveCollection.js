var Backbone =  require('backbone'),
    Wave = require('./Wave');

var WaveCollection = Backbone.Collection.extend({
    model: Wave    
});

module.exports = WaveCollection;