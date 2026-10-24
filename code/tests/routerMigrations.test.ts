import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import router from '../src/routerMigrations.js';
import { unreadMigrationJob } from '../src/migrations/UnreadMigrationJob.js';

let server: http.Server;
let url: string;
const headers = { Authorization: 'Bearer test-secret', 'Content-Type': 'application/json' };

beforeAll(async () => {
  const app = express();
  app.use('/admin/migrations/unreads', router);
  server = http.createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/admin/migrations/unreads`;
});
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => {
  vi.stubEnv('UNREAD_MIGRATION_TOKEN', 'test-secret');
  vi.stubEnv('REDISCLOUD_URL', 'redis://test-only');
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('unread migration endpoint', () => {
  it('is disabled without a configured operator token', async () => {
    vi.stubEnv('UNREAD_MIGRATION_TOKEN', '');
    expect((await fetch(url, { headers })).status).toBe(404);
  });
  it('rejects missing, wrong and query-string tokens', async () => {
    expect((await fetch(url)).status).toBe(401);
    expect((await fetch(url, { headers: { Authorization: 'Bearer wrong' } })).status).toBe(401);
    expect((await fetch(url + '?token=test-secret')).status).toBe(401);
  });
  it('returns persisted progress to an authorized operator', async () => {
    vi.spyOn(unreadMigrationJob, 'status').mockResolvedValue({ status: 'not_started' });
    const response = await fetch(url, { headers });
    expect(await response.json()).toEqual({ status: 'not_started' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('requires an explicit inactive-period acknowledgement and boolean dryRun', async () => {
    const start = vi.spyOn(unreadMigrationJob, 'start');
    for (const body of [{}, { offline: false }, { offline: true, dryRun: 'false' }]) {
      expect((await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })).status).toBe(400);
    }
    expect(start).not.toHaveBeenCalled();
  });
  it.each([true, false])('accepts a background job with dryRun=%s', async dryRun => {
    const start = vi.spyOn(unreadMigrationJob, 'start').mockResolvedValue(true);
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ offline: true, dryRun }) });
    expect(response.status).toBe(202);
    expect(start).toHaveBeenCalledWith(dryRun);
    expect((await response.json()).statusUrl).toBe('/admin/migrations/unreads');
  });
  it('rejects an already running or completed migration', async () => {
    vi.spyOn(unreadMigrationJob, 'start').mockResolvedValue(false);
    expect((await fetch(url, { method: 'POST', headers, body: '{"offline":true}' })).status).toBe(409);
  });
  it('requires the Redis URL on the deployed server', async () => {
    vi.stubEnv('REDISCLOUD_URL', '');
    const start = vi.spyOn(unreadMigrationJob, 'start');
    expect((await fetch(url, { method: 'POST', headers, body: '{"offline":true}' })).status).toBe(503);
    expect(start).not.toHaveBeenCalled();
  });
  it('does not expose database error details', async () => {
    vi.spyOn(unreadMigrationJob, 'start').mockRejectedValue(new Error('secret DB URL'));
    const response = await fetch(url, { method: 'POST', headers, body: '{"offline":true}' });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('secret');
  });
});
