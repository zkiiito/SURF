# Migrate unread markers through the server endpoint

The deployed SURF server copies `unread-<userId>-<waveId>` sets from Redis to
MongoDB. No local database connection or migration CLI is needed. Run it at night
when nobody is using SURF, before users access the Mongo-backed version.

## Deployment and invocation

1. Back up Redis and MongoDB. Keep the old Redis service and volume available;
   the new compose file no longer starts Redis. Stop old SURF instances so they
   cannot write new unread state to Redis.
2. Set `REDISCLOUD_URL` on the new server to the old Redis endpoint, including
   its database number. Set `UNREAD_MIGRATION_TOKEN` to a long random secret.
   MongoDB uses the server's existing `MONGOLAB_URI` or `DB_URI` configuration.
3. Deploy the new version with **one SURF instance**, during the inactive period.
   Keep users off the app until migration completes. The job temporarily rejects
   new socket connections and socket events on the executing instance; it cannot
   stop old servers, already executing handlers, or another instance. The
   `offline: true` field acknowledges that you have arranged an inactive period.
4. Call the HTTPS endpoint with the secret in the Authorization header. Set
   `SURF_URL` to the deployed server URL and `UNREAD_MIGRATION_TOKEN` in the
   calling shell or HTTP client. First validate the source, then migrate:

   ```sh
   curl --fail-with-body -X POST "$SURF_URL/admin/migrations/unreads" \
     -H "Authorization: Bearer $UNREAD_MIGRATION_TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{"offline":true,"dryRun":true}'
   ```

   POST returns `202` immediately. The work runs on the server independently of
   the request. Poll status until it reports `validated` or `failed`:

   ```sh
   curl --fail-with-body "$SURF_URL/admin/migrations/unreads" \
     -H "Authorization: Bearer $UNREAD_MIGRATION_TOKEN"
   ```

   After a successful dry run, start the actual copy:

   ```sh
   curl --fail-with-body -X POST "$SURF_URL/admin/migrations/unreads" \
     -H "Authorization: Bearer $UNREAD_MIGRATION_TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{"offline":true}'
   ```

5. Poll until `status` is `completed`. Check `stats.checked`, `stats.verified`
   and `stats.sets`, then check unread counts and an unread reply in an old thread
   in the application. Remove `UNREAD_MIGRATION_TOKEN` from server configuration
   to disable the endpoint. Redis backups can be kept for recovery.

GET and POST return 404 without a configured token, and 401 for a missing or wrong
Bearer token. The endpoint does not use login sessions. Never put the token in a
URL. Sessions and link-preview caches are not migrated; users sign in again.

## Verification, failures and retries

The job uses SCAN/SSCAN, writes at most 500 markers per Mongo batch, and verifies
each marker's user, wave, message and root. Redis is never modified. Existing Mongo
markers are preserved. Legacy replies without `rootId` resolve through their parents.
Dry runs validate source data without writing unread markers, but do update job
status in MongoDB. Scan duplicates can increase totals, which count processed records.

Malformed or missing source data, conflicting Mongo markers, and database errors
set `status: failed`. Inspect `error`, fix the issue, then POST again while users
remain inactive. An empty source fails the actual migration rather than permanently
marking a potentially wrong Redis endpoint as migrated. If every message is already
read and there are truly no unread sets, no unread copy is necessary.

A Mongo record in `migrations` coordinates requests. Another POST gets 409 while a
job is running, and completed jobs always return 409, including after server
restarts. This prevents an accidental rerun from restoring already-read markers.
The lock is renewed as batches progress. If the process crashes, wait five minutes
after its last progress update before retrying. The next job restarts the scan;
upserts prevent duplicates. Do not redeploy or scale the server during the job.

The `redis` npm dependency is used only by the migration job. Normal application
traffic uses MongoDB. Do not roll back to the old Redis-backed application after
the new version accepts traffic without reconciling the newer Mongo unread state.
