var User = Backbone.Model.extend({
    defaults: {
        name: '',
        avatar: '',
        status: 'offline'
    },
    idAttribute: '_id',
    update: function(data) {
        _.each(data, function(el, idx){
            if (this.idAttribute != idx)
                this.set(idx, el);
        }, this);
    }
});


var UserCollection = Backbone.Collection.extend({
    model: User 
});
