import crypto from 'crypto';
import type { Socket } from 'socket.io';
import type { UserData, PublicUserData, SelfUserData, WaveInviteData } from '../types.js';
import { Collection } from './Collection.js';
import type { Wave } from './Wave.js';

export class User {
  private _id: string | undefined;
  name: string;
  avatar: string;
  status: 'online' | 'offline';
  email: string;
  googleId: string;
  googleAvatar: string;
  
  socket: Socket | null = null;
  waves: Collection<Wave>;

  constructor(data?: Partial<UserData>) {
    this._id = data?._id;
    this.name = data?.name ?? '';
    this.avatar = data?.avatar ?? '';
    this.status = data?.status ?? 'offline';
    this.email = data?.email ?? '';
    this.googleId = data?.googleId ?? '';
    this.googleAvatar = data?.googleAvatar ?? '';
    this.waves = new Collection<Wave>();
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

  validate(attrs?: Partial<UserData>): string | undefined {
    const data = attrs ?? { name: this.name, avatar: this.avatar };
    if ((data.name?.trim().length ?? 0) === 0) {
      return 'Empty name';
    }
    if ((data.avatar?.trim().length ?? 0) === 0) {
      return 'Empty avatar';
    }
    return undefined;
  }

  isValid(): boolean {
    return this.validate() === undefined;
  }

  toJSON(): UserData {
    return {
      _id: this._id,
      name: this.name,
      avatar: this.avatar,
      status: this.status,
      email: this.email,
      googleId: this.googleId,
      googleAvatar: this.googleAvatar,
    };
  }

  /**
   * Filters public properties - hides sensitive data
   */
  toFilteredJSON(): PublicUserData {
    const emailParts = this.email.split('@');
    const maskedEmail = emailParts[0].substring(0, 2) + '..@' + emailParts[1];
    
    return {
      id: this.id,
      _id: this.id,
      name: this.name,
      avatar: this.avatar,
      status: this.status,
      email: maskedEmail,
    };
  }

  /**
   * JSON representation for the user themselves (includes more data)
   */
  toSelfJSON(): SelfUserData {
    const emailMD5 = crypto.createHash('md5').update(this.email).digest('hex');
    return {
      ...this.toJSON(),
      emailMD5,
    };
  }

  /**
   * Send a message to this user via their socket
   */
  send(msgType: string, msg: unknown): void {
    if (this.socket) {
      this.socket.emit(msgType, msg);
    }
  }

  /**
   * Initialize user after connection
   */
  async init(invite: WaveInviteData | null): Promise<void> {
    const { default: SurfServer } = await import('../SurfServer.js');
    const { default: DAL } = await import('../DAL.js');

    this.status = 'online';

    const friends = this.getFriends(SurfServer.users).map((f) => f.toFilteredJSON());

    this.socket?.emit('init', {
      me: this.toSelfJSON(),
      users: friends,
      waves: this.waves.toArray(),
    });

    this.notifyFriends(SurfServer.users);

    try {
      await DAL.getLastMessagesForUser(this, (err, msgs, waveId) => {
        if (!err) {
          this.send('message', { messages: msgs, waveId });
        }
      });
      this.send('ready', undefined);
      if (invite) {
        await this.handleInvite(invite);
      }
    } catch (err) {
      console.log('ERROR', err);
    }
  }

  /**
   * Handle user disconnect
   */
  async disconnect(): Promise<void> {
    const { default: SurfServer } = await import('../SurfServer.js');
    this.status = 'offline';
    this.notifyFriends(SurfServer.users);
  }

  /**
   * Get user's friends (users sharing waves, excluding self)
   */
  getFriends(allUsers: Collection<User>): User[] {
    const friendIds = new Set<string>();
    const friends: User[] = [];

    for (const wave of this.waves) {
      const userIds = wave.userIds;
      for (const uid of userIds) {
        if (uid !== this.id && !friendIds.has(uid)) {
          const user = allUsers.get(uid);
          if (user) {
            friendIds.add(uid);
            friends.push(user);
          }
        }
      }
    }

    return friends;
  }

  /**
   * Notify friends of status/data change
   */
  notifyFriends(allUsers: Collection<User>): void {
    const friends = this.getFriends(allUsers);
    for (const friend of friends) {
      friend.send('updateUser', { user: this.toFilteredJSON() });
    }
  }

  /**
   * Save user data via DAL
   */
  async save(): Promise<void> {
    const DAL = (await import('../DAL.js')).default;
    await DAL.saveUser(this);
  }

  /**
   * Update user profile
   */
  async update(data: Partial<UserData>): Promise<void> {
    const { default: SurfServer } = await import('../SurfServer.js');

    try {
      let name = data.name ?? '';
      const avatar = data.avatar ?? '';

      if (this.validate(data) === undefined) {
        name = name.substring(0, 30);

        this.name = name.trim();
        this.avatar = avatar.trim();
        await this.save();
        this.notifyFriends(SurfServer.users);
        this.send('updateUser', { user: this.toSelfJSON() });
      } else {
        console.log(this.validate(data));
      }
    } catch (err) {
      console.log('ERROR', err);
    }
  }

  /**
   * Remove a wave from user's wave list
   */
  quitWave(wave: Wave): void {
    this.waves.remove(wave);
  }

  /**
   * Handle invite code after login
   */
  async handleInvite(invite: WaveInviteData): Promise<void> {
    const { default: SurfServer } = await import('../SurfServer.js');
    const { default: DAL } = await import('../DAL.js');

    try {
      const result = await DAL.removeWaveInviteByCode(invite.code);
      if (result.ok > 0) {
        const wave = SurfServer.waves.get(invite.waveId);
        if (wave && !wave.isMember(this)) {
          wave.addUser(this, true);
          await wave.save();
          await wave.sendPreviousMessagesToUser(this, null, null);
        }
      }
    } catch (err) {
      console.log('ERROR', err);
    }
  }
}

// Type alias for collection of users
export type UserCollection = Collection<User>;
