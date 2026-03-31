import mongoose, { Types } from 'mongoose';
import redis from './RedisClient.js';
import Config from './Config.js';
import { UserModel, WaveModel, MessageModel, WaveInviteModel } from './MongooseModels.js';
import { User, Wave, Message, Collection } from './model/index.js';
import type { MessageData, MessageDocument } from './types.js';
import type { SurfServerInterface } from './SurfServer.js';

/**
 * Data Access Layer for MongoDB and Redis operations
 */
class DataAccessLayer {
  /**
   * Initialize database connections and load data
   */
  async init(server: SurfServerInterface): Promise<void> {
    mongoose.set('debug', Config.mongoDebug);
    await Promise.all([mongoose.connect(Config.mongoUrl), redis.connect()]);

    const users = await UserModel.find().exec();

    const userInstances = users.map((user) => {
      const u = new User({
        name: user.name,
        avatar: user.avatar,
        _id: user._id.toString(),
        email: user.email,
        googleId: user.googleId,
        googleAvatar: user.googleAvatar,
      });
      return u;
    });
    
    for (const user of userInstances) {
      server.users.add(user);
    }

    const waves = await WaveModel.find().sort('_id').exec();
    for (const wave of waves) {
      const w = new Wave({
        title: wave.title,
        userIds: wave.userIds.map(id => id.toString()),
        _id: wave._id.toString(),
      });
      server.waves.add(w);
    }

    // Initialize wave users after all waves and users are loaded
    for (const wave of server.waves) {
      await wave.initializeUsers();
    }

    server.startServer();

    // Temporary fix: delete all unread, if user has more than 1000
    await Promise.all(users.map(async (user) => {
      const unreadKeys = await redis.keys('unread-' + user._id + '-*');
      await Promise.all(unreadKeys.map(async (key) => {
        const msgCount = await redis.sCard(key);
        if (msgCount > 1000) {
          console.log('deleteTooMuchUnread: ' + key + ' : ' + msgCount);
          await redis.del(key);
        }
      }));
    }));
  }

  /**
   * Save a user to the database
   */
  async saveUser(user: User): Promise<void> {
    const data = {
      name: user.name,
      avatar: user.avatar,
      googleId: user.googleId,
      googleAvatar: user.googleAvatar,
      email: user.email,
    };

    if (user.isNew()) {
      const m = new UserModel(data);
      user.setId(m._id.toString());
      await m.save();
    } else {
      await UserModel.updateOne({ _id: user.id }, data).exec();
    }
  }

  /**
   * Save a wave to the database
   */
  async saveWave(wave: Wave): Promise<void> {
    const data = {
      title: wave.title,
      userIds: [...new Set(wave.userIds)].map(id => new Types.ObjectId(id)),
    };

    if (wave.isNew()) {
      const m = new WaveModel(data);
      wave.setId(m._id.toString());
      await m.save();
    } else {
      await WaveModel.updateOne({ _id: wave.id }, data).exec();
    }
  }

  /**
   * Save a message to the database
   */
  async saveMessage(message: Message): Promise<void> {
    const m = new MessageModel({
      userId: new Types.ObjectId(message.userId),
      waveId: new Types.ObjectId(message.waveId),
      parentId: message.parentId ? new Types.ObjectId(message.parentId) : null,
      message: message.message,
      created_at: new Date(message.created_at),
    });

    if (message.parentId === null) {
      m.rootId = m._id;
      await m.save();
    } else {
      await m.save();
      await this.calcRootId(message.parentId, [m]);
    }

    message.setId(m._id.toString());
  }

  /**
   * Calculate root ID recursively for message threading
   */
  async calcRootId(
    messageId: string, 
    messages: MessageDocument[]
  ): Promise<string | null> {
    const message = await MessageModel.findById(messageId);
    if (!message) return null;

    // If knows root element, or IS a root element
    if (message.rootId !== null || message.parentId === null) {
      let rootId: Types.ObjectId | null = null;

      if (message.rootId !== null) {
        rootId = message.rootId;
      } else if (message.parentId === null) {
        rootId = message._id;
        messages.push(message);
      }

      if (rootId) {
        await MessageModel.updateMany(
          { _id: { $in: messages.map(msg => msg._id) } },
          { rootId }
        ).exec();
      }

      return rootId?.toString() ?? null;
    } else {
      messages.push(message);
      return this.calcRootId(message.parentId.toString(), messages);
    }
  }

