import type { DataAccessLayer } from './DAL.js';
import type { SurfServerInterface } from './SurfServer.js';

let _dal: DataAccessLayer | undefined;
let _server: SurfServerInterface | undefined;

/**
 * Service registry populated at boot. Lets the model layer reach back into the
 * DAL and the server without importing them (which would cycle), and replaces
 * the per-call `await import(...)` pattern with a static dependency.
 */
export const Registry = {
  init(dal: DataAccessLayer, server: SurfServerInterface): void {
    _dal = dal;
    _server = server;
  },
  get dal(): DataAccessLayer {
    if (!_dal) throw new Error('Registry not initialized');
    return _dal;
  },
  get server(): SurfServerInterface {
    if (!_server) throw new Error('Registry not initialized');
    return _server;
  },
};
