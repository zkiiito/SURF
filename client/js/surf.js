var User = Backbone.Model.extend({
    defaults: {
        name: '',
        avatar: '',
        status: 'offline'
    },
    idAttribute: '_id',
    update: function(data) {
        _.each(data, function(el, idx){
            if (this.idAttribute != idx)
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
        unread: true,
        created_at: null
    },
    idAttribute: '_id',
    initialize: function() {
         this.messages = new MessageCollection(); //nem itt kene
         this.user = app.model.users.get(this.get('userId'));
         this.formatMessage();
         if (!this.isNew()) {
            this.set('unread', this.get('unread') && app.currentUser != this.get('userId'));
         }
    },
    addReply: function(message) {
        if (null == this.messages) {
            this.messages = new MessageCollection();
        }
        this.messages.add(message);
    },
    
    read: function() {
        if (this.get('unread')) {
            this.set('unread', false);
            Communicator.readMessage(this);
        }
    },
    
    formatMessage: function() {
        var msg = this.get('message');
        msg = strip_tags(msg);
        
        //TODO: improve
        var urlRegex = /((https?:\/\/|www\.)[^\s"]+)/g;
        msg = msg.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
        
        msg = nl2br(msg, true);
        
        this.set('messageFormatted', msg);
    }
    
});


var MessageView = Backbone.View.extend({
    initialize: function() {
        this.hasReplyForm = false;
        _.bindAll(this, 'addMessage', 'readMessage', 'replyMessage', 'onReadMessage');
        this.model.messages.bind('add', this.addMessage);//ezt nem itt kene, hanem amikor letrejon ott a messages
        this.model.bind('change:unread', this.onReadMessage);
        
        var date = new Date(this.model.get('created_at'));        
        this.model.set('dateFormatted', date.format('mmm d HH:MM'));
    },
    events: {
        'click': 'readMessage',
        'click a.reply' : 'replyMessage',
        'click a.threadend' : 'replyMessage'
    },
    render: function() {
        var context = _.extend(this.model.toJSON(), {id: this.model.id, user: this.model.user.toJSON()});        
        var template = ich.message_view(context);
        
        this.setElement(template);
        if (!this.model.get('unread')) {
            this.$el.children('table').removeClass('unread');
        }
        
        var userView = new UserView({model: this.model.user});
        this.$el.find('.message-header').html(userView.render().el);
        this.$el.children('div.threadend').hide();
        
        return this;
    },
    
    addMessage: function(message) {
        var view = new MessageView({
            model: message
        });
        
        this.$el.children('.replies').append(view.render().el);
        if (this.model.messages.length == 1) {
            if (this.$el.children('div.replyform').size() == 0)//ha nincs kint a replyform
                this.$el.children('div.threadend').show();
        }
    },

    readMessage: function(e) {
        e.stopPropagation();
        this.model.read();
    },
    
    onReadMessage: function() {
        if (!this.model.get('unread'))
            this.$el.children('table').removeClass('unread');
    },
    
    replyMessage: function(e) {
        e.preventDefault();
        
        $('.message .replyform').find('form').unbind();
        $('.message .replyform').remove();

        var context = _.extend(this.model.toJSON(), {id: this.model.id, user: this.model.user.toJSON()});
        var form = ich.replyform_view(context);

        this.$el.append(form);
        this.$el.children('div.threadend').hide();//ha latszik-ha nem.

        this.$el.find('textarea').keydown(function(e){
            if (!e.shiftKey && 13 == e.keyCode) {
                if ($(this).val().length > 0) {
                    var form = $(this).parents('form');
                    Communicator.sendMessage($('textarea', form).val(), $('[name=wave_id]', form).val(), $('[name=parent_id]', form).val());
                }
                $(this).val('');
                e.preventDefault();
            }
        }).focus();
        
        this.$el.find('a.cancel').click(function(e){
            e.preventDefault();
            var parent = $(this).parents('.notification');//nem lehet tobb notificationon belul
            parent.find('form').unbind();
            if (parent.siblings('.replies').children().size() > 0)
                parent.siblings('.threadend').show();
            parent.remove();
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
    idAttribute: '_id',
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
    
    getUserCount: function() {
        return this.users.length +  ' résztvevő';
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
            this.$el.find('.piros').text('| ' + msgs + ' új üzenet');
        } else {
            this.$el.find('.piros').text('');
            this.$el.removeClass('updated');
        }
    },
    
    updateMessages: function(message) {
        if (message.get('userId') != app.currentUser && message.get('unread')) {
            this.$el.addClass('updated');
        }
    },
    
    changeUsers: function() {
        var usercount = this.model.getUserCount();
        this.$el.find('.usercount').text(usercount);
    },
    
    updateTitle: function() {
        this.$el.find('h2').text(this.model.get('title'));
    }    
});

var WaveView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'setCurrent', 'addMessage', 'addUser', 'removeUser', 'updateTitle', 'showUpdateWave');
        
        this.userViews = [];
        
        this.model.bind('change:current', this.setCurrent);
        this.model.bind('change:title', this.updateTitle);
        
        this.model.messages.bind('add', this.addMessage);
        this.model.users.bind('add', this.addUser);
        this.model.users.bind('remove', this.removeUser);
    },
    events: {
        'click a.editwave' : 'showUpdateWave'
    },
    
    render: function() {
        var context = _.extend(this.model.toJSON(), {
            id: this.model.id
        });
        var template = ich.wave_view(context);
        this.setElement(template);
        this.$el.hide();
        
        this.$el.find('textarea').keydown(function(e){
            if (!e.shiftKey && 13 == e.keyCode) {
                if ($(this).val().length > 0) {
                    var form = $(this).parents('form');
                    Communicator.sendMessage($('textarea', form).val(), $('[name=wave_id]', form).val(), null);
                }
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
        this.$el.find('span.usernames').text(usernames);
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
    },
    
    showUpdateWave: function() {
        return app.view.showUpdateWave();
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
        this.currentUser = new User();
    }
});

var EditWaveView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'show', 'hide', 'setWave');
    },
    events: {
        'click a.close' : 'hide',
        'submit form' : 'editWave'
    },
    
    render: function() {
        var template = ich.editwave_view();
        this.setElement(template);
        this.$el.hide();
        return this;
    },
    
    initUserSuggest: function() {
        if (this.inited) return;
        var userArray = [];
        
        app.model.users.each(function(user){
            var obj = {id: user.id, name: user.get('name')};
            //hogy?
            if (user.id == app.currentUser) {
                obj.readonly = true;
            }
            
            userArray.push(obj);
        }, this);
        
        this.$el.find('#editwave-users').tokenInput(userArray, {
            theme: "facebook",
            preventDuplicates: true,
            hintText: "Írj be egy felhasználónevet.",
            noResultsText: "Nincs ilyen felhasználónk.",
            searchingText: "Keresés..."
        });  
        this.inited = true;
    },
    
    updateUserSuggest: function() {
        this.initUserSuggest();
        var suggest = this.$el.find('#editwave-users');
        suggest.tokenInput('clear');
        
        if (this.wave) {
            this.wave.users.each(function(user){
                suggest.tokenInput('add', {id: user.id, name: user.get('name'), readonly: true});
            });
        } else {
            var currentUser = app.model.users.get(app.currentUser);
            suggest.tokenInput('add', {id: currentUser.id, name: currentUser.get('name'), readonly: true});
        }
        
    },
    
    show: function() {
        if (this.wave) {
            this.$el.find('input[name=title]').val(this.wave.get('title'));
            this.$el.find('h2').text('Beszélgetés szerkesztése');
            this.$el.find('#editwave-submit').text('Mentés');
        } else {
            this.$el.find('input[name=title]').val('');
            this.$el.find('h2').text('Új beszélgetés');
            this.$el.find('#editwave-submit').text('Létrehozás');
        }
        
        this.updateUserSuggest();

        //this.$el.find('form').reset();???
        this.$el.show();
        $('#darken').show();
        return false;
    },
    
    hide: function() {
        this.$el.hide();
        $('#darken').hide();
        return false;
    },
    
    setWave: function(waveId) {
        this.wave = app.model.waves.get(waveId);
    },
    
    editWave: function() {
        var title = this.$el.find('#editwave-title').val();
        var users = this.$el.find('#editwave-users').tokenInput('get');
        var userIds = _.pluck(users, 'id');
        //userIds.push(app.currentUser);
        
        if (this.wave) {
            Communicator.updateWave(this.wave.id, title, userIds);
        } else {
            Communicator.createWave(title, userIds);
        }
        
        return this.hide();
    }
});

var SurfAppView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'addMessage', 'showCreateWave', 'showUpdateWave', 'hideOverlays');
        this.model.waves.bind('add', this.addWave);
        this.model.waves.bind('reset', this.resetWaves, this);
        this.model.messages.bind('reset', this.resetMessages, this);
        this.model.currentUser.bind('all', this.changeCurrentUser, this);
        //this.createView = null;//gag
        this.render();
    },
    events: {
        'click a.addwave' : 'showCreateWave',
        'click #darken' : 'hideOverlays'
    },        
    
    render: function() {
        this.setElement($('body'));    
        this.editWaveView = new EditWaveView();
        this.$el.append(this.editWaveView.render().el);
        return this;
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
        if (wave)
            wave.addMessage(message);
    },
    
    resetMessages: function() {
        this.model.messages.map(this.addMessage);
    },
    
    showCreateWave: function() {
        this.editWaveView.setWave(null);
        this.editWaveView.show();
        return false;
    },
    
    showUpdateWave: function() {
        this.editWaveView.setWave(app.currentWave);
        this.editWaveView.show();
        return false;
    },
    
    hideOverlays: function() {
        $('#darken').hide();
        $('.overlay').hide();
        return false;
    },
    
    changeCurrentUser: function() {
        var template = new UserView({model: this.model.currentUser});
        this.$el.find('#currentuser').html('').append(template.render().el).append(' <p>' + this.model.currentUser.get('name') + '</p>');
        return false;
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
        if (app.model.waves.get(id)) {
            if (app.currentWave) {
                app.model.waves.get(app.currentWave).set('current', false);
            }
            app.model.waves.get(id).set('current', true);
            app.currentWave = id;
        } else {
            this.navigate("");
        }
    },

    removeWave: function(cid) {
    //app.model.movies.remove(app.model.movies.getByCid(cid));
    }
});


