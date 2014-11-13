var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var UserSchema = new Schema({
    name: {type: String, trim: true},
    avatar: {type: String, trim: true},
    googleId: {type: String, trim: true},
    googleAvatar: {type: String, trim: true},
    facebookId: {type: String, trim: true},
    facebookAvatar: {type: String, trim: true},
    email: {type: String, trim: true}
});

var MessageSchema = new Schema({
    userId: Schema.ObjectId,
    waveId: Schema.ObjectId,
    parentId: Schema.ObjectId,
    rootId: Schema.ObjectId,
    message: {type: String, trim: true},
    created_at: {type: Date}
});

var WaveSchema = new Schema({
    title: {type: String, trim: true},
    userIds: {type: [String]}
});

var WaveInviteSchema = new Schema({
    userId: Schema.ObjectId,
    waveId: Schema.ObjectId,
    code: {type: String, trim: true},
    created_at: {type: Date}
});

exports.UserModel = mongoose.model('UserModel', UserSchema);
exports.MessageModel = mongoose.model('MessageModel', MessageSchema);
exports.WaveModel = mongoose.model('WaveModel', WaveSchema);
exports.WaveInviteModel = mongoose.model('WaveInviteModel', WaveInviteSchema);