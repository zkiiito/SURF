/* eslint-env node */
import SurfServer from './code/dist/SurfServer.js';

const shutdown = async function () {
  await SurfServer.shutdown();
  process.exit();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

SurfServer.init();