var Communicator = {
    socket: null,
    initialize: function() {
        if (typeof io == 'undefined') return;
        
        //var id = prompt('hanyas vagy?', Math.ceil(Math.random() * 50)) * 1 -1;
        Communicator.socket = new io.connect(document.location.href);
        //Communicator.socket.emit('auth', id);
        
        Communicator.socket.on('init', function(data){
            console.log(data.me);
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
        }
        var message = new Message(data);
        app.model.waves.get(data.waveId).addMessage(message);
    },
    
    onUpdateUser: function(data) {
        var user = data.user;
        console.log(user);
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
        {_id:1,name: 'csabcsi',avatar: 'images/head3.png'},
        {_id:2,name: 'leguan',avatar: 'images/head2.png'},
        {_id:3,name: 'tibor',avatar: 'images/head5.png'},
        {_id:4,name: 'klara',avatar: 'images/head4.png'}
    ];
    
    var waves = [{_id:1,title: 'Csillag-delta tejbevávé', userIds: [1,2,3,4]}];
    
    var messages = [
        {_id:1, waveId:1, userId:1, message: 'Tenderloin corned beef venison sirloin, pork loin cow bresaola. Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Beef corned beef ham pork turkey pork chop, prosciutto fatback short loin meatloaf filet mignon turducken pastrami frankfurter chuck. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {_id:2, waveId:1, userId:1, message: 'Tenderloin corned beef venison sirloin, pork loin cow bresaola. Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Beef corned beef ham pork turkey pork chop, prosciutto fatback short loin meatloaf filet mignon turducken pastrami frankfurter chuck. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {_id:3, waveId:1, userId:3, parentId: 1, message: 'Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. '},
        {_id:4, waveId:1, userId:1, parentId: 1, message: 'Herp derp'},
        {_id:5, waveId:1, userId:2, parentId: 2, message: 'Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {_id:6, waveId:1, userId:4, parentId: 5, message: 'Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'}
    ];
    
    app.model.users.reset(users);    
    app.currentUser = 3;
    
    app.model.waves.reset(waves);
    
    app.model.messages.reset(messages);

    document.location = $('.waveitem:last a').attr('href');
}