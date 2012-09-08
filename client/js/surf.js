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
        if (app.model.waves.get(id)) {
            if (app.currentWave) {
                app.model.waves.get(app.currentWave).set('current', false);
            }
            app.model.waves.get(id).set('current', true);
            app.currentWave = id;
        } else {
            this.navigate("");
        }
    },

    removeWave: function(cid) {
    //app.model.movies.remove(app.model.movies.getByCid(cid));
    }
});

$(function() {
    var surfApp = new SurfAppRouter();
    window.app = surfApp;
    Backbone.history.start();
    Communicator.initialize();
});