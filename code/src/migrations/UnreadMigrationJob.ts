import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import { migrateUnreads } from './unreads.js';

interface MigrationState {
  _id: string;
  status: 'running' | 'completed' | 'validated' | 'failed';
  owner: string;
  dryRun: boolean;
  leaseUntil: Date;
  startedAt: Date;
  finishedAt?: Date;
  stats: { sets: number; checked: number; verified: number };
  error?: string;
}

const migrationId = 'redis-unreads-v1';
const leaseMs = 5 * 60 * 1000;
const states = () => mongoose.connection.collection<MigrationState>('migrations');

export class UnreadMigrationJob {
  running = false;

  async status() {
    const state = await states().findOne({ _id: migrationId });
    if (!state) return { status: 'not_started' };
    const { owner, _id, ...result } = state;
    return result;
  }

  async start(dryRun: boolean): Promise<boolean> {
    if (this.running) return false;
    const redisUrl = process.env.REDISCLOUD_URL;
    if (!redisUrl) throw new Error('REDISCLOUD_URL is required on the server');
    const owner = randomUUID();
    const now = new Date();
    try {
      // The fixed _id makes simultaneous requests collide. Completed migrations
      // cannot be started again, even after a deploy or process restart.
      await states().updateOne({
        _id: migrationId,
        status: { $ne: 'completed' },
        $or: [{ status: { $ne: 'running' } }, { leaseUntil: { $lte: now } }],
      }, {
        $set: {
          status: 'running', owner, dryRun, startedAt: now,
          leaseUntil: new Date(now.getTime() + leaseMs),
          stats: { sets: 0, checked: 0, verified: 0 },
        },
        $unset: { error: '', finishedAt: '' },
      }, { upsert: true, writeConcern: { w: 'majority' } });
    } catch (error) {
      if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) return false;
      throw error;
    }
    this.running = true;
    // Finish independently of the HTTP request so a proxy timeout/client disconnect
    // does not interrupt the migration. The caller polls the persisted status.
    void this.run(redisUrl, owner, dryRun).finally(() => { this.running = false; });
    return true;
  }

  private async run(redisUrl: string, owner: string, dryRun: boolean) {
    let redis: ReturnType<typeof createClient> | undefined;
    try {
      redis = createClient({
        url: redisUrl,
        socket: { connectTimeout: 10_000, reconnectStrategy: false },
      });
      redis.on('error', () => console.error('Unread migration Redis connection error'));
      await redis.connect();
      const stats = await migrateUnreads(redis, dryRun, async stats => {
        const now = new Date();
        const result = await states().updateOne({
          _id: migrationId, owner, status: 'running', leaseUntil: { $gt: now },
        }, { $set: { stats: { ...stats }, leaseUntil: new Date(now.getTime() + leaseMs) } });
        if (result.matchedCount !== 1) throw new Error('Migration lock expired or was lost');
      });
      if (!dryRun && stats.sets === 0) throw new Error('No unread sets found. Check the Redis endpoint and database number.');
      const result = await states().updateOne({
        _id: migrationId, owner, status: 'running', leaseUntil: { $gt: new Date() },
      }, { $set: { status: dryRun ? 'validated' : 'completed', stats, finishedAt: new Date() } },
      { writeConcern: { w: 'majority' } });
      if (result.matchedCount !== 1) throw new Error('Migration lock expired or was lost');
    } catch (error) {
      // Never return raw driver errors, which can contain DB credentials.
      const message = error instanceof Error && error.constructor === Error
        ? error.message : 'Database operation failed. Check connectivity, permissions and source data.';
      try {
        await states().updateOne({ _id: migrationId, owner, status: 'running' }, {
          $set: { status: 'failed', error: message, finishedAt: new Date() },
        });
      } catch {
        console.error('Could not persist unread migration failure; retry after the lease expires');
      }
    } finally {
      if (redis?.isOpen) redis.destroy();
    }
  }
}

export const unreadMigrationJob = new UnreadMigrationJob();
