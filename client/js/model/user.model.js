/*global Communicator, app, randomName */
/** @class */
var User = Backbone.Model.extend(
    /** @lends User.prototype */
    {
        defaults: {
            name: '',
            avatar: '',
            email: '',
            status: 'offline'
        },
        idAttribute: '_id',

        /**
         * @param {Object} data
         */
        update: function (data) {
            _.each(data, function (el, idx) {
                if (this.idAttribute !== idx) {
                    this.set(idx, el);
                }
            }, this);
        },

        /**
         * @param {User} user
         */
        chatInPrivateWaveWithUser: function (user) {
            if (user !== this) {
                var privateWaves = app.model.waves.filter(function (wave) {
                    return 2 === wave.users.length && wave.users.contains(user) && wave.users.contains(this);
                }, this);

                if (privateWaves.length) {
                    app.navigate('wave/' + privateWaves[0].id, {trigger: true});
                } else {
                    Communicator.createWave(randomName() + 'Room', [user.id]);
                }
            }
        }
    }
);

/** @class */
var UserCollection = Backbone.Collection.extend(
    /** @lends UserCollection.prototype */
    {
        model: User,

        /**
         * @param {number} id
         * @returns {User}
         */
        getUser: function (id) {
            var user = this.get(id);

            if (undefined === user) {
                user = new User({_id: id, name: '[loading]'});
                this.add(user);
                Communicator.getUser(id);
            }

            return user;
        }
    }
);
