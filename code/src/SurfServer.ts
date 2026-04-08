import { Server, Socket } from 'socket.io';
import signature from 'cookie-signature';
import cookie from 'cookie';
import DAL from './DAL.js';
import LinkPreview from './LinkPreview.js';
import SessionStore from './SessionStore.js';
import { startExpressServer } from './ExpressServer.js';
import Config from './Config.js';
import { User, Wave, Message, Collection } from './model/index.js';
import type { 
  SurfSession, 
  SurfSocket, 
  MessageData,
  CreateWavePayload,
  UpdateWavePayload,
  UpdateUserPayload,
  GetMessagesPayload,
  ReadMessagePayload,
  QuitWavePayload,
  CreateInviteCodePayload,
  GetUserPayload,
  GetLinkPreviewPayload,
} from './types.js';

interface SocketRequest {
  headers: {
    cookie?: string;
  };
  cookie?: Record<string, string | undefined>;
  sessionID?: string;
}

export interface SurfServerInterface {
  users: Collection<User>;
  waves: Collection<Wave>;
  startServer: () => void;
}

/**
 * Main SURF Server
 */
class SurfServerClass implements SurfServerInterface {
  socket: Server | null = null;
  users = new Collection<User>();
  waves = new Collection<Wave>();

  /**
   * Initialize the server - load data from database
   */
  init(): void {
    DAL.init(this);
  }

  /**
   * Start the HTTP and WebSocket servers
   */
  startServer(): void {
    const ExpressServer = startExpressServer();
    ExpressServer.listen(Config.port);
    console.log('SURF is running, listening on port ' + Config.port);

    this.socket = new Server(ExpressServer, {
      pingInterval: 4000,
      pingTimeout: 10000,
      cors: {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST'],
        allowedHeaders: ['*'],
      },
    });

    // Authentication middleware
    this.socket.use((socket: Socket, next) => {
      const data = socket.request as SocketRequest;

      if (!data.headers.cookie) {
        return next(new Error('Session cookie required.'));
      }

      data.cookie = cookie.parse(data.headers.cookie);

      const surfSid = data.cookie?.['surf.sid'];
      if (surfSid === undefined) {
        return next(new Error('Session cookie invalid.'));
      }

      const unsignedSid = signature.unsign(
        surfSid.slice(2), 
        'surfSessionSecret9'
      );

      if (!unsignedSid) {
        return next(new Error('Session cookie signature invalid.'));
      }

      data.sessionID = unsignedSid;

      SessionStore.get(data.sessionID, (err, session) => {
        if (err) {
          return next(new Error('Error in session store.'));
        }
        if (!session) {
          return next(new Error('Session not found.'));
        }

        const surfSession = session as unknown as SurfSession;
        
        // Success! We're authenticated with a known session.
        if (surfSession.passport?.user !== undefined) {
          (socket as SurfSocket).session = surfSession;
          return next();
        }
        return next(new Error('Session not authenticated.'));
      });
    });

    // Connection handler
    this.socket.on('connection', async (client: Socket) => {
      const surfClient = client as SurfSocket;
      
      try {
        surfClient.curUser = await this.getUserByAuth(surfClient.session);
        
        if (surfClient.curUser.socket) {
          surfClient.curUser.send('dontReconnect', 1);
          surfClient.curUser.socket.disconnect(true);
        }

        console.log('login: ' + surfClient.curUser.id);
        surfClient.curUser.socket = surfClient;

        this.setupClientEventHandlers(surfClient);

        let invite = null;
        if (surfClient.session.invite) {
          console.log('invitedto: ' + surfClient.session.invite.waveId);
          invite = surfClient.session.invite;
          surfClient.session.invite = undefined;
        }

        // Convert session invite to WaveInviteData format
        const inviteData = invite ? {
          waveId: invite.waveId,
          code: invite.code,
          userId: '',
          created_at: 0,
        } : null;
        await surfClient.curUser.init(inviteData);
      } catch (err) {
        console.log('User auth error', err);
        client.disconnect(true);
      }
    });
  }

