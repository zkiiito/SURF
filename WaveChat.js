http = require('http');
url = require('url');
path = require('path');
fs = require('fs');
io = require('socket.io');
_ = require('underscore');
Backbone = require('backbone');

webServer = http.createServer(function(req, res){
    var uri = url.parse(req.url).pathname;    
    var abspath = path.join(process.cwd(), 'client/', uri);
    //kiakad a hulyesegtol
    abspath = abspath.replace('node', '../node_modules/');

    if(req.url == '/'){
        abspath += 'index.html';
    }

    //gyorsitas: inditaskor felderiti a konyvtarat, becacheli a tartalmat
    //es csak azt szolgalja ki, aminek a neve benn a listaban
    fs.exists(abspath, function(exists){
        if(!exists){
            res.writeHead(404, {
                "Content-Type":"text/html"
            });
            res.write('<html><body>404</body></html>');
            res.end('');
            return;
        }

        fs.readFile(abspath, "binary", function(err, file){

            var filetype = path.extname(abspath);
			
            if(filetype == '.html'){
                res.writeHead(200, {
                    "Content-Type":"text/html"
                });
            } else if(filetype == '.js'){
                res.writeHead(200, {
                    "Content-Type":"text/script"
                });
            } else if(filetype == '.css'){
                res.writeHead(200, {
                    "Content-Type":"text/css"
                });
            } else{
                res.writeHead(200, {
                    "Content-Type":"text"
                });
            }
            res.write(file, "binary");
            res.end('');
        });
    });
	
});



var User = Backbone.Model.extend({
    defaults: {
        name: '',
        avatar: '',
        status: 'offline'
    },
    initialize: function() {
        this.waves = new WaveCollection();
    },
    
    init: function() {
        var friends = this.getFriends();
        
        this.socket.emit('init', {
           me: this,
           users: friends,
           waves: this.waves,
           messages: messages
        });
        
        this.notifyFriends();
    },
    
    disconnect: function() {
        this.set({status: 'offline'});
        this.notifyFriends();
    },
    
    getFriends: function() {//sajat magat nem adhatja vissza!
        var friends = this.waves.reduce(function(friends, wave){
            var uids = wave.get('userIds');
            _.each(uids, function(item){
                if (item != this.get('id')) {
                    var user = waveServer.users.get(item);
                    friends.add(user);
                }
            }, this);
            
            return friends;
        }, new UserCollection(), this);
        
        return friends;
    },
    
    send: function(msgtype, msg) {
        if (this.socket) {
            this.socket.emit(msgtype, msg);
        }
    },
    
    notifyFriends: function(){
        var friends = this.getFriends();

        friends.each(function(friend){
           friend.send('updateUser', {
               user: this
           });
        }, this);        
    }
    
    //validate: function(){
    //check: ?
    //}
});


var UserCollection = Backbone.Collection.extend({
    model: User 
});

var Message = Backbone.Model.extend({
    defaults: {
        userId: null,
        waveId: null,
        parentId: null,
        message: '',
        unread: true//?
    }
    
    //validate: function(){
    //check: userId, waveId, parentId
    //}
});

var Wave = Backbone.Model.extend({
    defaults: {
        title: '',
        userIds: [],
        messageCounter: 100
    },
    initialize: function() {
        this.users = new UserCollection();
        if (this.get('userIds')) {
            var uids = this.get('userIds');
            _.each(uids, function(item){
                var user = waveServer.users.get(item);
                this.addUser(user);
                user.waves.add(this);
            }, this);
        }
    },
    
    addMessage: function(message) {
        //save, save unread
        
        //id savekor lesz, idopontot is akkor kell hozarendelni
        var counter = this.get('messageCounter');
        this.set({messageCounter: counter + 1});
        //message.id = counter;
        message.set({id: counter});
        
        this.users.each(function(user){
            user.send('message', message);
        }, message);
    },
    
    addUser: function(user) {
        this.users.add(user);
        //emit join?
    },
    
    notifyUsers: function() {
        this.users.each(function(user){
           user.send('updateWave', {
               wave: this
           });
        }, this);        
    }
    
    //validate: function() {
    //check userids
    //}
});

