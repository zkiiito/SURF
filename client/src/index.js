import jQuery from 'jquery';
import Backbone from 'backbone';
// eslint-disable-next-line no-unused-vars
// import * as tocca from 'tocca';
import { SurfAppRouter } from './surf';
import { Communicator } from './communicator';

// Make jQuery global
window.$ = window.jQuery = jQuery;
window.Backbone = Backbone;

// Configure Backbone with jQuery
Backbone.$ = jQuery;

window.onerror = function (message, file, line) {
    var data = {
        prefix: 'JSERROR',
        errorMessage: message + ' in ' + file + ' on line ' + line + '. URL: ' + window.location.href + ' BROWSER: ' + navigator.userAgent
    };
    $.post('/logError', data);
};

$(function () {
    const surfApp = new SurfAppRouter();
    window.app = surfApp;

    Backbone.history.start();
    Communicator.initialize(surfApp);
});