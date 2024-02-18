import { io } from 'socket.io-client';
import { Message } from './model/message.model';
import { User } from './model/user.model';
import { Wave } from './model/wave.model';
export const Communicator = {
    app: null,
    socket: null,
    reconnect: true,
    createTitle: null,
    readQueue: [],
    queueReads: false,
    initialize: function (app) {
        var that = this;

        this.app = app;

        this.socket = io({ reconnection: false });

        this.socket.on('init', function (data) {
            that.onInit(data);
        });

        this.socket.on('message', function (data) {
            that.onMessage(data);
        });

        this.socket.on('disconnect', function () {
            that.app.view.showDisconnected(that.reconnect);
        });

        this.socket.on('updateUser', function (data) {
            that.onUpdateUser(data);
        });
        this.socket.on('updateWave', function (data) {
            that.onUpdateWave(data);
        });
        this.socket.on('inviteCodeReady', function (data) {
            that.onInviteCodeReady(data);
        });
        this.socket.on('linkPreviewReady', function (data) {
            that.onLinkPreviewReady(data);
        });

        this.socket.on('dontReconnect', function () {
            that.reconnect = false;
        });

        this.socket.on('ready', function () {
            that.queueReads = that.app.model.messages.where({ unread: true }).length > 1;
            that.app.showLastWave();
            that.app.model.setReady();
        });
    },

    /**
     * @param {Object} data
     */
    onInit: function (data) {
        if (null === this.app.model.currentUser) {
            //console.log(data.me);
            data.users.push(data.me);
            this.app.model.users.reset(data.users);
            this.app.model.initCurrentUser(this.app.model.users.get(data.me._id));
            this.app.model.waves.reset(data.waves);
        }
    },

    /**
     * @param {string} message
     * @param {number} waveId
     * @param {number} parentId
     */
    sendMessage: function (message, waveId, parentId) {
        var msg = {
            userId: this.app.model.currentUser.id,
            waveId: waveId,
            message: message,
            parentId: parentId
        };
        this.socket.emit('message', msg);
    },

    /**
     * @param {Message} message
     */
    readMessage: function (message) {
        if (this.queueReads) {
            this.readQueue.push(message);
            this.queueReads = false; //queue of max 1
        } else {
            this.readQueue.forEach(function (msg) {
                this.socket.emit('readMessage', { id: msg.id, waveId: msg.get('waveId') });
            }, this);
            this.readQueue = [];

            this.socket.emit('readMessage', { id: message.id, waveId: message.get('waveId') });
        }
    },

    /**
     * @param {Wave} wave
     */
    readAllMessages: function (wave) {
        this.socket.emit('readAllMessages', { waveId: wave.id });
    },

    /**
     * @param {string} title
     * @param {Array} userIds
     */
    createWave: function (title, userIds) {
        var wave = {
            title: title,
            userIds: userIds
        };
        this.createTitle = title;
        this.socket.emit('createWave', wave);
    },

    /**
     * @param {number} waveId
     * @param {string} title
     * @param {Array} userIds
     */
    updateWave: function (waveId, title, userIds) {
        var wave = {
            id: waveId,
            title: title,
            userIds: userIds
        };

        this.socket.emit('updateWave', wave);
    },

    /**
     * @param {Object} data
     */
    onMessage: function (data) {
        if (data.messages) {
            _.each(data.messages, function (msg) {
                this.onMessage(msg);
            }, this);
            return;
        }

        var message = new Message(data);
        if (this.app.model.waves.get(data.waveId).addMessage(message)) {
            this.app.model.messages.add(message);
        }
    },

    /**
     * @param {Object} data
     */
    onUpdateUser: function (data) {
        var user = data.user;
        //console.log(user);
        if (this.app.model.users.get(user._id)) {
            this.app.model.users.get(user._id).update(user);
        } else {
            this.app.model.users.add(new User(user));
        }
    },

    /**
     * @param {Object} data
     */
    onUpdateWave: function (data) {
        var wavedata = data.wave,
            wave;

        if (this.app.model.waves.get(wavedata._id)) {
            this.app.model.waves.get(wavedata._id).update(wavedata);
        } else {
            wave = new Wave(wavedata);
            this.app.model.waves.add(wave);
            if (1 === this.app.model.waves.length || this.createTitle === wave.get('title')) {
                this.app.navigate('wave/' + wave.id, { trigger: true });
            }
        }
    },

    /**
     * @param {Wave} wave
     * @param {number} minParentId
     * @param {number} maxRootId
     */
    getMessages: function (wave, minParentId, maxRootId) {
        var data = {
            waveId: wave.id,
            minParentId: minParentId,
            maxRootId: maxRootId
        };

        this.socket.emit('getMessages', data);
    },

    /**
     * @param {number} data
     */
    getUser: function (userId) {
        var data = {
            userId: userId
        };

        this.socket.emit('getUser', data);
    },

    /**
     * @param {number} waveId
     */
    quitUser: function (waveId) {
        var data = {
            waveId: waveId
        };

        this.socket.emit('quitWave', data);
    },

    /**
     * @param {number} waveId
     */
    getInviteCode: function (waveId) {
        var data = {
            waveId: waveId
        };

        this.socket.emit('createInviteCode', data);
    },

    /**
     * @param {Object} data
     */
    onInviteCodeReady: function (data) {
        if (this.app.model.waves.get(data.waveId)) {
            this.app.model.waves.get(data.waveId).trigger('inviteCodeReady', data.code);
        }
    },

    /**
     * @param {string} name
     * @param {string} avatar
     */
    updateUser: function (name, avatar) {
        var data = {
            name: name,
            avatar: avatar
        };

        this.socket.emit('updateUser', data);
    },

    getLinkPreview: function (url, message) {
        this.socket.emit('getLinkPreview', {
            msgId: message.id,
            url: url
        });
    },

    onLinkPreviewReady: function (data) {
        if (this.app.model.messages.get(data.msgId)) {
            this.app.model.messages.get(data.msgId).addLinkPreview(data.data);
        }
    }
};