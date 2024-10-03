/* eslint-env node */
import SurfServer from './code/SurfServer.js';

var shutdown = async function () {
    await SurfServer.shutdown();
    process.exit();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

SurfServer.init();
