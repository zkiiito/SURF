var User = Backbone.Model.extend({
    defaults: {
        name: '',
        avatar: '',
        status: 'offline'
    },
    
    update: function(data) {
        _.each(data, function(el, idx){
            if ('id' != idx)
                this.set(idx, el);
        }, this);
    }
});


var UserCollection = Backbone.Collection.extend({
    model: User 
});


var UserView = Backbone.View.extend({
    initialize: function(){
        _.bindAll(this, 'render', 'updateStatus');
        this.model.bind('change:status', this.updateStatus);
    },    
    
    render: function() {
        var template = ich.user_view(this.model.toJSON());
        this.setElement(template);        
        return this;
    },
    
    updateStatus: function() {
        this.$el.removeClass('online offline').addClass(this.model.get('status'));
        return this;
    }
});


var Message = Backbone.Model.extend({
    defaults: {
        userId: null,
        waveId: null,
        parentId: null,
        message: '',
        unread: true
    },
    initialize: function() {
         this.messages = new MessageCollection(); //nem itt kene
         this.user = app.model.users.get(this.get('userId'));
         this.set('unread', app.currentUser != this.get('userId'));
         
         //TODO: csak valid idk
         if (null == this.id) {
             this.id = this.cid;
         }
    },
    addReply: function(message) {
        if (null == this.messages) {
            this.messages = new MessageCollection();
        }
        this.messages.add(message);
    }
    
});


var MessageView = Backbone.View.extend({
    initialize: function() {
        this.hasReplyForm = false;
        _.bindAll(this, 'addMessage', 'readMessage', 'replyMessage');
        this.model.messages.bind('add', this.addMessage);//ezt nem itt kene, hanem amikor letrejon ott a messages
    },
    events: {
        'click': 'readMessage',
        'click a.reply' : 'replyMessage'
    },
    render: function() {
        var context = _.extend(this.model.toJSON(), {id: this.model.id, user: this.model.user.toJSON()});        
        var template = ich.message_view(context);
        
        this.setElement(template);
        if (!this.model.get('unread')) {
            this.$el.removeClass('unread');
        }
        
        var userView = new UserView({model: this.model.user});
        this.$el.prepend(userView.render().el);
        
        return this;
    },
    
    addMessage: function(message) {
        var view = new MessageView({
            model: message
        });
        
        this.$el.children('.replies').append(view.render().el);
    },

    readMessage: function(e) {
        e.stopPropagation();
        if (this.model.get('unread')) {
            this.model.set('unread', false);
            this.$el.removeClass('unread');
        }
    },
    
    replyMessage: function(e) {
        e.preventDefault();
        
        $('.message .add-message').unbind().remove(); //eleg igy unbindelni?

        var context = _.extend(this.model.toJSON(), {id: this.model.id, user: this.model.user.toJSON()});
        var form = ich.replyform_view(context);

        this.$el.append(form);

        this.$el.find('textarea').keydown(function(e){
            if (e.shiftKey && 13 == e.keyCode) {
                var form = $(this).parents('form');
                Communicator.sendMessage($('textarea', form).val(), $('[name=wave_id]', form).val(), $('[name=parent_id]', form).val());
                $(this).val('');
                e.preventDefault();
            }
        }).focus();
        
        this.$el.find('a.cancel').click(function(e){
            e.preventDefault();
            $(this).parents('form').unbind().remove();
            return false;
        })
        
       return false;
    }
});

var MessageCollection = Backbone.Collection.extend({
    model: Message
});


var Wave = Backbone.Model.extend({
    defaults: {
        title: '',
        userIds: [],
        current: false
    },
    initialize: function() {
        this.messages = new MessageCollection();
        this.users = new UserCollection();
        if (this.get('userIds')) {
            var uids = this.get('userIds');
            this.addUsers(uids);
        }
    },
    
    addMessage: function(message) {
        message.set('waveId', this.id);
        this.messages.add(message);
        
        if (null != message.get('parentId')) {
            this.messages.get(message.get('parentId')).addReply(message);
        }
    },
    
    addUser: function(user) {
        this.users.add(user);
    },
    
    addUsers: function(ids) {
        _.each(ids, function(item){
            var user = app.model.users.get(item);
            this.addUser(user);
        }, this);        
    },
    
    getUnreadCount: function() {
        return this.messages.reduce(function(unread, msg){return unread + (msg.get('unread') ? 1 : 0)}, 0);
    },
    
    getUserNames: function() {
        return this.users.pluck('name').join(', ');
    },
    
    update: function(data) {
        this.set('title', data.title);
        
        var userIds = this.get('userIds');
        if (data.userIds != userIds) {
            var newIds = _.difference(data.userIds, userIds);
            var deletedIds = _.difference(userIds, data.userIds);
            this.users.remove(deletedIds);
            this.addUsers(newIds);
            this.set('userIds', data.userIds);
        }
    }    
});

