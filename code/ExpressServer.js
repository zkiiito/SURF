var express = require('express'),
    fs = require('fs'),
    session = require('express-session'),
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
                        emails: [{value: 'test' + username + '@wavesurf.com'}],
                        displayName: 'Surf Tester ' + id.toString(),
                        image: {
                            url: 'http://lorempixel.com/100/100/people/'
                        }
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
var adminDir = __dirname.replace('code', 'admin');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(session({
    name: 'surf.sid',
    store: SessionStore,
    secret: 'surfSessionSecret9',
    cookie: {
        httpOnly: true
        //secure: true //in prod?
    },
    saveUninitialized: true,
    resave: true
}));

app.use('/css', express.static(__dirname + '/../client/css'));
app.use('/js', express.static(__dirname + '/../client/js'));
app.use('/images', express.static(__dirname + '/../client/images'));
app.use('/fonts', express.static(__dirname + '/../client/fonts'));

app.use(passport.initialize());
app.use(passport.session());

var clientIndexHtml = '';

app.get('/', function (req, res) {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/google');
    }

    if (!clientIndexHtml) {
        fs.readFile(clientDir + '/index.html', {encoding: 'utf-8'}, function (err, data) {
            if (!err) {
                clientIndexHtml = data.replace('ANALYTICS_ID', Config.analyticsId);
                res.send(clientIndexHtml);
            }
        });
    } else {
        res.send(clientIndexHtml);
    }
});

app.post('/logError', function (req, res) {
    console.log('JSERROR : ' + req.body.errorMessage);
    res.send('1');
});

app.get('/auth/google', passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'] }));
app.get('/auth/google/callback',  passport.authenticate('google', { successRedirect: '/' }));

app.get('/auth/facebook', passport.authenticate('facebook', { scope: 'email' }));
app.get('/auth/facebook/callback',  passport.authenticate('facebook', { successRedirect: '/' }));

if (Config.testMode) {
    var errorHandler = require('errorhandler');
    app.use(errorHandler({
        dumpExceptions: true,
        showStack: true
    }));

    /*jslint unparam: true*/
    app.get('/loginTest', function (req, res) {
        res.sendFile(clientDir + '/test/login.html');
    });
    /*jslint unparam: false*/

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

// ADMIN BLOCK //
var UserController = require('./adminController/User');
var WaveController = require('./adminController/Wave');
var WaveInviteController = require('./adminController/WaveInvite');
var MessageController = require('./adminController/Message');

app.use('/admin/css', express.static(__dirname + '/../admin/css'));
app.use('/admin/fonts', express.static(__dirname + '/../admin/fonts'));
app.use('/admin/js', express.static(__dirname + '/../admin/js'));

var apiAuth = function (callback) {
    return function (req, res) {
        if (!req.isAuthenticated() || !req.session.passport.user.admin) {
            return res.redirect('/admin/login');
        }
        return callback(req, res);
    };
};

/*jslint unparam: true*/
app.get('/admin', apiAuth(function (req, res) {
    res.sendFile(adminDir + '/index.html');
}));

app.get('/admin/login', function (req, res) {
    res.sendFile(adminDir + '/login.html');
});
/*jslint unparam: false*/
app.post('/admin/login', passport.authenticate('local', { successRedirect: '/admin#waves', failureRedirect: '/admin/login' }));

app.get('/api/user', apiAuth(UserController.index));
app.get('/api/user/:id', apiAuth(UserController.getById));
app.get('/api/wave', apiAuth(WaveController.index));
app.get('/api/message/:waveId', apiAuth(MessageController.index));
app.get('/api/waveinvite', apiAuth(WaveInviteController.index));
app.put('/api/user/:id', apiAuth(UserController.update));
app.put('/api/wave/:id', apiAuth(WaveController.update));
app.put('/api/message/:waveId/:id', apiAuth(MessageController.update));
app.put('/api/waveinvite/:id', apiAuth(WaveInviteController.update));

app.get('/api/unread/:userId/:waveId', apiAuth(UserController.getUnreadCountByWave));
app.delete('/api/unread/:userId/:waveId', apiAuth(UserController.deleteUnreadCountByWave));

var ExpressServer = http.createServer(app);

module.exports = ExpressServer;