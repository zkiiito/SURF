/*global WaveCollection, UserCollection, MessageCollection, User */
var SurfAppModel = Backbone.Model.extend(
    /** @lends SurfAppModel.prototype */
    {
        initialize: function () {
            this.waves = new WaveCollection();
            this.users = new UserCollection();
            this.messages = new MessageCollection();
            this.currentUser = null;
        },

        /**
         * @param {User} user
         */
        initCurrentUser: function (user) {
            this.currentUser = user;
            this.currentUser.loadLocalAttributes();
            this.trigger('initCurrentUser');
        }
    }
);
