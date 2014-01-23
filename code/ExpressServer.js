var express = require('express'),
    http = require('http'),
    everyauth = require('everyauth'),
    DAL = require('./DAL'),
    SessionStore = require('./SessionStore');

//everyauth.debug = true;
//?
var usersById = {};
var nextUserId = 0;

function addUser (source, sourceUser) {
    var user;
    if (arguments.length === 1) { // password-based
        user = sourceUser = source;
        nextUserId += 1;
        user.id = nextUserId;
        usersById[nextUserId] = user;
    } else { // non-password-based
        nextUserId += 1;
        user = usersById[nextUserId] = {id: nextUserId};
        user[source] = sourceUser;
    }
    return user;
}
//?
everyauth.everymodule
    .findUserById( function (id, callback) {
        callback(null, usersById[id]);
    });

//?
var usersByGoogleId = {};
var auth = everyauth.google
    .appId(process.env.GOOGLE_APPID)
    .appSecret(process.env.GOOGLE_APPSECRET)
    .myHostname(process.env.HOSTNAME)//https miatt, configban kell megadni.
    .scope('https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email')
    .findOrCreateUser( function (sess, accessToken, extra, googleUser) {
        googleUser.refreshToken = extra.refresh_token;
        googleUser.expiresIn = extra.expires_in;
        //?
        return usersByGoogleId[googleUser.id] || (usersByGoogleId[googleUser.id] = addUser('google', googleUser));
    })
    .redirectPath('/');

//auto-login
auth.moreAuthQueryParams.access_type = 'online';
auth.moreAuthQueryParams.approval_prompt = 'auto';

var fbAuth = everyauth.facebook
    .appId(process.env.FACEBOOK_APPID)
    .appSecret(process.env.FACEBOOK_APPSECRET)
    .scope('email')                        // Defaults to undefined
    .fields('id,name,email,picture')       // Controls the returned fields. Defaults to undefined
    .myHostname(process.env.HOSTNAME)//https miatt, configban kell megadni.
    .handleAuthCallbackError( function (req, res) {
      // If a user denies your app, Facebook will redirect the user to
      // /auth/facebook/callback?error_reason=user_denied&error=access_denied&error_description=The+user+denied+your+request.
      // This configurable route handler defines how you want to respond to
      // that.
      // If you do not configure this, everyauth renders a default fallback
      // view notifying the user that their authentication failed and why.
    })
    .findOrCreateUser( function (session, accessToken, accessTokExtra, fbUserMetadata) {
          //?
          return usersByGoogleId[fbUserMetadata.id] || (usersByGoogleId[fbUserMetadata.id] = addUser('facebook', fbUserMetadata));
    })
    .redirectPath('/');

if (process.env.TESTMODE) {
    everyauth.password
        .getLoginPath('/login')
        .postLoginPath('/login')
        .authenticate(function(login, password) {
            var googleUser = {
                    id: parseInt(login, 10),
                    email: 'test' + login + '@wavesurf.com',
                    name: 'Surf Tester ' + parseInt(login, 10).toString(),
                    picture: 'http://www.jigzone.com/p/jz/isA/TreeFrog.jpg'
                };

            return usersByGoogleId[googleUser.id] || (usersByGoogleId[googleUser.id] = addUser('google', googleUser));
        })
        .getRegisterPath('/register')
        .postRegisterPath('/register')
        .registerUser({})
        .loginSuccessRedirect('/')
        .registerSuccessRedirect('/')
        .addToSession( function (sess, user, errors) {
          var _auth = sess.auth || (sess.auth = {});
          if (user) {
            _auth.userId = user[this._userPkey];
            _auth.google = {};
            _auth.google.user = user.google;
          }
          _auth.loggedIn = !!user;
    });
}

var app = express();
var clientDir = __dirname.replace('code', 'client');

app.configure(function(){
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack: true
    }));
    app.use(express.cookieParser('site secret'));
    app.use(express.session({
        key: 'surf.sid',
        store: SessionStore
    }));
    app.use(app.router);
    app.use('/css', express.static(__dirname + '/../client/css'));
    app.use('/js', express.static(__dirname + '/../client/js'));
    app.use('/images', express.static(__dirname + '/../client/images'));
    app.use('/fonts', express.static(__dirname + '/../client/fonts'));

    app.use('/node', express.static(__dirname + '/../node_modules'));

    app.use(everyauth.middleware(app));
});

app.get('/invite/:inviteCode', function(req, res) {
    DAL.getWaveInvitebyCode(req.params.inviteCode, function(err, invite){
        if (!err && invite) {
            req.session.invite = invite;
        }
        res.redirect('/');
    });
});

app.get('/', function(req, res) {
    if (!req.session.auth) {
        return res.redirect('/auth/google');
    }
    res.sendfile(clientDir + '/index.html');
});

if (process.env.TESTMODE) {
    app.get('/loginTest', function(req, res) {
        console.log(req.session);
        res.sendfile(clientDir + '/test/login.html');
    });

    app.get('/logoutTest', function(req, res){
        req.session = null;
        res.redirect('/');
    });
}

var ExpressServer = http.createServer(app);

module.exports = ExpressServer;