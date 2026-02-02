import type { WaveData } from '../types.js';
import { Collection } from './Collection.js';
import type { User } from './User.js';
import { Message } from './Message.js';

export class Wave {
  private _id: string | undefined;
  title: string;
  userIds: string[];
  
  users: Collection<User>;

  constructor(data?: Partial<WaveData>) {
    this._id = data?._id;
    this.title = data?.title ?? '';
    this.userIds = data?.userIds ?? [];
    this.users = new Collection<User>();
  }

  get id(): string {
    return this._id ?? '';
  }

  setId(id: string): void {
    this._id = id;
  }

  isNew(): boolean {
    return !this._id;
  }

  validate(attrs?: Partial<WaveData>): string | undefined {
    const data = attrs ?? { title: this.title };
    if ((data.title?.trim().length ?? 0) === 0) {
      return 'Empty name';
    }
    return undefined;
  }

  isValid(): boolean {
    return this.validate() === undefined;
  }

  toJSON(): WaveData {
    return {
      _id: this._id,
      title: this.title,
      userIds: this.userIds,
    };
  }

  /**
   * Initialize wave with existing users (called after loading from DB)
   */
  async initializeUsers(): Promise<void> {
    if (this.userIds.length > 0) {
      await this.addUsers(this.userIds, false);
    }
  }

  /**
   * Add a message to this wave
   */
  async addMessage(message: Message): Promise<void> {
    const { default: DAL } = await import('../DAL.js');

    try {
      await message.save();
      for (const user of this.users) {
        user.send('message', message.toJSON());
        await DAL.addUnreadMessage(user, message);
      }
    } catch (err) {
      console.log('ERROR', err);
    }
  }

  /**
   * Add multiple users to this wave
   */
  async addUsers(userIds: string[], notify: boolean): Promise<boolean> {
    const { default: SurfServer } = await import('../SurfServer.js');
    const newUsers: User[] = [];

    for (const userId of userIds) {
      const user = SurfServer.users.get(userId);
      if (user) {
        newUsers.push(user);
        this.addUser(user, false); // don't notify yet
      }
    }

    if (notify && newUsers.length > 0) {
      for (const user of newUsers) {
        this.notifyUsersOfNewUser(user);
      }
      this.notifyUsers();
      return true;
    }
    return false;
  }

  /**
   * Add a single user to this wave
   */
  addUser(user: User, notify: boolean): boolean {
    this.users.add(user);
    user.waves.add(this);

    // Add user ID if not already present
    if (!this.userIds.includes(user.id)) {
      this.userIds = [...new Set([...this.userIds, user.id])];
    }

    if (notify) {
      this.notifyUserOfExistingUsers(user);
      this.notifyUsersOfNewUser(user);
      this.notifyUsers();
      return true;
    }
    return false;
  }

  /**
   * Notify existing users about a new user
   */
  notifyUsersOfNewUser(newUser: User): void {
    for (const user of this.users) {
      // Only if logged in and now they have one common wave
      if (user.socket && user !== newUser) {
        const commonWaves = this.getCommonWaves(newUser, user);
        if (commonWaves.length < 2) {
          user.send('updateUser', { user: newUser.toFilteredJSON() });
        }
      }
    }
  }

  /**
   * Get waves shared by two users
   */
  private getCommonWaves(user1: User, user2: User): Wave[] {
    const user1WaveIds = new Set(user1.waves.map(w => w.id));
    return user2.waves.filter(w => user1WaveIds.has(w.id));
  }

  /**
   * Notify all users about wave update
   */
  notifyUsers(): void {
    for (const user of this.users) {
      user.send('updateWave', { wave: this.toJSON() });
    }
  }

  /**
   * Notify a new user about existing users in the wave
   */
  notifyUserOfExistingUsers(newUser: User): void {
    for (const user of this.users) {
      if (user !== newUser) {
        const commonWaves = this.getCommonWaves(newUser, user);
        if (commonWaves.length < 2) {
          newUser.send('updateUser', { user: user.toFilteredJSON() });
        }
      }
    }
  }

