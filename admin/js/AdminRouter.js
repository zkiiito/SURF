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
        $("#paginator").append(this.currentPaginator.render().$el);
    },

    initUserAdmin: function () {
        this.setCurrentGrid(userGrid);
        users.fetch({reset: true});
    },

    initMessageAdmin: function (waveId) {
        messages.reset();
        this.setCurrentGrid(messageGrid);
        messages.url = "/api/message/" + waveId;
        messages.fetch({reset: true});
    },

    initWaveAdmin: function () {
        this.setCurrentGrid(waveGrid);
        waves.fetch({reset: true});
    }
});

var adminRouter = new AdminRouter();
Backbone.history.start();