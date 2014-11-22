/*global confirm */
var WaveRemoveUserView = Backbone.View.extend({
    initialize: function () {
        _.bindAll(this, 'render', 'removeUser');
    },

    events: {
        'click button' : 'removeUser'
    },

    render: function () {
        this.$el.empty();
        this.$el.append($('<button type="button" class="btn btn-xs btn-danger">Remove</button>'));

        return this;
    },

    removeUser: function () {
        if (confirm('Are you sure?')) {
            this.model.removeUser(this.userView.model.get('_id'));
            this.remove();
            this.userView.remove();
        }
    }
});