var WaveListView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'setCurrent', 'countMessages', 'updateMessages', 'changeUsers', 'updateTitle');
        this.model.bind('change:current', this.setCurrent);
        this.model.bind('change:title', this.updateTitle);
        
        this.model.messages.bind('change:unread', this.countMessages);
        this.model.messages.bind('add', this.countMessages);
        this.model.messages.bind('add', this.updateMessages);
        
        this.model.users.bind('add', this.changeUsers);
        this.model.users.bind('remove', this.changeUsers);
    },
    
    render: function() {
        var context = _.extend(this.model.toJSON(), {
            id: this.model.id
        });
        var template = ich.wave_list_view(context);
        this.setElement(template);
        this.changeUsers();
        return this;
    },
    
    setCurrent: function() {
        if (this.model.get('current')) {
            $('.waveitem').removeClass('open');
            this.$el.addClass('open');
        }
    },
    
    countMessages: function() {
        var msgs = this.model.getUnreadCount();
        if (msgs > 0) {
            this.$el.find('.sarga').text('| ' + msgs + ' új üzenet');
        } else {
            this.$el.find('.sarga').text('');
            this.$el.removeClass('updated');
        }
    },
    
    updateMessages: function(message) {
        if (message.get('userId') != app.currentUser) {
            this.$el.addClass('updated');
        }
    },
    
    changeUsers: function() {
        var usernames = this.model.getUserNames();
        this.$el.find('.usernames').text(usernames);
    },
    
    updateTitle: function() {
        this.$el.find('h2').text(this.model.get('title'));
    }    
});

var WaveView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'setCurrent', 'addMessage', 'addUser', 'removeUser', 'updateTitle');
        
        this.userViews = [];
        
        this.model.bind('change:current', this.setCurrent);
        this.model.bind('change:title', this.updateTitle);
        
        this.model.messages.bind('add', this.addMessage);
        this.model.users.bind('add', this.addUser);
        this.model.users.bind('remove', this.removeUser);
    },
    
    render: function() {
        var context = _.extend(this.model.toJSON(), {
            id: this.model.id
        });
        var template = ich.wave_view(context);
        this.setElement(template);
        this.$el.hide();
        
        this.$el.find('textarea').keydown(function(e){
            if (e.shiftKey && 13 == e.keyCode) {
                var form = $(this).parents('form');
                Communicator.sendMessage($('textarea', form).val(), $('[name=wave_id]', form).val(), null);
                $(this).val('');
                e.preventDefault();
            }
        });
        
        this.model.users.each(this.addUser);
        
        return this;
    },
    
    setCurrent: function() {
        if (this.model.get('current')) {
            $('.wave').hide();
            this.$el.show();
        }
    },
    
    addMessage: function(message) {
        if (null == message.get('parentId')) {
            var view = new MessageView({
                model: message
            });            
            $('.messages', this.$el).append(view.render().el);
        }
    },
    
    changeUsers: function() {
        var usernames = this.model.getUserNames();
        this.$el.find('p.meta').text(usernames);
    },
    
    addUser: function(user) {
        this.changeUsers();
        var userView = new UserView({model: user});
        this.userViews[user.id] = userView;
        
        this.$el.find('.heads').append(userView.render().el);
    },
    
    removeUser: function(user) {
        this.changeUsers();
        this.userViews[user.id].remove();
        delete this.userViews[user.id];
    },
    
    updateTitle: function() {
        this.$el.find('h2').text(this.model.get('title'));
    }
});



var WaveCollection = Backbone.Collection.extend({
    model: Wave    
});


var SurfAppModel = Backbone.Model.extend({
    initialize: function() {
        this.waves = new WaveCollection();
        this.users = new UserCollection();
        this.messages = new MessageCollection();
    }
});

var SurfAppView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'addMessage');
        this.model.waves.bind('add', this.addWave);
        this.model.waves.bind('reset', this.resetWaves, this);
        this.model.messages.bind('reset', this.resetMessages, this);
    },
    
    render: function() {
    //nem igazan szukseges, kint van minden -> bar lehet ossze kene rakni inkabb?
    },
    
    addWave: function(wave) {
        var listView = new WaveListView({
            model: wave
        });
        $('#wave-list').append(listView.render().el);
		
        var view = new WaveView({
            model: wave
        });
        $('#wave-container').append(view.render().el);
	
    },
    
    resetWaves: function() {
        this.model.waves.map(this.addWave);
    },
    
    addMessage: function(message) {
        var wave = this.model.waves.get(message.get('waveId'));
        wave.addMessage(message);
    },
    
    resetMessages: function() {
        this.model.messages.map(this.addMessage);
    }
});


var SurfAppRouter = Backbone.Router.extend({
    defaults: {
        currentWave: null,
        currentUser: null
    },
    initialize: function() {
        this.model = new SurfAppModel();
        this.view = new SurfAppView({
            model: this.model
        });
    },
    
    routes: {
        'wave/:number': "showWave"
    },
    
    addWave: function() {
        app.model.waves.add(new Wave({
            id: Math.floor(Math.random() * 1100),
            title: 'Csudivávé ' + Math.floor(Math.random()*11),
            usernames: 'leguan, tibor, klara, csabcsi',
            unreadMessages: 3
        }));
    //this.navigate('movies'); // reset location so we can trigger again
    },
    
    showWave: function(id) {
        if (app.currentWave) {
            app.model.waves.get(app.currentWave).set('current', false);
        }
        app.model.waves.get(id).set('current', true);
        app.currentWave = id;        
    },

    removeWave: function(cid) {
    //app.model.movies.remove(app.model.movies.getByCid(cid));
    }
});


