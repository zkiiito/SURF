# Migrate unread markers from Redis to MongoDB

Run this before starting the Mongo-backed SURF version from PR #660. It copies
`unread-<userId>-<waveId>` sets into `unreadmessagemodels`, including the thread
root needed for unread pagination. It never deletes or modifies Redis data.
Sessions and link-preview caches are not migrated. Users will need to sign in again.

## Deployment

1. Build the new version separately with `npm ci` and `npm run build`.
2. Stop **all** old and new SURF instances and disable automatic restarts. Keep
   Redis and MongoDB running. No server may send messages or mark messages read
   until migration finishes. `--offline` acknowledges this requirement; the script
   cannot check whether servers are stopped.
3. Back up Redis and MongoDB. Keep the Redis service, persistence and credentials
   until the migration and the deployed application have been checked. The new
   compose file no longer starts Redis; do not remove its old container or volume
   before migration. Run the command from a host/container that can reach both DBs.
4. Export `REDISCLOUD_URL` with the old Redis endpoint **and database number**,
   and `MONGOLAB_URI` or `DB_URI` with the application's existing MongoDB database.
   There are deliberately no default endpoints. Use your secret manager or shell
   environment to provide credentials.
5. Validate without writing, then copy and verify:

   ```sh
   npm run migrate:unreads -- --offline --dry-run
   npm run migrate:unreads -- --offline
   ```

6. Only start the new application after the command exits with status 0 and
   reports `Migration complete`. Check unread counts and an unread reply in an
   older thread. Keep the Redis backup for recovery.

The command uses SCAN and SSCAN and writes at most 500 markers per Mongo batch.
It creates the unread indexes, upserts by user/message, and checks each batch's
user, wave, message and root against MongoDB. Existing markers are preserved.
Repeated scan results can increase the printed totals, which count processed
records rather than distinct markers. A warning about zero sets requires checking
the source endpoint and database number; it can also mean everyone has read everything.

## Failures and retries

A missing user, wave, message or parent, malformed ID, wrong Redis value type,
conflicting Mongo marker, or failed DB operation stops the command with a nonzero
exit status. Inspect and resolve the reported source-data problem before retrying;
the script does not silently discard stale markers. Partial copies are safe to
retry while the application remains stopped. Redis is unchanged, and upserts do
not create duplicate markers. Legacy replies without `rootId` resolve through
their parent chain; missing parents and cycles are errors.

Do not rerun after users have used the new version: Redis still contains the old
snapshot, so rerunning could make already-read messages unread again. If migration
fails before cutover, you can instead restart the old version using the unchanged
Redis data. Once the new version accepts traffic, returning to the old version
requires reconciling the new Mongo unread state; the Redis snapshot is then stale.

The `redis` npm dependency is retained for this standalone migration only. The
application server does not connect to Redis.
