const express = require('express'),
    fs = require('fs'),
    DAL = require('./DAL'),
    Config = require('./Config'),
    passport = require('passport'),
    GoogleStrategy = require('passport-google-oauth20').Strategy,
    FacebookStrategy = require('passport-facebook').Strategy,
    LocalStrategy = require('passport-local').Strategy;

/*jslint unparam: true*/
passport.use(new GoogleStrategy(
    {
        clientID: Config.googleId,
        clientSecret: Config.googleSecret,
        callbackURL: Config.hostName + '/auth/google/callback',
        userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
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
        callbackURL: Config.hostName + '/auth/facebook/callback',
        profileFields: ['id', 'name', 'email', 'picture']
    },
    function (accessToken, refreshToken, profile, done) {
        process.nextTick(function () {
            return done(null, profile);
        });
    }
));

/*jslint unparam: false*/

const app = express.Router();
const clientDir = __dirname.replace('code', 'client');

app.use('/css', express.static(clientDir + '/css'));
app.use('/js', express.static(clientDir + '/js'));
app.use('/images', express.static(clientDir + '/images'));
app.use('/fonts', express.static(clientDir + '/fonts'));

let clientIndexHtml = '';

app.get('/', function (req, res) {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/google');
    }

    if (!clientIndexHtml) {
        fs.readFile(clientDir + '/index.html', {encoding: 'utf-8'}, function (err, data) {
            if (!err) {
                clientIndexHtml = data.replace('ANALYTICS_ID', Config.analyticsId);
                res.send(clientIndexHtml);

                if (Config.testMode) {
                    clientIndexHtml = null;
                }
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
    const errorHandler = require('errorhandler');
    app.use(errorHandler({
        dumpExceptions: true,
        showStack: true
    }));

    passport.use(new LocalStrategy(
        function (username, password, done) {
            const id = parseInt(username, 10);
            const user = {
                provider: 'google',
                id: id,
                emails: [{value: 'test' + username + '@wavesurf.com'}],
                displayName: 'Surf Tester ' + id.toString(),
                photos: [{
                    value: 'http://lorempixel.com/100/100/people/'
                }],
                _json: {}
            };

            return done(null, user);
        }
    ));

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

app.get('/invite/:inviteCode', async function (req, res) {
    const invite = await DAL.getWaveInvitebyCode(req.params.inviteCode);
    if (invite) {
        req.session.invite = invite;
    }
    res.redirect('/');
});

module.exports = app;
