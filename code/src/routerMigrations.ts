import { timingSafeEqual } from 'node:crypto';
import { Router, json } from 'express';
import { unreadMigrationJob } from './migrations/UnreadMigrationJob.js';

const router = Router();

router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  const token = process.env.UNREAD_MIGRATION_TOKEN;
  if (!token) {
    res.sendStatus(404);
    return;
  }
  const expected = Buffer.from(`Bearer ${token}`);
  const actual = Buffer.from(req.headers.authorization || '');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    res.sendStatus(401);
    return;
  }
  next();
});

router.get('/', async (_req, res) => {
  try {
    res.json(await unreadMigrationJob.status());
  } catch {
    res.status(503).json({ error: 'Migration status unavailable' });
  }
});

router.post('/', json({ limit: '1kb' }), async (req, res) => {
  if (req.body?.offline !== true ||
      (req.body.dryRun !== undefined && typeof req.body.dryRun !== 'boolean')) {
    res.status(400).json({ error: 'Confirm no active users or old servers with { "offline": true, "dryRun": false }' });
    return;
  }
  if (!process.env.REDISCLOUD_URL) {
    res.status(503).json({ error: 'REDISCLOUD_URL is required on the server' });
    return;
  }
  try {
    const started = await unreadMigrationJob.start(req.body.dryRun === true);
    res.status(started ? 202 : 409).json({
      status: started ? 'accepted' : 'already_running_or_completed',
      statusUrl: '/admin/migrations/unreads',
    });
  } catch {
    res.status(503).json({ error: 'Could not start unread migration' });
  }
});

export default router;
