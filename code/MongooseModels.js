import mongoose from 'mongoose';
const { Schema } = mongoose;

const UserSchema = new Schema({
    name: {type: String, trim: true},
    avatar: {type: String, trim: true},
    googleId: {type: String, trim: true},
    googleAvatar: {type: String, trim: true},
    facebookId: {type: String, trim: true},
    facebookAvatar: {type: String, trim: true},
    email: {type: String, trim: true}
});

const MessageSchema = new Schema({
    userId: Schema.ObjectId,
    waveId: Schema.ObjectId,
    parentId: Schema.ObjectId,
    rootId: Schema.ObjectId,
    message: {type: String, trim: true},
    created_at: {type: Date}
});

const WaveSchema = new Schema({
    title: {type: String, trim: true},
    userIds: {type: [String]}
});

const WaveInviteSchema = new Schema({
    userId: Schema.ObjectId,
    waveId: Schema.ObjectId,
    code: {type: String, trim: true},
    created_at: {type: Date}
});

export const UserModel = mongoose.model('UserModel', UserSchema);
export const MessageModel = mongoose.model('MessageModel', MessageSchema);
export const WaveModel = mongoose.model('WaveModel', WaveSchema);
export const WaveInviteModel = mongoose.model('WaveInviteModel', WaveInviteSchema);
