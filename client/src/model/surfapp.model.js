import { MessageCollection } from './message.model';
import { UserCollection } from './user.model';
import { WaveCollection } from './wave.model';

export const SurfAppModel = Backbone.Model.extend(
    /** @lends SurfAppModel.prototype */
    {
        initialize: function () {
            this.waves = new WaveCollection();
            this.users = new UserCollection();
            this.messages = new MessageCollection();
            this.currentUser = null;
            this.currentWaveId = null;
            this.ready = false;
        },

        /**
         * @param {User} user
         */
        initCurrentUser: function (user) {
            this.currentUser = user;
            this.currentUser.loadLocalAttributes();
            this.trigger('initCurrentUser');
        },

        setReady: function () {
            this.ready = true;
            this.trigger('ready');
        }
    }
);