  /**
   * Get or create user from session auth data
   */
  async getUserByAuth(session: SurfSession): Promise<User> {
    const userData = session.passport!.user;
    const authMode = userData.provider;

    if (userData._json === undefined) {
      throw new Error('sessionUser._json undefined');
    }

    // Find existing user by Google ID or email
    let user = this.users.find((u) => 
      u.googleId === userData.id || 
      u.email === userData.emails?.[0]?.value
    );

    const picture = userData.photos?.[0]?.value ?? null;

    if (user) {
      console.log('auth: userfound ' + user.id);
      
      // Update auth provider ID
      if (authMode === 'google') {
        user.googleId = userData.id;
      }
      
      user.email = userData.emails?.[0]?.value ?? user.email;
      
      if (picture && authMode === 'google') {
        user.googleAvatar = picture;
      }
      
      await user.save();
      return user;
    }

    // Create new user
    user = new User();
    user.name = userData.displayName ?? 
      (userData.name ? `${userData.name.givenName} ${userData.name.familyName}` : 'Anonymous');
    
    if (authMode === 'google') {
      user.googleId = userData.id;
    }
    
    user.email = userData.emails?.[0]?.value ?? '';
    
    if (picture) {
      user.avatar = picture;
      if (authMode === 'google') {
        user.googleAvatar = picture;
      }
    }

    await user.save();
    this.users.add(user);
    console.log('auth: newuser ' + user.id + ' (' + user.name + ')');
    return user;
  }

  /**
   * Set up client event handlers
   */
  private setupClientEventHandlers(client: SurfSocket): void {
    client.on('error', (err: Error) => {
      console.log('Socket client error');
      console.log(err.stack);
      client.curUser.disconnect();
      client.disconnect(true);
    });

    client.on('disconnect', () => {
      console.log('disconnect: ' + client.curUser.id);
      client.curUser.disconnect();
    });

    client.on('message', (data: MessageData) => {
      console.log('message: ' + client.curUser.id);

      const msg = new Message(data);
      const wave = this.waves.get(msg.waveId);

      if (msg.isValid() && wave && wave.isMember(client.curUser)) {
        wave.addMessage(msg);
      }
    });

    client.on('readMessage', (data: ReadMessagePayload) => {
      console.log('readMessage: ' + client.curUser.id);
      DAL.readMessage(client.curUser, data);
    });

    client.on('createWave', async (data: CreateWavePayload) => {
      try {
        console.log('createWave: ' + client.curUser.id);

        const wave = new Wave(data);
        if (wave.isValid()) {
          wave.addUser(client.curUser, false);
          await wave.save();
          this.waves.add(wave);
          wave.notifyUsers();
        }
      } catch (err) {
        console.log('ERROR', err);
      }
    });

    client.on('updateWave', (data: UpdateWavePayload) => {
      console.log('updateWave: ' + client.curUser.id);
      const wave = this.waves.get(data.id);
      if (wave && wave.isMember(client.curUser)) {
        wave.update(data, false);
      }
    });

    client.on('updateUser', (data: UpdateUserPayload) => {
      console.log('updateUser: ' + client.curUser.id);
      client.curUser.update(data);
    });

    client.on('getMessages', (data: GetMessagesPayload) => {
      console.log('getMessages: ' + client.curUser.id);
      const wave = this.waves.get(data.waveId);
      if (wave && wave.isMember(client.curUser)) {
        wave.sendPreviousMessagesToUser(
          client.curUser, 
          data.minParentId ?? null, 
          data.maxRootId ?? null
        );
      }
    });

    client.on('readAllMessages', (data: { waveId: string }) => {
      console.log('readAllMessages: ' + client.curUser.id);
      const wave = this.waves.get(data.waveId);
      if (wave && wave.isMember(client.curUser)) {
        wave.readAllMessagesOfUser(client.curUser);
      }
    });

    client.on('getUser', (data: GetUserPayload) => {
      const user = this.users.get(data.userId);
      if (user) {
        client.curUser.send('updateUser', { user: user.toFilteredJSON() });
      }
    });

    client.on('quitWave', (data: QuitWavePayload) => {
      const wave = this.waves.get(data.waveId);
      if (wave) {
        wave.quitUser(client.curUser);
      }
    });

    client.on('createInviteCode', async (data: CreateInviteCodePayload) => {
      console.log('createInviteCode: ' + client.curUser.id);
      const wave = this.waves.get(data.waveId);

      if (wave && wave.isMember(client.curUser)) {
        try {
          const code = await wave.createInviteCode(client.curUser);
          client.curUser.send('inviteCodeReady', { ...data, code });
        } catch (err) {
          console.log('ERROR', err);
        }
      }
    });

    client.on('getLinkPreview', (data: GetLinkPreviewPayload) => {
      console.log('getLinkPreview: ' + data.url);

      LinkPreview.parse(data.url)
        .then((resultData) => {
          const result = {
            msgId: data.msgId,
            data: resultData,
          };

          client.curUser.send('linkPreviewReady', result);
        })
        .catch((err) => {
          console.log(err);
        });
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    await DAL.shutdown();
  }
}

// Export singleton instance
const SurfServer = new SurfServerClass();
export default SurfServer;

// Also export the class for testing purposes
export { SurfServerClass };
