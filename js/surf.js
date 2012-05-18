var User = Backbone.Model.extend({
    defaults: {
        name: '',
        avatar: '',
        status: 'offline'
    }

});


var UserCollection = Backbone.Collection.extend({
    model: User 
});


var UserView = Backbone.View.extend({
    render: function() {
        var template = ich.user_view(this.model.toJSON());
        this.setElement(template);
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
        _.bindAll(this, 'addMessage', 'readMessage');
        this.model.messages.bind('add', this.addMessage);//ezt nem itt kene, hanem amikor letrejon ott a messages
    },
    events: {
        'click': 'readMessage'
    },
    render: function() {
        var context = _.extend(this.model.toJSON(), {id: this.model.id, user: this.model.user.toJSON()});        
        var template = ich.message_view(context);
        
        this.setElement(template);
        if (!this.model.get('unread')) {
            this.$el.removeClass('unread');
        }
        
        var userTemplate = ich.user_view(this.model.user.toJSON());
        this.$el.prepend(userTemplate);
        
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
    }
});

var MessageCollection = Backbone.Collection.extend({
    model: Message
});


var Wave = Backbone.Model.extend({
    defaults: {
        current: false
    },
    initialize: function() {
        this.messages = new MessageCollection();
        this.users = new UserCollection();
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
    
    getUnreadCount: function() {
        return this.messages.reduce(function(unread, msg){ return unread + (msg.get('unread') ? 1 : 0)}, 0);
    },
    
    getUserNames: function() {
        return this.users.pluck('name').join(', ');
    }
});

var WaveListView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'setCurrent', 'countMessages', 'updateMessages', 'changeUsers');
        this.model.bind('change:current', this.setCurrent);
        
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
    }
});

var WaveView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'setCurrent', 'addMessage', 'addUser', 'removeUser');
        
        this.userViews = [];
        
        this.model.bind('change:current', this.setCurrent);
        
        this.model.messages.bind('add', this.addMessage);
        this.model.users.bind('add', this.addUser);
        //this.model.users.bind('remove', this.changeUsers);
    },
    
    render: function() {
        var context = _.extend(this.model.toJSON(), {
            id: this.model.id
        });
        var template = ich.wave_view(context);
        this.setElement(template);
        this.$el.hide();
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
            console.log('nullparent');
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
        this.userViews.push(userView);
        
        this.$el.find('.heads').append(userView.render().el);
    },
    
    removeUser: function(user) {
        this.changeUsers();
    }
});



var WaveCollection = Backbone.Collection.extend({
    model: Wave    
});


var SurfAppModel = Backbone.Model.extend({
    initialize: function() {
        this.waves = new WaveCollection();
        this.users = new UserCollection();
    }
});

var SurfAppView = Backbone.View.extend({
    initialize: function() {
        this.model.waves.bind('add', this.addWave);
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

$(function() {
    var surfApp = new SurfAppRouter();
    window.app = surfApp;
    Backbone.history.start();
    
    test();
});

function test() {
    var u1 = new User({id:1,name: 'csabcsi',avatar: 'images/head3.png'});
    var u2 = new User({id:2,name: 'leguan',avatar: 'images/head2.png'});
    var u3 = new User({id:3,name: 'tibor',avatar: 'images/head5.png'});
    var u4 = new User({id:4,name: 'klara',avatar: 'images/head4.png'});
    
    app.model.users.add(u1);
    app.model.users.add(u2);
    app.model.users.add(u3);
    app.model.users.add(u4);
    
    app.currentUser = 3;
    
    var w = new Wave({id:1,title: 'Csillag-delta tejbevávé'});
    app.model.waves.add(w);    
    
    w.addUser(u1);
    w.addUser(u2);
    w.addUser(u3);
    w.addUser(u4);
    
    w.addMessage(new Message({id:1, userId:1, message: 'Tenderloin corned beef venison sirloin, pork loin cow bresaola. Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Beef corned beef ham pork turkey pork chop, prosciutto fatback short loin meatloaf filet mignon turducken pastrami frankfurter chuck. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'}));
    w.addMessage(new Message({id:2, userId:1, message: 'Tenderloin corned beef venison sirloin, pork loin cow bresaola. Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Beef corned beef ham pork turkey pork chop, prosciutto fatback short loin meatloaf filet mignon turducken pastrami frankfurter chuck. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'}));
    w.addMessage(new Message({id:3, userId:3, parentId: 1, message: 'Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. '}));
    w.addMessage(new Message({id:4, userId:1, parentId: 1, message: 'Herp derp'}));
    w.addMessage(new Message({id:5, userId:2, parentId: 2, message: 'Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'}));
    w.addMessage(new Message({id:6, userId:4, parentId: 5, message: 'Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'}));
    

    
    document.location = $('.waveitem:last a').attr('href');
}