/*global Communicator */
var User = Backbone.Model.extend({
    defaults: {
        name: '',
        avatar: '',
        status: 'offline'
    },
    idAttribute: '_id',
    update: function(data) {
        _.each(data, function(el, idx) {
            if (this.idAttribute !== idx) {
                this.set(idx, el);
            }
        }, this);
    }
});


var UserCollection = Backbone.Collection.extend({
    model: User,

    getUser: function(id) {
        var user = this.get(id);

        if (undefined === user) {
            user = new User({_id: id, name: '[loading]'});
            this.add(user);
            Communicator.getUser(id);
        }

        return user;
    }
});
