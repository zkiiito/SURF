import type { Socket } from 'socket.io';
import type { Session } from 'express-session';
import type { Types } from 'mongoose';

// ============================================================================
// Data Transfer Objects (plain data shapes)
// ============================================================================

export interface UserData {
  _id?: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline';
  email: string;
  googleId: string;
  googleAvatar: string;
}

export interface PublicUserData {
  id: string;
  _id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline';
  email: string; // masked email
}

export interface SelfUserData extends UserData {
  emailMD5: string;
}

export interface WaveData {
  _id?: string;
  title: string;
  userIds: string[];
}

export interface MessageData {
  _id?: string;
  userId: string;
  waveId: string;
  parentId: string | null;
  rootId?: string | null;
  message: string;
  unread?: boolean;
  created_at: number;
}

export interface WaveInviteData {
  _id?: string;
  userId: string;
  waveId: string;
  code: string;
  created_at: number;
}

// ============================================================================
// Session & Authentication Types
// ============================================================================

export interface GoogleProfile {
  provider: string;
  id: string;
  displayName?: string;
  name?: {
    givenName?: string;
    familyName?: string;
  };
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
  _json: Record<string, unknown>;
}

export interface SurfSession extends Session {
  passport?: { user: GoogleProfile };
  invite?: { waveId: string; code: string };
}

// ============================================================================
// Socket Types
// ============================================================================

export interface SurfSocket extends Socket {
  session: SurfSession;
  curUser: import('./model/User.js').User;
}

// ============================================================================
// Mongoose Document Types
// ============================================================================

export interface UserDocument {
  _id: Types.ObjectId;
  name: string;
  avatar: string;
  email: string;
  googleId: string;
  googleAvatar: string;
}

export interface WaveDocument {
  _id: Types.ObjectId;
  title: string;
  userIds: Types.ObjectId[];
}

export interface MessageDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  waveId: Types.ObjectId;
  parentId: Types.ObjectId | null;
  rootId: Types.ObjectId | null;
  message: string;
  created_at: Date;
}

export interface WaveInviteDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  waveId: Types.ObjectId;
  code: string;
  created_at: Date;
}

// ============================================================================
// Config Type
// ============================================================================

export interface Config {
  googleId: string;
  googleSecret: string;
  mongoUrl: string;
  mongoDebug: boolean;
  redisUrl: string;
  hostName: string;
  testMode: boolean;
  port: number;
}

// ============================================================================
// Socket Event Payloads
// ============================================================================

export interface CreateWavePayload {
  title: string;
  userIds?: string[];
}

export interface UpdateWavePayload {
  id: string;
  title?: string;
  userIds?: string[];
}

export interface UpdateUserPayload {
  name?: string;
  avatar?: string;
}

export interface GetMessagesPayload {
  waveId: string;
  minParentId?: string | null;
  maxRootId?: string | null;
}

export interface ReadMessagePayload {
  id: string;
  waveId: string;
}

export interface QuitWavePayload {
  waveId: string;
}

export interface CreateInviteCodePayload {
  waveId: string;
  code?: string;
}

export interface GetUserPayload {
  userId: string;
}

export interface GetLinkPreviewPayload {
  url: string;
  msgId: string;
}

// ============================================================================
// Link Preview Types
// ============================================================================

export interface LinkPreviewResult {
  url: string;
  title?: string;
  description?: string | null;
  image?: string | null;
}
