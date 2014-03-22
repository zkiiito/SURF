/*global WaveCollection, UserCollection, MessageCollection, User */
var SurfAppModel = Backbone.Model.extend({
    initialize: function() {
        this.waves = new WaveCollection();
        this.users = new UserCollection();
        this.messages = new MessageCollection();
        this.currentUser = new User();
    }
});
