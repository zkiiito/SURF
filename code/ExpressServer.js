var express = require('express'),
    http = require('http'),
    everyauth = require('everyauth');
    
SessionStore = new express.session.MemoryStore();

//everyauth.debug = true;

var usersById = {};
var nextUserId = 0;

function addUser (source, sourceUser) {
    var user;
    if (arguments.length === 1) { // password-based
        user = sourceUser = source;
        user.id = ++nextUserId;
        return usersById[nextUserId] = user;
    } else { // non-password-based
        user = usersById[++nextUserId] = {id: nextUserId};
        user[source] = sourceUser;
    }
    return user;
}

everyauth.everymodule
    .findUserById( function (id, callback) {
        callback(null, usersById[id]);
    });

var usersByGoogleId = {};
everyauth.google
    .appId('290177368237.apps.googleusercontent.com')
    .appSecret('x58fnA7rUYCqhsLeAXTakjdN')
    .scope('https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email')
    .findOrCreateUser( function (sess, accessToken, extra, googleUser) {
        googleUser.refreshToken = extra.refresh_token;
        googleUser.expiresIn = extra.expires_in;
        return usersByGoogleId[googleUser.id] || (usersByGoogleId[googleUser.id] = addUser('google', googleUser));
    })
    .redirectPath('/');
  
var app = express();
var clientDir = __dirname.replace('code', 'client');

app.configure(function(){
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(express.errorHandler({
        dumpExceptions: true, 
        showStack: true
    }));
    //app.use(app.router);
    app.use(express.cookieParser('site secret'));
    app.use(express.session({
        key: 'surf.sid',
        store: SessionStore
    }));
    app.use('/css', express.static(__dirname + '/../client/css'));
    app.use('/js', express.static(__dirname + '/../client/js'));
    app.use('/images', express.static(__dirname + '/../client/images'));
    app.use('/fonts', express.static(__dirname + '/../client/fonts'));

    app.use('/node', express.static(__dirname + '/../node_modules'));
  
    app.use(everyauth.middleware(app));
  
//    app.set('view engine', 'jade');
//    app.set('views', __dirname + '/../client/loginview');
});

/*
app.get('/lgn', function (req, res) {
    res.render('home');
});
*/

app.get('/', function(req, res) {
    if (!req.session['auth']) {
        return res.redirect('/auth/google');
    }
    res.sendfile(clientDir + '/index.html');
});

ExpressServer = http.createServer(app);

exports.ExpressServer = ExpressServer;
exports.SessionStore = SessionStore;