var Communicator = {
    socket: null,
    initialize: function() {
        if (typeof io == 'undefined') return;
        
        Communicator.socket = new io.connect(document.location.href);
        Communicator.socket.emit('auth', Math.ceil(Math.random() * 4) );
        
        Communicator.socket.on('init', function(data){
            app.currentUser = data.me.id;
            data.users.push(data.me);
            app.model.users.reset(data.users);
            app.model.waves.reset(data.waves);
            app.model.messages.reset(data.messages);

            document.location = $('.waveitem:last a').attr('href');
        });
        
        Communicator.socket.on('message', Communicator.onMessage);
        
        Communicator.socket.on('disconnect', function(){
            alert('disconnected');
            document.location.href = 'http://localhost:8000';
        });
        
        Communicator.socket.on('updateUser', Communicator.onUpdateUser);
        Communicator.socket.on('updateWave', Communicator.onUpdateWave);

        Communicator.socket.on('message2', function(data){    
            console.log('Full message from server: ' + data);

            var a = data.indexOf(' ');
            var someNick = data.slice(0, a); // Pull some nickname off of message.
            var fullcommand = data.slice(a+1, data.length);
            a = fullcommand.indexOf(' '); // find index of next space.
            var comtype = fullcommand.slice(0, a);
            var params = fullcommand.slice(a+1, fullcommand.length);
			
            console.log("Client received command: "+fullcommand);
			
            switch(comtype){
                case "PRIVMSG"://valaki irt olyanba amiben bennevagyok
                    Communicator.onMsg(params);
                    break;
                case "NICK"://valaki nicket cserelt
                    nick(someNick, params);
                    break;
                case "JOIN"://valaki belepett
                    Communicator.onJoin(params);
                    break;
                case "PART"://valaki elhagyta a wavet
                    part(someNick, params);
                    break;
                case "TOPIC":
                    topic(someNick, params);
                    break;
                case "QUIT"://valaki kilepett
                    quit(someNick, params);
                    break;
                default:
                    nocommand(comtype);
            }  
        });
    //beginChat(socket);
    },
    
    sendMessage: function(message, waveId, parentId) {
        var msg = new Message({
            userId: app.currentUser, 
            waveId: waveId, 
            message: message, 
            parentId: parentId
        });
        Communicator.socket.emit('message', msg);
    },
    
    onJoin: function(data) {
        //data: user_id, wave_id, kell-e full userinfo?
        //var user = app.model.users.at(data.userId);
        //app.model.waves.at(data.waveId).addUser(user);
    },
    
    onMessage: function(data) {
        var message = new Message(data);
        app.model.waves.get(data.waveId).addMessage(message);
    },
    
    onUpdateUser: function(data) {
        var user = data.user;
        
        if (app.model.users.get(user.id)) {
            app.model.users.get(user.id).update(user);
        } else {
            app.model.users.add(new User(user));
        }
    },
    
    onUpdateWave: function(data) {
        var wave = data.wave;
        
        if (app.model.waves.get(wave.id)) {
            app.model.waves.get(wave.id).update(wave);
        } else {
            app.model.waves.add(new Wave(wave));
        }        
    }
}



$(function() {
    var surfApp = new SurfAppRouter();
    window.app = surfApp;
    Backbone.history.start();
    Communicator.initialize();
});

function test() {
    var users = [
        {id:1,name: 'csabcsi',avatar: 'images/head3.png'},
        {id:2,name: 'leguan',avatar: 'images/head2.png'},
        {id:3,name: 'tibor',avatar: 'images/head5.png'},
        {id:4,name: 'klara',avatar: 'images/head4.png'}
    ];
    
    var waves = [{id:1,title: 'Csillag-delta tejbevávé', userIds: [1,2,3,4]}];
    
    var messages = [
        {id:1, waveId:1, userId:1, message: 'Tenderloin corned beef venison sirloin, pork loin cow bresaola. Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Beef corned beef ham pork turkey pork chop, prosciutto fatback short loin meatloaf filet mignon turducken pastrami frankfurter chuck. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {id:2, waveId:1, userId:1, message: 'Tenderloin corned beef venison sirloin, pork loin cow bresaola. Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Beef corned beef ham pork turkey pork chop, prosciutto fatback short loin meatloaf filet mignon turducken pastrami frankfurter chuck. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {id:3, waveId:1, userId:3, parentId: 1, message: 'Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. '},
        {id:4, waveId:1, userId:1, parentId: 1, message: 'Herp derp'},
        {id:5, waveId:1, userId:2, parentId: 2, message: 'Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {id:6, waveId:1, userId:4, parentId: 5, message: 'Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'}
    ];
    
    app.model.users.reset(users);    
    app.currentUser = 3;
    
    app.model.waves.reset(waves);
    
    app.model.messages.reset(messages);

    document.location = $('.waveitem:last a').attr('href');
}