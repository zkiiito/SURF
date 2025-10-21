import Backbone from 'backbone';
import { surfAppModel } from './model/surfapp.singleton';
import { SurfAppView } from './view/surfapp.view';

export const SurfAppRouter = Backbone.Router.extend({
    initialize: function () {
        this.model = surfAppModel;
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
            this.navigate('wave/' + lastMsg.get('waveId'), { trigger: true });
        } else {
            lastWave = this.model.waves.last();
            this.showWave(lastWave ? lastWave.id : null);
        }
    }
});

