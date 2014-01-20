/*global io, app, Message, Wave, User */
var Communicator = {
    socket: null,
    reconnect: true,
    initialize: function() {
        if (typeof io === 'undefined') {
            return;
        }
        var that = this;

        //var id = prompt('hanyas vagy?', Math.ceil(Math.random() * 50)) * 1 -1;
        this.socket = new io.connect(document.location.href, {reconnect: false});
        //this.socket.emit('auth', id);

        this.socket.on('init', this.onInit);

        this.socket.on('message', function(data) {
            that.onMessage(data);
        });

        this.socket.on('disconnect', function(){
            app.view.showDisconnected(that.reconnect);
        });

        this.socket.on('updateUser', this.onUpdateUser);
        this.socket.on('updateWave', this.onUpdateWave);
        this.socket.on('inviteCodeReady', this.onInviteCodeReady);

        this.socket.on('dontReconnect', function(){
            that.reconnect = false;
        });
    },

    onInit: function(data){
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
        } else {
            app.model.users.add(new User(user));
        }
    },

    onUpdateWave: function(data) {
        var wave = data.wave;

        if (app.model.waves.get(wave._id)) {
            app.model.waves.get(wave._id).update(wave);
        } else {
            app.model.waves.add(new Wave(wave));
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
    }
};