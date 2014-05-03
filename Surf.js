var Minify = require('./code/Minify'),
    SurfServer = require('./code/SurfServer'),
    Config = require('./code/Config');

if (Config.nodetimeKey) {
    require('nodetime').profile({
        accountKey: Config.nodetimeKey,
        appName: 'surf'
    });
}

Minify.minify();
SurfServer.init();