  /**
   * Send old messages to a user (when they join)
   */
  async sendOldMessagesToUser(user: User): Promise<void> {
    const { default: DAL } = await import('../DAL.js');

    try {
      const msgs = await DAL.getLastMessagesForUserInWave(user, this);
      user.send('message', { messages: msgs });
    } catch (err) {
      console.log('ERROR', err);
    }
  }

  /**
   * Send previous messages to user (for pagination/history)
   */
  async sendPreviousMessagesToUser(
    user: User, 
    minParentId: string | null, 
    maxRootId: string | null
  ): Promise<void> {
    const { default: DAL } = await import('../DAL.js');

    try {
      if (minParentId && maxRootId) {
        const minRootId = await DAL.calcRootId(minParentId, []);
        const ids = await DAL.getUnreadIdsForUserInWave(user, this);
        const msgs = await DAL.getMessagesForUserInWave(this, minRootId, maxRootId, ids);
        user.send('message', { messages: msgs, waveId: this.id });
      } else {
        const newMinRootId = await DAL.getMinRootIdForWave(this, maxRootId, maxRootId);
        const msgs = await DAL.getMessagesForUserInWave(this, newMinRootId, maxRootId, []);
        user.send('message', { messages: msgs, waveId: this.id });
      }
    } catch (err) {
      console.log('ERROR', err);
    }
  }

  /**
   * Mark all messages as read for a user in this wave
   */
  async readAllMessagesOfUser(user: User): Promise<void> {
    const { default: DAL } = await import('../DAL.js');
    await DAL.readAllMessagesForUserInWave(user, this);
  }

  /**
   * Save wave data via DAL
   */
  async save(): Promise<void> {
    const DAL = (await import('../DAL.js')).default;
    await DAL.saveWave(this);
  }

  /**
   * Remove a user from this wave
   */
  async quitUser(user: User): Promise<void> {
    try {
      if (this.users.contains(user)) {
        this.users.remove(user);

        const idx = this.userIds.indexOf(user.id);
        if (idx >= 0) {
          this.userIds = [...this.userIds.slice(0, idx), ...this.userIds.slice(idx + 1)];
        }

        user.quitWave(this);

        await this.save();
        this.notifyUsers();
      }
    } catch (err) {
      console.log('ERROR', err);
    }
  }

  /**
   * Create an invite code for this wave
   */
  async createInviteCode(user: User): Promise<string> {
    const { default: DAL } = await import('../DAL.js');
    return DAL.createInviteCodeForWave(user, this);
  }

  /**
   * Update wave data
   */
  async update(data: Partial<WaveData>, withRemove: boolean = false): Promise<void> {
    const { default: SurfServer } = await import('../SurfServer.js');

    this.title = data.title ?? '';
    let notified = false;

    if (this.isValid() && data.userIds) {
      // Check if userIds changed
      const currentIds = [...this.userIds].sort();
      const newIds = [...data.userIds].sort();
      const idsEqual = currentIds.length === newIds.length && 
                       currentIds.every((id, i) => id === newIds[i]);

      if (!idsEqual) {
        // Find newly added users
        const addedIds = data.userIds.filter(id => !this.userIds.includes(id));
        notified = await this.addUsers(addedIds, true);

        // Send old messages to new users
        for (const userId of addedIds) {
          const user = SurfServer.users.get(userId);
          if (user) {
            await this.sendOldMessagesToUser(user);
          }
        }

        if (withRemove) {
          // Find removed users
          const removedIds = this.userIds.filter(id => !data.userIds!.includes(id));
          for (const userId of removedIds) {
            const user = SurfServer.users.get(userId);
            if (user) {
              await this.quitUser(user);
            }
          }
        }
      }

      if (!notified) {
        this.notifyUsers();
      }

      await this.save();
    }
  }

  /**
   * Check if user is a member of this wave
   */
  isMember(user: User): boolean {
    return this.users.contains(user);
  }
}

// Type alias for collection of waves
export type WaveCollection = Collection<Wave>;
