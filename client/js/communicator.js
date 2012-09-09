var Communicator = {
    socket: null,
    initialize: function() {
        if (typeof io == 'undefined') return;
        
        //var id = prompt('hanyas vagy?', Math.ceil(Math.random() * 50)) * 1 -1;
        Communicator.socket = new io.connect(document.location.href);
        //Communicator.socket.emit('auth', id);
        
        Communicator.socket.on('init', function(data){
            //console.log(data.me);
            app.currentUser = data.me._id;
            data.users.push(data.me);
            app.model.users.reset(data.users);
            app.model.waves.reset(data.waves);
            app.model.messages.reset(data.messages);
            app.model.currentUser.set(app.model.users.get(app.currentUser).toJSON());

            //if ($('a.waveitem').size() > 0)
                document.location = $('a.waveitem:last').attr('href');
        });
        
        Communicator.socket.on('message', Communicator.onMessage);
        
        Communicator.socket.on('disconnect', function(){
            alert('disconnected');
            var url = 'http://' + document.location.host;
            if (document.location.port)
                url += document.location.port;
            document.location.href = url;
        });
        
        Communicator.socket.on('updateUser', Communicator.onUpdateUser);
        Communicator.socket.on('updateWave', Communicator.onUpdateWave);
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
        
        console.log(data);
        var message = new Message(data);
        app.model.messages.add(message);
        app.model.waves.get(data.waveId).addMessage(message);
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
    
    getMessages: function(wave, minRootId, maxRootId) {
        var data = {
            waveId: wave.id,
            minRootId: minRootId,
            maxRootId: maxRootId
        }
        
        Communicator.socket.emit('getMessages', data);
    }
}