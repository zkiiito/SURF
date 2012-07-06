http = require('http');
url = require('url');
path = require('path');
fs = require('fs');
io = require('socket.io');
_ = require('underscore');
Backbone = require('backbone');

webServer = http.createServer(function(req, res){
    var uri = url.parse(req.url).pathname;
    var abspath = path.join(process.cwd(), '../', uri);

    if(req.url == '/'){
        abspath += 'index.html';
    }

    path.exists(abspath, function(exists){
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
    }
});


var UserCollection = Backbone.Collection.extend({
    model: User 
});

var Wave = Backbone.Model.extend({
    defaults: {
        title: ''
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
        //save, emit
    },
    
    addUser: function(user) {
        this.users.add(user);
        //emit join
    }
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
        webServer.listen(8000);
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
    
    var waves = [{id:1,title: 'Csillag-delta tejbevávé', userIds: [1,2,3,4]}];
    
    var messages = [
        {id:1, waveId:1, userId:1, message: 'Tenderloin corned beef venison sirloin, pork loin cow bresaola. Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Beef corned beef ham pork turkey pork chop, prosciutto fatback short loin meatloaf filet mignon turducken pastrami frankfurter chuck. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {id:2, waveId:1, userId:1, message: 'Tenderloin corned beef venison sirloin, pork loin cow bresaola. Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Beef corned beef ham pork turkey pork chop, prosciutto fatback short loin meatloaf filet mignon turducken pastrami frankfurter chuck. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {id:3, waveId:1, userId:3, parentId: 1, message: 'Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. '},
        {id:4, waveId:1, userId:1, parentId: 1, message: 'Herp derp'},
        {id:5, waveId:1, userId:2, parentId: 2, message: 'Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {id:6, waveId:1, userId:4, parentId: 5, message: 'Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'}
    ];
    
    waveServer.users.reset(users);    
    waveServer.waves.reset(waves);
    
    //app.model.messages.reset(messages);
}

test();

var clients = [];
function userData(ip, socket) {
    this.socket = socket;
    this.nick = "";
    this.uid = ip;
    this.ip = ip;
    this.channels = []; // chanData[];
    this.mode = new userModeData();
    return this; // need these return statements, otherwise nothing is passed back.
}

var channels = [];
function chanData() {
    this.name = "";
    this.topic = "";
    this.users = []; // userData[]
    this.invited = []; // Invited users. Indices are nicks, values are booleans.
    this.mode = new channelModeData();
    return this; // need these return statements, otherwise nothing is passed back.
}

function channelModeData(){
    this.operators = []; // array of operators (nicks)?
    this.private_chan = false; // boolean
    this.secret_chan = false; // boolean
    this.invite_only_chan = true; // boolean
    this.topic_mod_by_op_only = false; // boolean
    this.no_mes_from_outsiders = true; // boolean
    this.moderated_chan = false; // boolean
    this.user_limit = null; // integer.
    this.ban_mask = []; // array of banned users (nicks)?
    this.voice = []; // array of booleans, indices are nicknames (strings)
    this.key = ""; // string?
    return this; // need these return statements, otherwise nothing is passed back.
}

function userModeData(){
    this.invisible = false; // boolean
    this.operatorOf = []; // Array of channel names user is operator of?
    return this; // need these return statements, otherwise nothing is passed back.
}

var socket = io.listen(webServer);

var privmsg = function(user, params) {
    console.log("PRIVATE MESSAGE!!");
    console.log(user);
    console.log(params);

    var channel = params.split(' ')[0];
    var dest = [];

    if(channel[0] === '#'){
        if(channels[channel] != undefined){
            dest = channels[channel].users;
        }
    } else {
        return;
    }

    var sendmsg = ":" + user.nick + " PRIVMSG " + params;
    console.log(sendmsg);

    //TODO: beletenni dbbe mint uzenet, beletenni olvasatlannak mindenkihez, aki inviteolva van a channelre
    for(var i in dest){
        dest[i].socket.emit('message', sendmsg);
    }
};

//TODO: jora megirni: azokat irja ki, akik ismerik (akikkel 1 csatornan van)
var who = function(thisuser, params) {
    console.log("WHO!");
    var pattern = "";
    var name = "";
    var i;
    var thatuser;
    var oper = "";
    var sendmsg = ":" + thisuser.nick + " WHO";
    if (!params) {
        params = "";
    }
    var a = params.indexOf(' ');
    if (a > 0) {
        oper = params.slice(a+1, a+2);
        params = params.slice(0, a);
        console.log("params: " + params + " oper: " + oper);
    }
    if (params[0] === '#') {
        if (channels[params] && !channels[params].mode.secret_chan) {
            for (i in channels[params].users) {
                thatuser = channels[params].users[i];
                if (!thatuser.mode.invisible) {
                    name = thatuser.nick;
                    if (oper === 'o') {
                        if (channels[params].mode.operators[name]) {
                            console.log(name);
                            sendmsg += " " + name;
                        }
                    } else {
                        console.log(name);
                        sendmsg += " " + name;
                    }
                }
            }
        } else {
            console.log("ERROR: Channel " + params + " not found!");
            sendmsg += " Channel " + params + " not found!\n";
        }
    } else {
        if (params == "" || params == "0") {
            pattern = new RegExp(".*");
        } else {
            pattern = new RegExp(params);
        }
        var foundusers = false;
        for (i in clients) {
            if (!clients[i].mode.invisible) {
                name = clients[i].nick;
                if (name.match(pattern)) {
                    if (oper == "o") {
                        var isOper = false;
                        for (var temp in clients[i].mode.operatorOf) {
                            isOper = true;
                        }
                        if (isOper) {
                            console.log(name);
                            sendmsg += " " + name;
                            foundusers = true;
                        }
                    } else {
                        console.log(name);
                        sendmsg += " " + name;
                        foundusers = true;
                    }
                }
            }
        }
        if (!foundusers) {
            if (oper == "o") {
                sendmsg += " no opers matching pattern " + params;
            } else {
                sendmsg += " no users matching pattern " + params;
            }
        }
    }
    thisuser.socket.emit('message', sendmsg);
};


var joinchan = function(userdata, params){
    var chan = params.split(' ')[0]; //channel name to join

    if(chan[0] != '#'){
        console.log("Invalid channel name: " + chan);
        //error to client?
        return;
    }

    if(channels[chan] == undefined){
        //TODO: query channel from database - basically invites list, then check!
        //
        //ha nincs dbben:
        //create channel, add user as init operator.
        channels[chan] = new chanData();
        channels[chan].name = chan;
        channels[chan].mode.operators[userdata.nick] = userdata;
        userdata.mode.operatorOf[chan] = channels[chan];
        channels[chan].invited[userdata.nick] = true;
        //save data?? - kilepeskor
    } else {
        console.log("join:" + channels[chan].mode.invite_only_chan);
        if(channels[chan].mode.private_chan ||
            channels[chan].mode.invite_only_chan){
            //check to see if user is invited, and return if not
            console.log("join:" + channels[chan].invited[userdata.nick]);
            if(channels[chan].invited[userdata.nick] == false ||
                channels[chan].invited[userdata.nick] == undefined){
                console.log("user not invited");
                //return error?
                return;
            }
        }
    }

    //add user to channel, and add channel to user's channel list
    channels[chan].users[userdata.nick] = userdata;
    userdata.channels[chan] = channels[chan];
    
    console.log("join: " + userdata.channels.length + " " + chan);
						
    //broadcast to everyone in the channel that a user has joined
    for(var i in channels[chan].users){
        var peer = channels[chan].users[i];
        peer.socket.emit('message', ":" + userdata.nick + " JOIN " + chan);
    }
    //TODO: kikuldeni az addigi olvasatlan uzeneteket
    //TODO: kikuldeni a who-t a channelre? - vagy az invited listet, es a kettobol osszeollozni?
};

var part = function(thisuser, params) {
    if (params == undefined) {
        return;
    }
    var thisnick = thisuser.nick;
    var chans = params.split(','); //channel(s) to leave
    var chan;
    var i;
    for (i in chans) {
        chan = chans[i];
        console.log("PART Channel " + chan);
        if (chan[0] != '#') {
            console.log("Invalid channel name: " + chan);
            //error to client?
            return;
        }

        if (thisuser.channels[chan]) {
            console.log("Deleting channel " + chan + " from user " + thisnick);
            delete thisuser.channels[chan];
        }
	
        //this happens first so parting user gets the part message
        for (i in channels[chan].users) {
            var peer = channels[chan].users[i];
            peer.socket.emit('message', ":" + thisuser.nick + " PART " + chan);
        }

        if (channels[chan].users[thisnick]) {
            console.log("Deleting user " + thisnick + " from channel " + chan);
            delete channels[chan].users[thisnick];
        }
	
        //remove channel if no users left
        var size = 0;
        for(i in channels[chan].users){
            if(channels[chan].users[i] != undefined){
                size++;
            }
        }

        //kivenni az invitebol ha magatol lep le.
        if (channels[chan].invited[userdata.nick] != undefined)
            channels[chan].invited[userdata.nick] = false;

        if(size <= 0){
            //TODO: elmenteni a channel statust
            delete channels[chan];
        }
    }
};

var quit = function(userdata, params){
    var quitmsg;

    if(params == undefined)
        quitmsg = "disconnected";
    else
        quitmsg = params;

    for(var i in userdata.channels){

        console.log("quit: " + channels[i].name);
        var u = channels[i].users;
        delete u[userdata.nick];

        var size = 0;
        for(var j in userdata.channels[i].users){
            size++;
            var ud = userdata.channels[i].users[j];
            console.log("quit: " + ud.nick);
            ud.socket.emit('message', ':' + userdata.nick + ' QUIT ' + quitmsg);
        }

        if(size <= 0){
            //TODO: elmenteni a channel statust
            delete channels[i];
        }
    }

    delete clients[userdata.nick];

    console.log(userdata.nick + " has quit");
};

var invite = function(userdata, params){
    console.log("INVITE: "+params);
    paramArray = params.split(/\s+/);
    if(paramArray.length != 2){
        // Incorrect number of args.
        console.log("ERROR: Incorrect number of args!");
    } else if(paramArray[0] != userdata.nick && null != clients[paramArray[0]]){
        //TODO: mas modon ellenorizni az usert, offlinet is meg lehet hivni
        var channelName = paramArray[1];
        var channel = channels[channelName];
        if(null != channel){
            channel.invited[paramArray[0]] = true;

            //auto-join, if online
            var u = clients[paramArray[0]];
            if (null != u) {
                joinchan(u, channelName);
            } else {
                //TODO: auto-join when offline - get channel list with invites also good solution vs. add channel to user data in redis!
            }
        } else {
            console.log("ERROR: Channel does not exist to invite to");
        }
    } else console.log("ERROR: Either the user \""+paramArray[0]+"\" doesn't exist OR You attempted to invite yourself.");
};


var topic = function(thisuser, params){
    var a = params.indexOf(' ');
    var chan = params.slice(0, a);
    var top = params.slice(a+1);

    if(channels[chan] != undefined){
        channels[chan].topic = top;

        for(var i in channels[chan].users){
            var u = channels[chan].users[i];
            console.log( ':' + thisuser.nick + ' TOPIC ' + params);
            u.socket.emit('message', ':' + thisuser.nick + ' TOPIC ' + params);
        }
    }
}

var nocommand = function(com){
    console.log(com + ": not a recognized command");
};

var nick = function(userdata, nick){

    if(clients[nick] != undefined){
        console.log("cannot change " + userdata.nick + "'s name to " + nick);
        console.log("Nick taken");
        //error to client?
        return;
    }

    console.log(userdata.nick + " nick changed to " + nick);

    oldnick = userdata.nick;
    userdata.nick = nick;


    //change nick in each channel
    for(var i in userdata.channels){
        var c = userdata.channels[i];

        c.users[nick] = userdata;
        delete c.users[oldnick];

        //change invited nick
        if(c.invited[oldnick]){
            c.invited[nick] = c.invited[oldnick];
            delete c.invited[oldnick];
        }

        //change nick for ops/ban/voice
        var m = c.mode;

        if(m.operators[oldnick]){
            m.operators[nick] = m.operators[oldnick];
            delete m.operators[oldnick];
        }

        if(m.ban_mask[oldnick]){
            m.ban_mask[nick] = m.ban_mask[oldnick];
            delete m.ban_mask[oldnick];
        }

        if(m.voice[oldnick]){
            m.voice[nick] = m.voice[oldnick];
            delete m.voice[oldnick];
        }

    }
    
    if(clients[oldnick] != undefined){
        delete clients[oldnick];
    }

    clients[userdata.nick] = userdata;

};


socket.sockets.on('connection', function(client){
    console.log("connection works!");
    var address = client.handshake.address; // Get client ip address and port.
    var thisuser = new userData(address.address, client);

    //TODO: login command: query user, auto-join channels, send who


    client.on('disconnect', function(data){
        console.log(thisuser.nick);
        quit(thisuser);
    });

    client.on('data', function(data){
        console.log(thisuser.nick);
        console.log(data);
        var a, fullcommand;

        if(data[0] === ':'){
            a = data.indexOf(' ');
            var currentuid = data.slice(0, a);
            fullcommand = data.slice(a+1, data.length);
        } else {
            fullcommand = data;
        }

        a = fullcommand.indexOf(' '); // find index of next space.
        //console.log(a);
        if(a > 0){
            var comtype = fullcommand.slice(0, a);
            var params = fullcommand.slice(a+1, fullcommand.length);
        } else {
            var comtype = fullcommand;
            var params = undefined;
        }
		
        //console.log(params);

        comtype = comtype.toUpperCase();

        switch(comtype){
            case "NICK":
				//letiltani
                nick(thisuser, params);
                break;		
            case "PRIVMSG":
                privmsg(thisuser, params);
                break;
            case "WHO":
                who(thisuser, params);
                break;
            case "JOIN":
                joinchan(thisuser, params);
                break;
            case "PART":
                part(thisuser, params);
                break;
            case "TOPIC":
                topic(thisuser, params);
                break;
            case "INVITE":
                invite(thisuser, params);
                break;
            case "QUIT":
                quit(thisuser, params);
                break;
            default:
                nocommand(comtype);
        }
    });
});