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
    LocalStrategy = require('passport-local').Strategy,
    bodyParser = require('body-parser');

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (obj, done) {
    done(null, obj);
});

/*jslint unparam: true*/
passport.use(new GoogleStrategy(
    {
        clientID: Config.googleId,
        clientSecret: Config.googleSecret,
        callbackURL: Config.hostName + "/auth/google/callback"
    },
    function (accessToken, refreshToken, profile, done) {
        process.nextTick(function () {
            // To keep the example simple, the user's Google profile is returned to
            // represent the logged-in user.  In a typical application, you would want
            // to associate the Google account with a user record in your database,
            // and return that user instead.
            return done(null, profile);
        });
    }
));

passport.use(new FacebookStrategy(
    {
        clientID: Config.facebookId,
        clientSecret: Config.facebookSecret,
        callbackURL: Config.hostName + "/auth/facebook/callback",
        profileFields: ['id', 'name', 'email', 'picture']
    },
    function (accessToken, refreshToken, profile, done) {
        process.nextTick(function () {
            return done(null, profile);
        });
    }
));

passport.use(new LocalStrategy(
    function (username, password, done) {
        if ('admin' === username) {
            if (password === Config.adminPass) {
                return done(null, {
                    admin: true
                });
            }
        } else if (Config.testMode) {
            var id = parseInt(username, 10),
                user = {
                    provider: 'google',
                    _json: {
                        id: id,
                        email: 'test' + username + '@wavesurf.com',
                        name: 'Surf Tester ' + id.toString(),
                        picture: 'http://lorempixel.com/100/100/people/'
                    }
                };

            return done(null, user);
        }
        return done('auth error');
    }
));
/*jslint unparam: false*/

var app = express();
app.disable('x-powered-by');
var clientDir = __dirname.replace('code', 'client');

app.use(errorHandler({
    dumpExceptions: true,
    showStack: true
}));

app.use(cookieParser());
app.use(bodyParser());
app.use(session({
    key: 'surf.sid',
    store: SessionStore,
    secret: 'surfSessionSecret9',
    cookie: {
        httpOnly: true
        //secure: true //in prod?
    }
}));

app.use('/css', express.static(__dirname + '/../client/css'));
app.use('/js', express.static(__dirname + '/../client/js'));
app.use('/images', express.static(__dirname + '/../client/images'));
app.use('/fonts', express.static(__dirname + '/../client/fonts'));

app.use(passport.initialize());
app.use(passport.session());

app.get('/', function (req, res) {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/google');
    }
    res.sendfile(clientDir + '/index.html');
});

app.post('/logError', function (req, res) {
    console.log('JSERROR : ' + req.body.errorMessage);
});

app.get('/auth/google', passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'] }));
app.get('/auth/google/callback',  passport.authenticate('google', { successRedirect: '/' }));

app.get('/auth/facebook', passport.authenticate('facebook', { scope: 'email' }));
app.get('/auth/facebook/callback',  passport.authenticate('facebook', { successRedirect: '/' }));

if (Config.testMode) {
    app.get('/loginTest', function (req, res) {
        res.sendfile(clientDir + '/test/login.html');
    });

    app.post('/loginTest', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/loginTest' }));

    app.get('/logoutTest', function (req, res) {
        req.logout();
        res.redirect('/');
    });
}

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

app.get('/invite/:inviteCode', function (req, res) {
    DAL.getWaveInvitebyCode(req.params.inviteCode, function (err, invite) {
        if (!err && invite) {
            req.session.invite = invite;
        }
        res.redirect('/');
    });
});

var UserController = require('./adminController/User');
var WaveController = require('./adminController/Wave');

app.use('/admin', function (req, res, next) {
    if (!req.isAuthenticated() || !req.session.passport.user.admin) {
        return res.redirect('/loginAdmin');
    }
    next();
}, express.static(__dirname + '/../admin'));

app.get('/loginAdmin', function (req, res) {
    res.sendFile(__dirname + '/loginAdmin.html');
});
app.post('/loginAdmin', passport.authenticate('local', { successRedirect: '/admin/users.html', failureRedirect: '/loginAdmin' }));


var apiAuth = function (callback) {
    return function (req, res) {
        if (!req.isAuthenticated() || !req.session.passport.user.admin) {
            return res.status(403).json({error: 'Authentication failed'});
        }
        return callback(req, res);
    };
};

app.get('/api/user', apiAuth(UserController.index));
app.get('/api/wave', apiAuth(WaveController.index));
app.put('/api/user/:id', apiAuth(UserController.update));
app.put('/api/wave/:id', apiAuth(WaveController.update));

var ExpressServer = http.createServer(app);

module.exports = ExpressServer;