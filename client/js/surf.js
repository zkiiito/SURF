/*global SurfAppModel, SurfAppView, Communicator */
var SurfAppRouter = Backbone.Router.extend({
    initialize: function () {
        this.model = new SurfAppModel();
        this.view = new SurfAppView({
            model: this.model
        });
    },

    routes: {
        'wave/:number': 'showWave'
    },

    showWave: function (id) {
        if (this.model.waves.get(id)) {
            if (this.model.currentWaveId) {
                this.model.waves.get(this.model.currentWaveId).set('current', false);
            }
            this.model.waves.get(id).set('current', true);
            this.model.currentWaveId = id;
        } else if (this.model.waves.length) {
            this.showLastWave();
        } else {
            //navigate back to root
            this.navigate('/');
        }
    },

    showLastWave: function () {
        var lastMsg, lastWave;

        lastMsg = this.model.messages.last();
        if (lastMsg) {
            this.navigate('wave/' + lastMsg.get('waveId'), {trigger: true});
        } else {
            lastWave = this.model.waves.last();
            this.showWave(lastWave ? lastWave.id : null);
        }
    }
});

window.onerror = function (message, file, line) {
    var data = {
        prefix: 'JSERROR',
        errorMessage: message + ' in ' + file + ' on line ' + line + '. URL: ' + window.location.href + ' BROWSER: ' + navigator.userAgent
    };
    $.post('/logError', data);
};

$(function () {
    var surfApp = new SurfAppRouter();
    window.app = surfApp;

    Backbone.history.start();
    Communicator.initialize(surfApp);
});