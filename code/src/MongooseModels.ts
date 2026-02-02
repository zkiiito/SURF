import mongoose, { Model } from 'mongoose';
import type { UserDocument, WaveDocument, MessageDocument, WaveInviteDocument } from './types.js';

const { Schema } = mongoose;

const UserSchema = new Schema<UserDocument>({
  name: { type: String, trim: true },
  avatar: { type: String, trim: true },
  googleId: { type: String, trim: true },
  googleAvatar: { type: String, trim: true },
  email: { type: String, trim: true }
});

const MessageSchema = new Schema<MessageDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'UserModel' },
  waveId: { type: Schema.Types.ObjectId, ref: 'WaveModel' },
  parentId: { type: Schema.Types.ObjectId, ref: 'MessageModel', default: null },
  rootId: { type: Schema.Types.ObjectId, ref: 'MessageModel', default: null },
  message: { type: String, trim: true },
  created_at: { type: Date }
});

const WaveSchema = new Schema<WaveDocument>({
  title: { type: String, trim: true },
  userIds: [{ type: Schema.Types.ObjectId, ref: 'UserModel' }]
});

const WaveInviteSchema = new Schema<WaveInviteDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'UserModel' },
  waveId: { type: Schema.Types.ObjectId, ref: 'WaveModel' },
  code: { type: String, trim: true },
  created_at: { type: Date }
});

export const UserModel: Model<UserDocument> = mongoose.model<UserDocument>('UserModel', UserSchema);
export const MessageModel: Model<MessageDocument> = mongoose.model<MessageDocument>('MessageModel', MessageSchema);
export const WaveModel: Model<WaveDocument> = mongoose.model<WaveDocument>('WaveModel', WaveSchema);
export const WaveInviteModel: Model<WaveInviteDocument> = mongoose.model<WaveInviteDocument>('WaveInviteModel', WaveInviteSchema);
