var AdminRouter = Backbone.Router.extend({
    defaults: {
        currentGrid: null,
        currentPaginator: null
    },

    routes: {
        "waves": "initWaveAdmin",
        "users": "initUserAdmin",
        "messages/:waveId": "initMessageAdmin"
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

        $("#grid").append(grid.render().$el);
        $('#grid').find('table').addClass('table');
        $("#paginator").append(this.currentPaginator.render().$el);
    },

    initUserAdmin: function () {
        $('h1').text('Users');
        this.setCurrentGrid(userGrid);
        users.fetch({reset: true});
    },

    initMessageAdmin: function (waveId) {
        $('h1').text('Messages');
        messages.reset();
        this.setCurrentGrid(messageGrid);
        messages.url = "/api/message/" + waveId;
        messages.fetch({reset: true});
    },

    initWaveAdmin: function () {
        $('h1').text('Waves');
        this.setCurrentGrid(waveGrid);
        waves.fetch({reset: true});
    }
});

var adminRouter = new AdminRouter();
Backbone.history.start();