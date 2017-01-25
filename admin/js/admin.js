/*global Backgrid */
var app = {};

var AdminRouter = Backbone.Router.extend({
    defaults: {
        currentGrid: null,
        currentPaginator: null
    },

    routes: {
        'waves': 'initWaveAdmin',
        'users': 'initUserAdmin',
        'waveinvites': 'initWaveInviteAdmin',
        'messages/:waveId': 'initMessageAdmin'
    },

    setCurrentGrid: function (grid) {
        $('#grid').empty();
        if (this.currentPaginator) {
            this.currentPaginator.remove();
            $('#paginator').empty();
        }

        this.currentGrid = grid;
        this.currentPaginator = new Backgrid.Extension.Paginator({
            collection: grid.collection
        });

        $('#grid').append(grid.render().$el);
        $('#grid').find('table').addClass('table');
        $('#paginator').append(this.currentPaginator.render().$el);
    },

    initUserAdmin: function () {
        $('h1').text('Users');
        this.setCurrentGrid(app.userGrid);
        app.users.fetch({reset: true});
    },

    initMessageAdmin: function (waveId) {
        $('h1').text('Messages');
        app.messages.reset();
        this.setCurrentGrid(app.messageGrid);
        app.messages.url = '/admin/api/message/' + waveId;
        app.messages.fetch({reset: true});
    },

    initWaveAdmin: function () {
        $('h1').text('Waves');
        this.setCurrentGrid(app.waveGrid);
        app.waves.fetch({reset: true});
    },

    initWaveInviteAdmin: function () {
        $('h1').text('WaveInvites');
        this.setCurrentGrid(app.waveInviteGrid);
        app.waveInvites.fetch({reset: true});
    }
});

$(function () {
    app.adminRouter = new AdminRouter();
    Backbone.history.start();
});
