var express = require('express'),
    http = require('http'),
    MemoryStore = express.session.MemoryStore,
    everyauth = require('everyauth');
    
SessionStore = new MemoryStore();

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

var usersByFbId = {};
everyauth.facebook
    .appId('117631014938869')
    .appSecret('0fcdf78ad3a76a00fc0ae9481311d087')
    .findOrCreateUser( function (session, accessToken, accessTokenExtra, fbUserMetadata) {
        return usersByFbId[fbUserMetadata.id] || (usersByFbId[fbUserMetadata.id] = addUser('facebook', fbUserMetadata));
    })
    .redirectPath('/');

var usersByGoogleId = {};
everyauth.google
    .appId('3335216477.apps.googleusercontent.com')
    .appSecret('PJMW_uP39nogdu0WpBuqMhtB')
    .scope('https://www.googleapis.com/auth/userinfo.profile https://www.google.com/m8/feeds/')
    .findOrCreateUser( function (sess, accessToken, extra, googleUser) {
        googleUser.refreshToken = extra.refresh_token;
        googleUser.expiresIn = extra.expires_in;
        return usersByGoogleId[googleUser.id] || (usersByGoogleId[googleUser.id] = addUser('google', googleUser));
    })
    .redirectPath('/');
  
var usersByGoogleHybridId = {};
everyauth.googlehybrid
    .myHostname('http://surf:8000')
    .consumerKey('YOUR CONSUMER KEY HERE')
    .consumerSecret('YOUR CONSUMER SECRET HERE')
    .scope(['http://docs.google.com/feeds/','http://spreadsheets.google.com/feeds/'])
    .findOrCreateUser( function(session, userAttributes) {
        return usersByGoogleHybridId[userAttributes.claimedIdentifier] || (usersByGoogleHybridId[userAttributes.claimedIdentifier] = addUser('googlehybrid', userAttributes));
    })
    .redirectPath('/');

var app = express();

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
    app.use(express.static(__dirname + '/../client'));
    app.use('/node', express.static(__dirname + '/../node_modules'));
  
    app.use(everyauth.middleware(app));
  
    app.set('view engine', 'jade');
    app.set('views', __dirname + '/../client/loginview');
});

app.get('/lgn', function (req, res) {
    res.render('home');
});

ExpressServer = http.createServer(app);

exports.ExpressServer = ExpressServer;
exports.SessionStore = SessionStore;