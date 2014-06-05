/*global io, app, Message, Wave, User */
var Communicator = {
    socket: null,
    reconnect: true,
    pingTimeout: null,
    createTitle: null,
    initialize: function() {
        if (window.io === undefined) {
            return;
        }
        var that = this;

        this.socket = new io.connect(document.location.href, {reconnect: false});

        this.socket.on('init', function(data) {
            that.onInit(data);
        });

        this.socket.on('message', function(data) {
            that.onMessage(data);
        });

        this.socket.on('disconnect', function() {
            clearTimeout(that.pingTimeout);
            app.view.showDisconnected(that.reconnect);
        });

        this.socket.on('updateUser', this.onUpdateUser);
        this.socket.on('updateWave', function(data) {
            that.onUpdateWave(data);
        });
        this.socket.on('inviteCodeReady', this.onInviteCodeReady);

        this.socket.on('dontReconnect', function() {
            that.reconnect = false;
        });

        this.socket.on('pong', function() {
            that.schedulePing();
        });
    },

    /**
     * @param {Object} data
     */
    onInit: function(data) {
        if (null === app.model.currentUser) {
            //console.log(data.me);
            data.users.push(data.me);
            app.model.users.reset(data.users);
            app.model.initCurrentUser(app.model.users.get(data.me._id));
            app.model.waves.reset(data.waves);
            app.model.messages.reset(data.messages);

            var lastMsg = app.model.messages.last();

            if (lastMsg) {
                app.navigate('wave/' + lastMsg.get('waveId'), {trigger: true});
            }
            this.schedulePing();
        }
    },

    /**
     * @param {string} message
     * @param {number} waveId
     * @param {number} parentId
     */
    sendMessage: function(message, waveId, parentId) {
        var msg = {
            userId: app.model.currentUser.id,
            waveId: waveId,
            message: message,
            parentId: parentId
        };
        this.socket.emit('message', msg);
    },

    /**
     * @param {Message} message
     */
    readMessage: function(message) {
        this.socket.emit('readMessage', {id: message.id, waveId: message.get('waveId')});
    },

    /**
     * @param {Wave} wave
     */
    readAllMessages: function(wave) {
        this.socket.emit('readAllMessages', {waveId: wave.id});
    },

    /**
     * @param {string} title
     * @param {Array} userIds
     */
    createWave: function(title, userIds) {
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
    updateWave: function(waveId, title, userIds) {
        var wave = {
            id : waveId,
            title: title,
            userIds: userIds
        };

        this.socket.emit('updateWave', wave);
    },

    /**
     * @param {Object} data
     */
    onMessage: function(data) {
        this.schedulePing();

        if (data.messages) {
            _.each(data.messages, function(msg) {
                this.onMessage(msg);
            }, this);
            return;
        }

        var message = new Message(data);
        if (app.model.waves.get(data.waveId).addMessage(message)) {
            app.model.messages.add(message);
        }
    },

    /**
     * @param {Object} data
     */
    onUpdateUser: function(data) {
        var user = data.user;
        //console.log(user);
        if (app.model.users.get(user._id)) {
            app.model.users.get(user._id).update(user);
        } else {
            app.model.users.add(new User(user));
        }
    },

    /**
     * @param {Object} data
     */
    onUpdateWave: function(data) {
        var wavedata = data.wave,
            wave;

        if (app.model.waves.get(wavedata._id)) {
            app.model.waves.get(wavedata._id).update(wavedata);
        } else {
            wave = new Wave(wavedata);
            app.model.waves.add(wave);
            if (1 === app.model.waves.length || this.createTitle === wave.get('title')) {
                app.navigate('wave/' + wave.id, {trigger: true});
            }
        }
    },

    /**
     * @param {Wave} wave
     * @param {number} minParentId
     * @param {number} maxRootId
     */
    getMessages: function(wave, minParentId, maxRootId) {
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
    getUser: function(userId) {
        var data = {
            userId: userId
        };

        this.socket.emit('getUser', data);
    },

    /**
     * @param {number} waveId
     */
    quitUser: function(waveId) {
        var data = {
            waveId: waveId
        };

        this.socket.emit('quitWave', data);
    },

    /**
     * @param {number} waveId
     */
    getInviteCode: function(waveId) {
        var data = {
            waveId: waveId
        };

        this.socket.emit('createInviteCode', data);
    },

    /**
     * @param {Object} data
     */
    onInviteCodeReady: function(data) {
        if (app.model.waves.get(data.waveId)) {
            app.model.waves.get(data.waveId).trigger('inviteCodeReady', data.code);
        }
    },

    schedulePing: function() {
        var that = this;
        clearTimeout(this.pingTimeout);
        this.pingTimeout = setTimeout(function() {
            that.socket.emit('ping');
        }, 30000);
    },

    /**
     * @param {string} name
     * @param {string} avatar
     */
    updateUser: function(name, avatar) {
        var data = {
            name: name,
            avatar: avatar
        };

        this.socket.emit('updateUser', data);
    }
};