  /**
   * Get last messages for user across all their waves
   */
  async getLastMessagesForUser(
    user: User,
    callbackWithMessages: (err: Error | null, msgs: MessageData[], waveId: string) => void
  ): Promise<void> {
    const startTime = Date.now();
    let msgCount = 0;

    for (const wave of user.waves) {
      const results = await this.getLastMessagesForUserInWave(user, wave);
      msgCount += results.length;
      callbackWithMessages(null, results, wave.id);
    }

    const allTime = Date.now() - startTime;

    console.log('QUERY LastMessagesForUser: msg query in ' + allTime);
    console.log('QUERY LastMessagesForUser: msgs: ' + msgCount);
  }

  /**
   * Get unread messages for a user in a specific wave
   */
  async getLastMessagesForUserInWave(user: User, wave: Wave): Promise<MessageData[]> {
    console.log('QUERY getLastMessagesForUserInWave: ' + wave.id);
    const { minRootId, unreadIds } = await this.getMinUnreadRootIdForUserInWave(user, wave);

    const newMinRootId = await this.getMinRootIdForWave(wave, minRootId, null);
    return this.getMessagesForUserInWave(wave, newMinRootId, null, unreadIds);
  }

  /**
   * Get minimum unread root ID for a user in a wave
   */
  async getMinUnreadRootIdForUserInWave(
    user: User, 
    wave: Wave
  ): Promise<{ minRootId: string | null; unreadIds: string[] }> {
    const defaultResult = {
      minRootId: null,
      unreadIds: [] as string[],
    };

    try {
      const unreadIds = await this.getUnreadIdsForUserInWave(user, wave);
      if (unreadIds.length === 0) {
        return defaultResult;
      }
      console.log('QUERY getMinUnreadRootIdForUserInWave: ' + wave.id + ' count: ' + unreadIds.length);

      const startTime = Date.now();

      const message = await MessageModel.findOne({ waveId: wave.id })
        .where('_id').in(unreadIds)
        .select('rootId')
        .sort('rootId')
        .limit(1)
        .exec();

      const endTime = Date.now();
      console.log('QUERY getMinUnreadRootIdForUserInWave: ' + wave.id + ' query in ' + (endTime - startTime));

      if (!message) {
        return defaultResult;
      }

      return {
        minRootId: message.rootId?.toString() ?? null,
        unreadIds,
      };
    } catch (err) {
      return defaultResult;
    }
  }

  /**
   * Get unread message IDs for a user in a wave (from Redis)
   */
  async getUnreadIdsForUserInWave(user: User, wave: Wave): Promise<string[]> {
    const startTime = Date.now();
    const key = 'unread-' + user.id + '-' + wave.id;
    const results = await redis.sMembers(key);
    const endTime = Date.now();
    console.log('QUERY getUnreadIdsForUserInWave: ' + wave.id + ' query in ' + (endTime - startTime));
    return results;
  }

  /**
   * Get minimum root ID for pagination
   */
  async getMinRootIdForWave(
    wave: Wave, 
    minRootId: string | null, 
    maxRootId: string | null
  ): Promise<string | null> {
    console.log('QUERY getMinRootIdForWave: ' + wave.id);
    if (minRootId === null && maxRootId !== null) {
      minRootId = maxRootId;
    }

    const count = await this.countMessagesInRange(wave, minRootId, maxRootId);
    if (count > 10) {
      return minRootId;
    } else {
      try {
        const newMinRootId = await this.getNextMinRootIdForWave(wave, minRootId);
        if (!newMinRootId || minRootId === newMinRootId) {
          return minRootId;
        } else {
          return this.getMinRootIdForWave(wave, newMinRootId, maxRootId);
        }
      } catch (err) {
        return minRootId;
      }
    }
  }

  /**
   * Get next minimum root ID for wave (for pagination)
   */
  async getNextMinRootIdForWave(wave: Wave, minRootId: string | null): Promise<string | null> {
    const startTime = Date.now();
    const query = MessageModel.find({ waveId: wave.id, parentId: null })
      .sort('-_id')
      .limit(11);

    if (minRootId) {
      // ObjectId comparison works at runtime, type assertion needed for TS
      query.where('_id').lt(new Types.ObjectId(minRootId) as unknown as number);
    }

    const results = await query.exec();
    const endTime = Date.now();

    console.log('QUERY getNextMinRootIdForWave: ' + wave.id + ' query in ' + (endTime - startTime));
    if (results.length === 0) {
      return null;
    } else {
      const last = results[results.length - 1];
      return last.rootId?.toString() ?? last._id.toString();
    }
  }