var WaveCollection = Backbone.Collection.extend({
    model: Wave    
});

var WaveServer = Backbone.Model.extend({
    initialize: function() {
        this.users = new UserCollection();
        this.waves = new WaveCollection();
        
        //query users - nem biztos h kell, lehet eleg akkor lekerni amikor belep vki... de egyelore jo lesz igy.
        //query waves
        //init users
        //init waves
        var port = process.env.PORT || 8000;
        console.log('port: ' + port);
        webServer.listen(port);
    }
});


waveServer = new WaveServer();

function test() {
var users = [
        {id:1,name: 'csabcsi',avatar: 'images/head3.png'},
        {id:2,name: 'leguan',avatar: 'images/head2.png'},
        {id:3,name: 'tibor',avatar: 'images/head5.png'},
        {id:4,name: 'klara',avatar: 'images/head4.png'}
    ];
    
var uids = [1,2,3,4];
    
    for (var i = 5; i <= 100; i++) {
        var u = {id: i, name: 'teszt' + i, avatar: 'images/head' + (i%6 + 1) + '.png'};
        users.push(u);
        uids.push(i);
    }
    
    var waves = [{id:1,title: 'Csillag-delta tejbevávé', userIds: uids}];
    
    waveServer.users.reset(users);    
    waveServer.waves.reset(waves);
}

var messages = [
    {id:1, waveId:1, userId:1, message: 'Tenderloin corned beef venison sirloin, pork loin cow bresaola. Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Beef corned beef ham pork turkey pork chop, prosciutto fatback short loin meatloaf filet mignon turducken pastrami frankfurter chuck. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
    {id:2, waveId:1, userId:1, message: 'Tenderloin corned beef venison sirloin, pork loin cow bresaola. Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Beef corned beef ham pork turkey pork chop, prosciutto fatback short loin meatloaf filet mignon turducken pastrami frankfurter chuck. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
    {id:3, waveId:1, userId:3, parentId: 1, message: 'Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. '},
    {id:4, waveId:1, userId:1, parentId: 1, message: 'Herp derp'},
    {id:5, waveId:1, userId:2, parentId: 2, message: 'Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
    {id:6, waveId:1, userId:4, parentId: 5, message: 'Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'}
];

test();

var socket = io.listen(webServer);
// assuming io is the Socket.IO server object, HEROKU
socket.configure(function () { 
    socket.set("transports", ["xhr-polling"]); 
    socket.set("polling duration", 10); 
});

//torolt funkciok a regibol: nick, topic, part, invite, joinchan

socket.sockets.on('connection', function(client){
    console.log("connection works!");
    var address = client.handshake.address; // Get client ip address and port.
    var curUser = new User();//temporary
    
    client.on('auth', function(data){
        //TODO: login command: query user, auto-join channels, send who
        var id = data *1;
        curUser = waveServer.users.get(id);
        if (curUser.socket)
        {
            curUser.socket.disconnect();
        }
        
        curUser.set({status: 'online'});
        console.log(curUser.get('name') + ' logged in');
        curUser.socket = client;
        curUser.ip = client.handshake.address.address;
        
        curUser.init();        
    });

    client.on('disconnect', function(data) {
        console.log(curUser.get('name') + ' disconnected');
        curUser.disconnect();
    });
    
    client.on('message', function(data) {
        console.log(curUser.get('name') + ' message ' + data);
        
        var msg = new Message(data);
        
        var wave = waveServer.waves.get(msg.get('waveId'));
        wave.addMessage(msg);
    });
    
    client.on('createWave', function(data) {
        console.log('createWave ' + data.title);
        
        var wave = new Wave(data);
        //factorybol!
        wave.id = 100 + Math.floor(Math.random() * 100);
        wave.set({id: wave.id});
        waveServer.waves.add(wave);
        wave.notifyUsers();
    });
});