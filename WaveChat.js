if (process.env.NODETIME_ACCOUNT_KEY) {
    require('nodetime').profile({
        accountKey: process.env.NODETIME_ACCOUNT_KEY,
        appName: 'surf' // optional
    });
}
require('newrelic');

var Minify = require('./code/Minify'),
    WaveServer = require('./code/WaveServer');

Minify.minify();
WaveServer.init();