  /**
   * Count messages in a range
   */
  async countMessagesInRange(
    wave: Wave, 
    minRootId: string | null, 
    maxRootId: string | null
  ): Promise<number> {
    if (!minRootId) {
      return 0;
    }

    const startTime = Date.now();
    const query = MessageModel.find({ waveId: wave.id });

    // ObjectId comparison works at runtime, type assertion needed for TS
    query.where('rootId').gte(new Types.ObjectId(minRootId) as unknown as number);

    if (maxRootId) {
      query.where('rootId').lt(new Types.ObjectId(maxRootId) as unknown as number);
    }

    try {
      const count = await query.countDocuments();
      const endTime = Date.now();
      console.log('QUERY countMessagesInRange: query in ' + (endTime - startTime));
      return count;
    } catch (err) {
      return 0;
    }
  }

  /**
   * Get messages for a user in a wave within a range
   */
  async getMessagesForUserInWave(
    wave: Wave,
    minRootId: string | null,
    maxRootId: string | null,
    unreadIds: string[]
  ): Promise<MessageData[]> {
    const startTime = Date.now();
    const query = MessageModel.find({ waveId: wave.id }).sort('_id');

    if (minRootId) {
      // ObjectId comparison works at runtime, type assertion needed for TS
      query.where('rootId').gte(new Types.ObjectId(minRootId) as unknown as number);
    }

    if (maxRootId) {
      query.where('rootId').lt(new Types.ObjectId(maxRootId) as unknown as number);
    }

    const messages = await query.exec();
    const endTime = Date.now();
    console.log('QUERY getMessagesForUserInWave: ' + wave.id + ' query in ' + (endTime - startTime));

    return messages.map((mmsg) => {
      const unread = typeof unreadIds === 'string'
        ? unreadIds === mmsg._id.toString()
        : unreadIds.includes(mmsg._id.toString());

      return {
        _id: mmsg._id.toString(),
        userId: mmsg.userId.toString(),
        waveId: mmsg.waveId.toString(),
        parentId: mmsg.parentId?.toString() ?? null,
        message: mmsg.message,
        unread,
        created_at: mmsg.created_at.getTime(),
      };
    });
  }

  /**
   * Mark a message as read (remove from Redis unread set)
   */
  async readMessage(user: User, message: { id: string; waveId: string }): Promise<void> {
    const key = 'unread-' + user.id + '-' + message.waveId;
    await redis.sRem(key, message.id);
  }

  /**
   * Add a message to user's unread set
   */
  async addUnreadMessage(user: User, message: Message): Promise<void> {
    if (message.userId !== user.id && message.id) {
      const key = 'unread-' + user.id + '-' + message.waveId;
      await redis.sAdd(key, message.id);
    }
  }

  /**
   * Mark all messages as read for a user in a wave
   */
  async readAllMessagesForUserInWave(user: User, wave: Wave): Promise<void> {
    const key = 'unread-' + user.id + '-' + wave.id;
    await redis.del(key);
  }

  /**
   * Create an invite code for a wave
   */
  async createInviteCodeForWave(user: User, wave: Wave): Promise<string> {
    const code = (Math.random() + 1).toString(36).replace(/\W/g, '');
    const data = {
      userId: new Types.ObjectId(user.id),
      waveId: new Types.ObjectId(wave.id),
      code,
      created_at: new Date(),
    };

    const m = new WaveInviteModel(data);
    await m.save();
    return code;
  }

  /**
   * Get wave invite by code
   */
  async getWaveInviteByCode(code: string): Promise<{ waveId: string; code: string } | null> {
    const invite = await WaveInviteModel.findOne({ code }).exec();
    if (!invite) return null;
    return {
      waveId: invite.waveId.toString(),
      code: invite.code,
    };
  }

  /**
   * Remove wave invite by code
   */
  async removeWaveInviteByCode(code: string): Promise<{ ok: number }> {
    const result = await WaveInviteModel.deleteOne({ code }).exec();
    return { ok: result.deletedCount };
  }

  /**
   * Shutdown database connections
   */
  async shutdown(): Promise<void> {
    await mongoose.connection.close();
    console.log('mongoose down');
    await redis.quit();
    console.log('redis down');
  }
}

// Export singleton instance
const DAL = new DataAccessLayer();
export default DAL;

// Also export the class for testing purposes
export { DataAccessLayer };
