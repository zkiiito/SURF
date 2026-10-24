import mongoose from 'mongoose';
import { createClient } from 'redis';
import { migrateUnreads } from './unreads.js';

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--dry-run' && arg !== '--offline')) {
    throw new Error('Usage: npm run migrate:unreads -- --offline [--dry-run]');
  }
  if (!args.includes('--offline')) {
    throw new Error('Stop every SURF server using either database, then pass --offline. See UNREAD_MIGRATION.md.');
  }
  const redisUrl = process.env.REDISCLOUD_URL;
  const mongoUrl = process.env.MONGOLAB_URI || process.env.DB_URI;
  if (!redisUrl || !mongoUrl) {
    throw new Error('Set REDISCLOUD_URL and MONGOLAB_URI (or DB_URI) explicitly.');
  }

  const redis = createClient({
    url: redisUrl,
    socket: { connectTimeout: 10_000, reconnectStrategy: false },
  });
  // Do not log client errors or connection URLs, which can contain credentials.
  redis.on('error', () => console.error('Redis connection error'));
  try {
    // Disable automatic collection/index creation so dry-run cannot write to Mongo.
    await mongoose.connect(mongoUrl, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10_000 });
    await redis.connect();
    const dryRun = args.includes('--dry-run');
    const stats = await migrateUnreads(redis, dryRun);
    console.log(`${dryRun ? 'Dry run' : 'Migration'} complete: ${JSON.stringify(stats)}`);
    if (stats.sets === 0) console.warn('No unread sets found. Check the Redis endpoint and database number before deploying.');
  } finally {
    if (redis.isOpen) redis.destroy();
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  // Driver errors may include credentials. Only show our own validation errors.
  const message = error instanceof Error && error.constructor === Error
    ? error.message : 'Database operation failed. Check connectivity, permissions and source data.';
  console.error(`Unread migration failed: ${message}`);
  process.exitCode = 1;
});
