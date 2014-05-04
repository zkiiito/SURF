/*global io, app, Message, Wave, User */
var Communicator = {
    socket: null,
    reconnect: true,
    pingTimeout: null,
    createTitle: null,
    initialize: function() {
        if (typeof io === 'undefined') {
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

    onInit: function(data) {
        if (undefined === app.currentUser) {
            //console.log(data.me);
            app.currentUser = data.me._id;
            data.users.push(data.me);
            app.model.users.reset(data.users);
            app.model.waves.reset(data.waves);
            app.model.messages.reset(data.messages);
            app.model.currentUser.set(app.model.users.get(app.currentUser).toJSON());

            var lastMsg = app.model.messages.last();

            if (lastMsg) {
                document.location = '#wave/' + lastMsg.get('waveId');
            }
            this.schedulePing();
        }
    },

    sendMessage: function(message, waveId, parentId) {
        var msg = {
            userId: app.currentUser,
            waveId: waveId,
            message: message,
            parentId: parentId
        };
        this.socket.emit('message', msg);
    },

    readMessage: function(message) {
        this.socket.emit('readMessage', {id: message.id, waveId: message.get('waveId')});
    },

    readAllMessages: function(wave) {
        this.socket.emit('readAllMessages', {waveId: wave.id});
    },

    createWave: function(title, userIds) {
        var wave = {
            title: title,
            userIds: userIds
        };
        this.createTitle = title;
        this.socket.emit('createWave', wave);
    },

    updateWave: function(waveId, title, userIds) {
        var wave = {
            id : waveId,
            title: title,
            userIds: userIds
        };

        this.socket.emit('updateWave', wave);
    },

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

    onUpdateUser: function(data) {
        var user = data.user;
        //console.log(user);
        if (app.model.users.get(user._id)) {
            app.model.users.get(user._id).update(user);
            if (app.currentUser === user._id) {
                app.model.currentUser.update(user);
            }
        } else {
            app.model.users.add(new User(user));
        }
    },

    onUpdateWave: function(data) {
        var wavedata = data.wave,
            wave;

        if (app.model.waves.get(wavedata._id)) {
            app.model.waves.get(wavedata._id).update(wavedata);
        } else {
            wave = new Wave(wavedata);
            app.model.waves.add(wave);
            if (1 === app.model.waves.length || this.createTitle === wave.get('title')) {
                document.location = '#wave/' + wave.id;
            }
        }
    },

    getMessages: function(wave, minParentId, maxRootId) {
        var data = {
            waveId: wave.id,
            minParentId: minParentId,
            maxRootId: maxRootId
        };

        this.socket.emit('getMessages', data);
    },

    getUser: function(userId) {
        var data = {
            userId: userId
        };

        this.socket.emit('getUser', data);
    },

    quitUser: function(waveId) {
        var data = {
            waveId: waveId
        };

        this.socket.emit('quitWave', data);
    },

    getInviteCode: function(waveId) {
        var data = {
            waveId: waveId
        };

        this.socket.emit('createInviteCode', data);
    },

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

    updateUser: function(name, avatar) {
        var data = {
            name: name,
            avatar: avatar
        };

        this.socket.emit('updateUser', data);
    }
};