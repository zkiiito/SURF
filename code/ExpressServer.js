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
        nextUserId += 1;
        user.id = nextUserId;
        usersById[nextUserId] = user;
        return user;
    } else { // non-password-based
        nextUserId += 1;
        user = usersById[nextUserId] = {id: nextUserId};
        user[source] = sourceUser;
    }
    return user;
}

everyauth.everymodule
    .findUserById( function (id, callback) {
        callback(null, usersById[id]);
    });

var appId = process.env.PORT ? '290177368237-pne1smhvlb3g2r5c7g25d34hk3pfi96f.apps.googleusercontent.com' : '290177368237.apps.googleusercontent.com';
var appSecret = process.env.PORT ? 'v28w9nWORgGioUdDO5JSAdBv' : 'x58fnA7rUYCqhsLeAXTakjdN';

var usersByGoogleId = {};
var auth = everyauth.google
    .appId(appId)
    .appSecret(appSecret)
    .scope('https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email')
    .findOrCreateUser( function (sess, accessToken, extra, googleUser) {
        googleUser.refreshToken = extra.refresh_token;
        googleUser.expiresIn = extra.expires_in;
        return usersByGoogleId[googleUser.id] || (usersByGoogleId[googleUser.id] = addUser('google', googleUser));
    })
    .redirectPath('/');

//auto-login
auth.moreAuthQueryParams.access_type = 'online';
auth.moreAuthQueryParams.approval_prompt = 'auto';

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
});


app.get('/', function(req, res) {
    if (!req.session.auth) {
        return res.redirect('/auth/google');
    }
    res.sendfile(clientDir + '/index.html');
});

ExpressServer = http.createServer(app);

exports.ExpressServer = ExpressServer;
exports.SessionStore = SessionStore;