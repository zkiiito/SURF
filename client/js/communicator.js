var Communicator = {
    socket: null,
    reconnect: true,
    initialize: function() {
        if (typeof io === 'undefined') {
            return;
        }
        
        //var id = prompt('hanyas vagy?', Math.ceil(Math.random() * 50)) * 1 -1;
        Communicator.socket = new io.connect(document.location.href, {reconnect: false});
        //Communicator.socket.emit('auth', id);
        
        Communicator.socket.on('init', function(data){
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
        });
        
        Communicator.socket.on('message', Communicator.onMessage);
        
        Communicator.socket.on('disconnect', function(){
            app.view.showDisconnected(Communicator.reconnect);
        });
        
        Communicator.socket.on('updateUser', Communicator.onUpdateUser);
        Communicator.socket.on('updateWave', Communicator.onUpdateWave);
        Communicator.socket.on('inviteCodeReady', Communicator.onInviteCodeReady);
        
        Communicator.socket.on('dontReconnect', function(){
            Communicator.reconnect = false;
        });        
    },
    
    sendMessage: function(message, waveId, parentId) {
        var msg = {
            userId: app.currentUser, 
            waveId: waveId, 
            message: message, 
            parentId: parentId
        };
        Communicator.socket.emit('message', msg);
    },
    
    readMessage: function(message) {
        Communicator.socket.emit('readMessage', {id: message.id, waveId: message.get('waveId')});
    },
    
    readAllMessages: function(wave) {
        Communicator.socket.emit('readAllMessages', {waveId: wave.id});
    },
    
    createWave: function(title, userIds) {
        var wave = {
            title: title,
            userIds: userIds
        };
        Communicator.socket.emit('createWave', wave);
    },
    
    updateWave: function(waveId, title, userIds) {
        var wave = {
            id : waveId,
            title: title,
            userIds: userIds
        };
        
        Communicator.socket.emit('updateWave', wave);
    },
    
    onJoin: function(data) {
        //data: user_id, wave_id, kell-e full userinfo?
        //var user = app.model.users.at(data.userId);
        //app.model.waves.at(data.waveId).addUser(user);
    },
    
    onMessage: function(data) {
        if (data.messages) {
            _.each(data.messages, function(msg) {
                Communicator.onMessage(msg);
            });
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
        
        Communicator.socket.emit('getMessages', data);
    },
    
    getUser: function(userId) {
        var data = {
            userId: userId
        };
        
        Communicator.socket.emit('getUser', data);
    },
    
    quitUser: function(waveId) {
        var data = {
            waveId: waveId
        };
        
        Communicator.socket.emit('quitWave', data);
    },
            
    createInviteCode: function(waveId) {
        var data = {
            waveId: waveId
        };
        
        Communicator.socket.emit('createInviteCode', data);
    },
            
    onInviteCodeReady: function(data) {
        console.log('Invite url: ' + document.location.protocol + '//' + document.location.host + '/invite/' + data.code);
    }
};