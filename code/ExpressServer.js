var express = require('express'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    errorHandler = require('errorhandler'),
    http = require('http'),
    DAL = require('./DAL'),
    SessionStore = require('./SessionStore'),
    Config = require('./Config'),
    passport = require('passport'),
    GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
    FacebookStrategy = require('passport-facebook').Strategy,
    LocalStrategy,
    bodyParser;

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

/*jslint unparam: true*/
passport.use(new GoogleStrategy({
        clientID: Config.googleId,
        clientSecret: Config.googleSecret,
        callbackURL: Config.hostName + "/auth/google/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        // asynchronous verification, for effect...
        process.nextTick(function () {
            // To keep the example simple, the user's Google profile is returned to
            // represent the logged-in user.  In a typical application, you would want
            // to associate the Google account with a user record in your database,
            // and return that user instead.
            return done(null, profile);
        });
    })
);

passport.use(new FacebookStrategy({
        clientID: Config.facebookId,
        clientSecret: Config.facebookSecret,
        callbackURL: Config.hostName + "/auth/facebook/callback",
        profileFields: ['id', 'name', 'email', 'picture']
    },
    function(accessToken, refreshToken, profile, done) {
        process.nextTick(function () {
            return done(null, profile);
        });
    }
));

if (Config.testMode) {
    LocalStrategy = require('passport-local').Strategy;

    passport.use(new LocalStrategy(
        function (username, password, done) {
            var user = {
                provider: 'google',
                _json: {
                    id: parseInt(username, 10),
                    email: 'test' + username + '@wavesurf.com',
                    name: 'Surf Tester ' + parseInt(username, 10).toString(),
                    picture: 'http://www.jigzone.com/p/jz/isA/TreeFrog.jpg'
                }
            };

            return done(null, user);
        }
    ));
}
/*jslint unparam: false*/

var app = express();
app.disable('x-powered-by');
var clientDir = __dirname.replace('code', 'client');

app.use(errorHandler({
    dumpExceptions: true,
    showStack: true
}));

app.use(cookieParser('surfCookieParserSecret9'));
app.use(session({
    key: 'surf.sid',
    store: SessionStore,
    secret: 'surfSessionSecret9',
    cookie: {
        httpOnly: true
        //secure: true //csak elesben kell
    }
}));

app.use('/css', express.static(__dirname + '/../client/css'));
app.use('/js', express.static(__dirname + '/../client/js'));
app.use('/images', express.static(__dirname + '/../client/images'));
app.use('/fonts', express.static(__dirname + '/../client/fonts'));

app.use(passport.initialize());
app.use(passport.session());

app.get('/', function(req, res) {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/google');
    }
    res.sendfile(clientDir + '/index.html');
});

app.get('/auth/google', passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'] }));
app.get('/auth/google/callback',  passport.authenticate('google', { successRedirect: '/' }));

app.get('/auth/facebook', passport.authenticate('facebook', { scope: 'email' }));
app.get('/auth/facebook/callback',  passport.authenticate('facebook', { successRedirect: '/' }));

if (Config.testMode) {
    bodyParser = require('body-parser');
    app.use(bodyParser());

    app.get('/loginTest', function(req, res) {
        res.sendfile(clientDir + '/test/login.html');
    });

    app.post('/loginTest', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/loginTest' }));

    app.get('/logoutTest', function(req, res) {
        req.session = null;
        res.redirect('/');
    });
}

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

app.get('/invite/:inviteCode', function(req, res) {
    DAL.getWaveInvitebyCode(req.params.inviteCode, function(err, invite) {
        if (!err && invite) {
            req.session.invite = invite;
        }
        res.redirect('/');
    });
});

var ExpressServer = http.createServer(app);

module.exports = ExpressServer;