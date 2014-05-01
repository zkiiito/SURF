var Minify = require('./code/Minify'),
    WaveServer = require('./code/WaveServer'),
    Config = require('./code/Config');

if (Config.nodetimeKey) {
    require('nodetime').profile({
        accountKey: Config.nodetimeKey,
        appName: 'surf'
    });
}

Minify.minify();
WaveServer.init();