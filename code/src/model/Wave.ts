import type { WaveData } from '../types.js';
import { Collection } from './Collection.js';
import { Registry } from '../Registry.js';
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

  async addMessage(message: Message): Promise<void> {
    try {
      await message.save();
      const payload = message.toJSON();
      await Promise.all(
        this.users.map((user) => {
          user.send('message', payload);
          return Registry.dal.addUnreadMessage(user, message);
        })
      );
    } catch (err) {
      console.log('ERROR', err);
    }
  }

  async addUsers(userIds: string[], notify: boolean): Promise<boolean> {
    const newUsers: User[] = [];

    for (const userId of userIds) {
      const user = Registry.server.users.get(userId);
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

  async sendOldMessagesToUser(user: User): Promise<void> {
    try {
      const msgs = await Registry.dal.getLastMessagesForUserInWave(user, this);
      user.send('message', { messages: msgs });
    } catch (err) {
      console.log('ERROR', err);
    }
  }

  async sendPreviousMessagesToUser(
    user: User,
    minParentId: string | null,
    maxRootId: string | null
  ): Promise<void> {
    try {
      if (minParentId && maxRootId) {
        const minRootId = await Registry.dal.getRootId(minParentId);
        const ids = await Registry.dal.getUnreadIdsForUserInWave(user, this);
        const msgs = await Registry.dal.getMessagesForUserInWave(this, minRootId, maxRootId, ids);
        user.send('message', { messages: msgs, waveId: this.id });
      } else {
        const newMinRootId = await Registry.dal.getMinRootIdForWave(this, maxRootId, maxRootId);
        const msgs = await Registry.dal.getMessagesForUserInWave(this, newMinRootId, maxRootId, []);
        user.send('message', { messages: msgs, waveId: this.id });
      }
    } catch (err) {
      console.log('ERROR', err);
    }
  }

  async readAllMessagesOfUser(user: User): Promise<void> {
    await Registry.dal.readAllMessagesForUserInWave(user, this);
  }

  async save(): Promise<void> {
    await Registry.dal.saveWave(this);
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

  async createInviteCode(user: User): Promise<string> {
    return Registry.dal.createInviteCodeForWave(user, this);
  }

  async update(data: Partial<WaveData>): Promise<void> {
    this.title = data.title ?? '';
    let notified = false;

    if (this.isValid() && data.userIds) {
      const currentIds = [...this.userIds].sort();
      const newIds = [...data.userIds].sort();
      const idsEqual = currentIds.length === newIds.length &&
                       currentIds.every((id, i) => id === newIds[i]);

      if (!idsEqual) {
        const addedIds = data.userIds.filter(id => !this.userIds.includes(id));
        notified = await this.addUsers(addedIds, true);

        for (const userId of addedIds) {
          const user = Registry.server.users.get(userId);
          if (user) {
            await this.sendOldMessagesToUser(user);
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
