/* eslint-env node */
var SurfServer = require('./code/SurfServer');

var shutdown = async function () {
    await SurfServer.shutdown();
    process.exit();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

SurfServer.init();
