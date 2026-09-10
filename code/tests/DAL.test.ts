import { afterEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import DAL from '../src/DAL.js';
import { MessageModel, UnreadMessageModel } from '../src/MongooseModels.js';
import { Message, User } from '../src/model/index.js';

describe('DAL', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('marks a saved reply as unread for a recipient but not its sender', async () => {
    const rootId = new Types.ObjectId();
    const parent = new MessageModel({
      parentId: rootId,
      rootId,
    });
    const sender = new User({ _id: new Types.ObjectId().toString() });
    const recipient = new User({ _id: new Types.ObjectId().toString() });
    const reply = new Message({
      userId: sender.id,
      waveId: new Types.ObjectId().toString(),
      parentId: parent._id.toString(),
      message: 'A reply to an existing thread',
    });

    vi.spyOn(MessageModel.prototype, 'save').mockResolvedValue(undefined as never);
    vi.spyOn(MessageModel, 'findById').mockResolvedValue(parent);
    // Database updates do not mutate the document passed to calcRootId.
    vi.spyOn(MessageModel, 'updateMany').mockReturnValue({
      exec: vi.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 }),
    } as never);
    const createUnread = vi.spyOn(UnreadMessageModel, 'create')
      .mockResolvedValue(undefined as never);

    await DAL.saveMessage(reply);
    await DAL.addUnreadMessage(sender, reply);
    expect(createUnread).not.toHaveBeenCalled();

    await DAL.addUnreadMessage(recipient, reply);

    expect(createUnread).toHaveBeenCalledExactlyOnceWith({
      userId: new Types.ObjectId(recipient.id),
      waveId: new Types.ObjectId(reply.waveId),
      messageId: new Types.ObjectId(reply.id),
      rootId,
    });
    expect(reply.rootId).toBe(rootId.toString());
  });
});
