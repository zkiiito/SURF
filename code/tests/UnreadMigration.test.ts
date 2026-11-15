import { afterEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { MessageModel, UnreadMessageModel, UserModel, WaveModel } from '../src/MongooseModels.js';
import { migrateUnreads, type UnreadSource } from '../src/migrations/unreads.js';

const userId = new Types.ObjectId();
const waveId = new Types.ObjectId();
const rootId = new Types.ObjectId();
const replyId = new Types.ObjectId();
const key = `unread-${userId}-${waveId}`;
const row = { userId, waveId, messageId: replyId, rootId };
const query = (value: unknown) => ({
  select: () => ({ lean: () => ({ exec: async () => value }) }),
} as never);

function setup(messages = [{ _id: replyId, waveId, rootId, parentId: rootId }]) {
  const source: UnreadSource = {
    async *scanIterator() { yield [key]; },
    async *sScanIterator() { yield [replyId.toString()]; },
  };
  vi.spyOn(UserModel, 'exists').mockResolvedValue({ _id: userId });
  vi.spyOn(WaveModel, 'exists').mockResolvedValue({ _id: waveId });
  vi.spyOn(MessageModel, 'find').mockReturnValue(query(messages));
  const indexes = vi.spyOn(UnreadMessageModel, 'createIndexes').mockResolvedValue([]);
  const write = vi.spyOn(UnreadMessageModel, 'bulkWrite').mockResolvedValue({} as never);
  const count = vi.spyOn(UnreadMessageModel, 'countDocuments').mockReturnValue({
    exec: async () => 1,
  } as never);
  return { source, indexes, write, count };
}

describe('Redis unread migration', () => {
  afterEach(() => vi.restoreAllMocks());

  it('copies replies with their thread root and verifies all fields', async () => {
    const { source, indexes, write, count } = setup();
    expect(await migrateUnreads(source)).toEqual({ sets: 1, checked: 1, verified: 1 });
    expect(indexes).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledExactlyOnceWith([{
      updateOne: {
        filter: { userId, messageId: replyId },
        update: { $setOnInsert: row },
        upsert: true,
      },
    }], { ordered: false, writeConcern: { w: 'majority' } });
    expect(count).toHaveBeenCalledWith({ $or: [row] });
  });

  it('validates a dry run without creating indexes or writing', async () => {
    const { source, indexes, write, count } = setup();
    expect(await migrateUnreads(source, true)).toEqual({ sets: 1, checked: 1, verified: 0 });
    expect(indexes).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
  });

  it('resolves a legacy nested reply through its parents', async () => {
    const parentId = new Types.ObjectId();
    const { source, write } = setup([{ _id: replyId, waveId, rootId: null as never, parentId }]);
    vi.spyOn(MessageModel, 'findOne')
      .mockReturnValueOnce(query({ _id: parentId, waveId, rootId: null, parentId: rootId }))
      .mockReturnValueOnce(query({ _id: rootId, waveId, rootId: null, parentId: null }));
    await migrateUnreads(source);
    expect(write.mock.calls[0][0][0]).toMatchObject({ updateOne: { update: { $setOnInsert: row } } });
  });

  it.each(['parent missing', 'parent cycle'])('rejects an unread reply with %s', async problem => {
    const reply = { _id: replyId, waveId, rootId: null as never, parentId: replyId };
    const { source, write } = setup([reply]);
    vi.spyOn(MessageModel, 'findOne').mockReturnValue(query(problem === 'parent missing' ? null : reply));
    await expect(migrateUnreads(source)).rejects.toThrow(problem === 'parent missing' ? 'Missing parent' : 'Parent cycle');
    expect(write).not.toHaveBeenCalled();
  });

  it('fails rather than dropping missing messages or messages from another wave', async () => {
    const { source, write } = setup([]);
    await expect(migrateUnreads(source)).rejects.toThrow('Missing message or wave mismatch');
    expect(MessageModel.find).toHaveBeenCalledWith({ _id: { $in: [replyId.toString()] }, waveId });
    expect(write).not.toHaveBeenCalled();
  });

  it.each(['user', 'wave'])('fails when the source %s is missing', async kind => {
    const { source, write } = setup();
    vi.mocked(kind === 'user' ? UserModel.exists : WaveModel.exists).mockResolvedValue(null);
    await expect(migrateUnreads(source)).rejects.toThrow(`Missing ${kind}`);
    expect(write).not.toHaveBeenCalled();
  });

  it('rejects malformed keys and message IDs', async () => {
    const { source, write } = setup();
    source.scanIterator = async function* () { yield ['unread-invalid']; };
    await expect(migrateUnreads(source)).rejects.toThrow('Invalid unread key');
    source.scanIterator = async function* () { yield [key]; };
    source.sScanIterator = async function* () { yield ['not-an-object-id']; };
    await expect(migrateUnreads(source)).rejects.toThrow('Invalid message ID');
    expect(write).not.toHaveBeenCalled();
  });

  it('handles duplicate scan results and reruns without replacing existing data', async () => {
    const { source, write } = setup();
    source.scanIterator = async function* () { yield [key, key]; };
    source.sScanIterator = async function* () { yield [replyId.toString(), replyId.toString()]; };
    await migrateUnreads(source);
    await migrateUnreads(source);
    expect(write).toHaveBeenCalledTimes(4);
    for (const [operations] of write.mock.calls) {
      expect(operations).toHaveLength(1);
      expect(operations[0]).toMatchObject({ updateOne: { update: { $setOnInsert: row }, upsert: true } });
    }
  });

  it('fails if a Mongo record is missing or conflicts after writing', async () => {
    const { source, count } = setup();
    count.mockReturnValue({ exec: async () => 0 } as never);
    await expect(migrateUnreads(source)).rejects.toThrow('Mongo verification failed');
  });

  it('can resume after a failed write using the unchanged Redis source', async () => {
    const { source, write } = setup();
    write.mockRejectedValueOnce(new Error('write failed'));
    await expect(migrateUnreads(source)).rejects.toThrow('write failed');
    expect(await migrateUnreads(source)).toEqual({ sets: 1, checked: 1, verified: 1 });
  });

  it('handles an empty source', async () => {
    const { source, write } = setup();
    source.scanIterator = async function* () { yield []; };
    expect(await migrateUnreads(source)).toEqual({ sets: 0, checked: 0, verified: 0 });
    expect(write).not.toHaveBeenCalled();
  });
});
