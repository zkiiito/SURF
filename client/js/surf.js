/*global SurfAppModel, SurfAppView, Communicator */
var SurfAppRouter = Backbone.Router.extend({
    defaults: {
        currentWave: null,
        currentUser: null
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
    /*
    addWave: function() {
        app.model.waves.add(new Wave({
            id: Math.floor(Math.random() * 1100),
            title: 'Csudivávé ' + Math.floor(Math.random()*11),
            usernames: 'leguan, tibor, klara, csabcsi',
            unreadMessages: 3
        }));
    //this.navigate('movies'); // reset location so we can trigger again
    },
    */
    showWave: function(id) {
        if (this.model.waves.get(id)) {
            if (this.currentWave) {
                this.model.waves.get(this.currentWave).set('current', false);
            }
            this.model.waves.get(id).set('current', true);
            this.currentWave = id;
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