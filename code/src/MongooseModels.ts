import mongoose, { Model } from 'mongoose';
import type { UserDocument, WaveDocument, MessageDocument, WaveInviteDocument, UnreadMessageDocument, LinkPreviewCacheDocument } from './types.js';

const { Schema } = mongoose;

const UserSchema = new Schema<UserDocument>({
  name: { type: String, trim: true },
  avatar: { type: String, trim: true },
  googleId: { type: String, trim: true },
  googleAvatar: { type: String, trim: true },
  email: { type: String, trim: true }
});

const AttachmentSchema = new Schema({
  storageKey: { type: String, required: true },
  filename: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true }
}, { _id: false });

const MessageSchema = new Schema<MessageDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'UserModel' },
  waveId: { type: Schema.Types.ObjectId, ref: 'WaveModel' },
  parentId: { type: Schema.Types.ObjectId, ref: 'MessageModel', default: null },
  rootId: { type: Schema.Types.ObjectId, ref: 'MessageModel', default: null },
  message: { type: String, trim: true },
  attachments: { type: [AttachmentSchema], default: undefined },
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

const UnreadMessageSchema = new Schema<UnreadMessageDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'UserModel', required: true },
  waveId: { type: Schema.Types.ObjectId, ref: 'WaveModel', required: true },
  messageId: { type: Schema.Types.ObjectId, ref: 'MessageModel', required: true },
  rootId: { type: Schema.Types.ObjectId, ref: 'MessageModel', required: true }
});
UnreadMessageSchema.index({ userId: 1, waveId: 1, rootId: 1 });
UnreadMessageSchema.index({ userId: 1, messageId: 1 }, { unique: true });

const LinkPreviewCacheSchema = new Schema<LinkPreviewCacheDocument>({
  url: { type: String, required: true, unique: true },
  data: { type: Schema.Types.Mixed, required: true },
  expiresAt: { type: Date, required: true }
});
LinkPreviewCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const UserModel: Model<UserDocument> = mongoose.model<UserDocument>('UserModel', UserSchema);
export const MessageModel: Model<MessageDocument> = mongoose.model<MessageDocument>('MessageModel', MessageSchema);
export const WaveModel: Model<WaveDocument> = mongoose.model<WaveDocument>('WaveModel', WaveSchema);
export const WaveInviteModel: Model<WaveInviteDocument> = mongoose.model<WaveInviteDocument>('WaveInviteModel', WaveInviteSchema);
export const UnreadMessageModel: Model<UnreadMessageDocument> = mongoose.model<UnreadMessageDocument>('UnreadMessageModel', UnreadMessageSchema);
export const LinkPreviewCacheModel: Model<LinkPreviewCacheDocument> = mongoose.model<LinkPreviewCacheDocument>('LinkPreviewCacheModel', LinkPreviewCacheSchema);
