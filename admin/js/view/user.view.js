/* exported UserView */
var UserView = Backbone.View.extend({
    initialize: function () {
        _.bindAll(this, 'render', 'removeUser', 'setWave', 'readAll');
        this.listenTo(this.model, 'change', this.render);
        this.listenTo(this.model, 'changeUnread', this.render);
    },

    events: {
        'click button.remove' : 'removeUser',
        'click a.unread' : 'readAll'
    },

    render: function () {
        this.$el.empty();
        this.$el.addClass('userview');
        this.$el.append($('<img src="' + this.model.get('avatar') + '" width="20">'));
        this.$el.append($('<span>').text(this.model.get('name')));

        if (this.wave) {
            this.$el.append($('<a>').text('[' + this.model.getUnreadCountByWaveId(this.wave.id) + ']').addClass('unread'));
            this.$el.prepend($('<button type="button" class="btn btn-xs btn-danger remove">Remove</button>'));
        }

        return this;
    },

    setWave: function (wave) {
        this.wave = wave;
        this.render();
    },

    removeUser: function () {
        if (confirm('Are you sure?')) {
            this.wave.removeUser(this.model.get('_id'));
            this.remove();
        }
    },

    readAll: function (e) {
        e.preventDefault();
        if (confirm('Are you sure?')) {
            this.model.deleteUnreadCountByWaveId(this.wave.id);
        }
    }
});