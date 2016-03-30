var SurfServer = require('./code/SurfServer');

var shutdown = function () {
    SurfServer.shutdown(function () {
        process.exit();
    });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

SurfServer.init();
