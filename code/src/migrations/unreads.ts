import { Types } from 'mongoose';
import { MessageModel, UnreadMessageModel, UserModel, WaveModel } from '../MongooseModels.js';

// Only read operations are exposed: migration must never remove the Redis source.
export interface UnreadSource {
  scanIterator(options: { MATCH: string; COUNT: number }): AsyncIterable<string[]>;
  sScanIterator(key: string, options: { COUNT: number }): AsyncIterable<string[]>;
}

const objectId = /^[a-f\d]{24}$/i;
const batchSize = 500;

export async function migrateUnreads(
  source: UnreadSource,
  dryRun = false,
  progress: (stats: { sets: number; checked: number; verified: number }) => Promise<void> = async () => {},
) {
  const stats = { sets: 0, checked: 0, verified: 0 };

  // Explicitly create the uniqueness index even with autoIndex disabled in production.
  if (!dryRun) await UnreadMessageModel.createIndexes();

  for await (const keys of source.scanIterator({ MATCH: 'unread-*', COUNT: batchSize })) {
    for (const key of keys) {
      await progress(stats);
      const match = /^unread-([a-f\d]{24})-([a-f\d]{24})$/i.exec(key);
      if (!match) throw new Error(`Invalid unread key: ${key}`);
      const userId = new Types.ObjectId(match[1]);
      const waveId = new Types.ObjectId(match[2]);
      if (!await UserModel.exists({ _id: userId })) {
        throw new Error(`Missing user for ${key}`);
      }
      if (!await WaveModel.exists({ _id: waveId })) {
        throw new Error(`Missing wave for ${key}`);
      }

      for await (const members of source.sScanIterator(key, { COUNT: batchSize })) {
        // SCAN/SSCAN may repeat results, and COUNT is a hint rather than a limit.
        const unique = [...new Set(members)];
        for (let offset = 0; offset < unique.length; offset += batchSize) {
          await progress(stats);
          const ids = unique.slice(offset, offset + batchSize);
          if (ids.some(id => !objectId.test(id))) {
            throw new Error(`Invalid message ID in ${key}`);
          }
          const messages = await MessageModel.find({ _id: { $in: ids }, waveId })
            .select('_id waveId rootId parentId').lean().exec();
          if (messages.length !== ids.length) {
            throw new Error(`Missing message or wave mismatch in ${key}: ${ids.join(', ')}`);
          }

          const rows = [];
          for (const message of messages) {
            // Older replies may lack rootId. Walk their parents, never treat a reply
            // as its own root, otherwise the earliest unread thread is wrong.
            let ancestor = message;
            const visited = new Set<string>();
            while (!ancestor.rootId && ancestor.parentId) {
              const id = ancestor._id.toString();
              if (visited.has(id)) throw new Error(`Parent cycle for message ${message._id}`);
              visited.add(id);
              const parent = await MessageModel.findOne({ _id: ancestor.parentId, waveId })
                .select('_id waveId rootId parentId').lean().exec();
              if (!parent) throw new Error(`Missing parent for message ${message._id}`);
              ancestor = parent;
            }
            rows.push({ userId, waveId, messageId: message._id, rootId: ancestor.rootId ?? ancestor._id });
          }
          stats.checked += rows.length;
          if (dryRun) {
            await progress(stats);
            continue;
          }

          await UnreadMessageModel.bulkWrite(rows.map(row => ({
            updateOne: {
              filter: { userId: row.userId, messageId: row.messageId },
              update: { $setOnInsert: row },
              upsert: true,
            },
          })), { ordered: false, writeConcern: { w: 'majority' } });

          // Check every field. Existing conflicting records must not be silently
          // accepted, nor overwritten by a rerun.
          const verified = await UnreadMessageModel.countDocuments({ $or: rows }).exec();
          if (verified !== rows.length) {
            throw new Error(`Mongo verification failed for ${key}: expected ${rows.length}, found ${verified}`);
          }
          stats.verified += verified;
          await progress(stats);
        }
      }
      stats.sets++;
      await progress(stats);
      console.log(`Unread migration: ${stats.sets} sets, ${stats.checked} checked, ${stats.verified} verified`);
    }
  }
  return stats;
}
