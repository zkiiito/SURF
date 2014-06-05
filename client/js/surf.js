/*global SurfAppModel, SurfAppView, Communicator */
var SurfAppRouter = Backbone.Router.extend({
    defaults: {
        currentWaveId: null
    },
    initialize: function() {
        this.model = new SurfAppModel();
        this.view = new SurfAppView({
            model: this.model
        });
    },

    routes: {
        'wave/:number': "showWave"
    },

    showWave: function(id) {
        if (this.model.waves.get(id)) {
            if (this.currentWaveId) {
                this.model.waves.get(this.currentWaveId).set('current', false);
            }
            this.model.waves.get(id).set('current', true);
            this.currentWaveId = id;
        } else {
            this.navigate("");
        }
    }
});

$(function() {
    _.templateSettings = {
        interpolate: /\{|\|(.+?)\|\}/g,
        escape: /\{\{(.+?)\}\}/g
    };
    var surfApp = new SurfAppRouter();
    window.app = surfApp;
    Backbone.history.start();
    Communicator.initialize();
});