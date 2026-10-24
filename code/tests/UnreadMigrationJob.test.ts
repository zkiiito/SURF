import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { UnreadMigrationJob } from '../src/migrations/UnreadMigrationJob.js';
import { migrateUnreads } from '../src/migrations/unreads.js';

const redis = vi.hoisted(() => ({ connect: vi.fn(), destroy: vi.fn(), on: vi.fn(), isOpen: true }));
vi.mock('redis', () => ({ createClient: () => redis }));
vi.mock('../src/migrations/unreads.js', () => ({ migrateUnreads: vi.fn() }));
const stats = { sets: 1, checked: 4, verified: 4 };

function setup() {
  const collection = { updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 }), findOne: vi.fn() };
  vi.spyOn(mongoose.connection, 'collection').mockReturnValue(collection as never);
  const job = new UnreadMigrationJob();
  return { job, collection };
}

beforeEach(() => {
  vi.stubEnv('REDISCLOUD_URL', 'redis://test-only');
  redis.connect.mockResolvedValue(undefined);
  vi.mocked(migrateUnreads).mockResolvedValue(stats);
});
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllEnvs(); });

describe('server unread migration job', () => {
  it('persists completion and closes only its own Redis client', async () => {
    const { job, collection } = setup();
    expect(await job.start(false)).toBe(true);
    await vi.waitFor(() => expect(job.running).toBe(false));
    expect(collection.updateOne.mock.calls[0][0]).toMatchObject({
      _id: 'redis-unreads-v1', status: { $ne: 'completed' },
    });
    expect(collection.updateOne.mock.calls[1][1].$set).toMatchObject({ status: 'completed', stats });
    expect(redis.destroy).toHaveBeenCalledOnce();
  });

  it('leaves a dry run eligible for the real migration', async () => {
    const { job, collection } = setup();
    await job.start(true);
    await vi.waitFor(() => expect(job.running).toBe(false));
    expect(collection.updateOne.mock.calls[1][1].$set.status).toBe('validated');
    expect(migrateUnreads).toHaveBeenCalledWith(redis, true, expect.any(Function));
  });

  it('rejects a running or completed job when the unique Mongo record collides', async () => {
    const { job, collection } = setup();
    collection.updateOne.mockRejectedValueOnce(new mongoose.mongo.MongoServerError({ code: 11000 }));
    expect(await job.start(false)).toBe(false);
    expect(migrateUnreads).not.toHaveBeenCalled();
  });

  it('rejects another request on the same process while running', async () => {
    const { job } = setup();
    job.running = true;
    expect(await job.start(false)).toBe(false);
    expect(migrateUnreads).not.toHaveBeenCalled();
  });

  it('records failure and permits a subsequent retry', async () => {
    const { job, collection } = setup();
    vi.mocked(migrateUnreads).mockRejectedValueOnce(new Error('Missing message'));
    await job.start(false);
    await vi.waitFor(() => expect(job.running).toBe(false));
    expect(collection.updateOne.mock.calls[1][1].$set).toMatchObject({ status: 'failed', error: 'Missing message' });
    expect(await job.start(false)).toBe(true);
    await vi.waitFor(() => expect(job.running).toBe(false));
    expect(collection.updateOne.mock.calls[3][1].$set.status).toBe('completed');
  });

  it('renews the lease with progress and stops when ownership is lost', async () => {
    const { job, collection } = setup();
    collection.updateOne.mockResolvedValueOnce({ matchedCount: 1 }).mockResolvedValueOnce({ matchedCount: 0 });
    vi.mocked(migrateUnreads).mockImplementationOnce(async (_source, _dryRun, progress) => {
      await progress!(stats);
      return stats;
    });
    await job.start(false);
    await vi.waitFor(() => expect(job.running).toBe(false));
    expect(collection.updateOne.mock.calls[1][0]).toMatchObject({ status: 'running', owner: expect.any(String) });
    expect(collection.updateOne.mock.calls[2][1].$set).toMatchObject({ status: 'failed', error: 'Migration lock expired or was lost' });
  });

  it('does not permanently complete an empty-source migration', async () => {
    const { job, collection } = setup();
    vi.mocked(migrateUnreads).mockResolvedValueOnce({ sets: 0, checked: 0, verified: 0 });
    await job.start(false);
    await vi.waitFor(() => expect(job.running).toBe(false));
    expect(collection.updateOne.mock.calls[1][1].$set.status).toBe('failed');
  });

  it('omits lock ownership from the status response', async () => {
    const { job, collection } = setup();
    collection.findOne.mockResolvedValue({ _id: 'redis-unreads-v1', owner: 'secret', status: 'running', stats });
    expect(await job.status()).toEqual({ status: 'running', stats });
  });
});
