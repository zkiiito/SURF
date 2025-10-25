import express from 'express';
import fs from 'fs';
import DAL from './DALMongoRedis.js';
import Config from './Config.js';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import errorHandler from 'errorhandler';

const __dirname = import.meta.dirname;

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

/*jslint unparam: false*/

const app = express.Router();


const clientDirs = ['client/dist', 'client-react/dist'];

for (const clientDir of clientDirs) {
    const clientDirPath = __dirname.replace('code', clientDir);
    app.use('/css', express.static(clientDirPath + '/css'));
    app.use('/js', express.static(clientDirPath + '/js'));
    app.use('/images', express.static(clientDirPath + '/images'));
    app.use('/fonts', express.static(clientDirPath + '/fonts'));
    app.use('/assets', express.static(clientDirPath + '/assets'));
}

let clientIndexHtmlBackbone = '';
let clientIndexHtmlReact = '';
const cacheClientIndexHtml = true;

// Route to enable React client
app.get('/use-react', function (req, res) {
    res.cookie('client-version', 'react', {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        httpOnly: true,
        sameSite: 'lax'
    });
    res.redirect('/');
});

// Route to enable Backbone client (default)
app.get('/use-backbone', function (req, res) {
    res.clearCookie('client-version');
    res.redirect('/');
});

app.get('/', function (req, res) {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/google');
    }

    // Check cookie to determine which client to serve
    const useReact = (req.cookies && req.cookies['client-version'] === 'react') || (process.env.CLIENT_VERSION && process.env.CLIENT_VERSION === 'react');
    const clientDir = useReact ? clientDirs[1] : clientDirs[0];
    const cachedHtml = useReact ? clientIndexHtmlReact : clientIndexHtmlBackbone;

    if (!cachedHtml || !cacheClientIndexHtml) {
        fs.readFile(clientDir + '/index.html', { encoding: 'utf-8' }, function (err, data) {
            if (!err) {
                if (useReact) {
                    clientIndexHtmlReact = data;
                } else {
                    clientIndexHtmlBackbone = data;
                }
                res.send(data);

                if (Config.testMode) {
                    clientIndexHtmlBackbone = null;
                    clientIndexHtmlReact = null;
                }
            }
        });
    } else {
        res.send(cachedHtml);
    }
});

app.post('/logError', function (req, res) {
    console.log('JSERROR : ' + req.body.errorMessage);
    res.send('1');
});

app.get('/auth/google', passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'] }));
app.get('/auth/google/callback',  passport.authenticate('google', { successRedirect: '/' }));

if (Config.testMode) {
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
                    value: 'https://placekitten.com/100/100'
                }],
                _json: {}
            };

            return done(null, user);
        }
    ));

    /*jslint unparam: true*/
    app.get('/loginTest', function (req, res) {
        // Use React client for test mode by default, but respect cookie
        const useReact = (req.cookies && req.cookies['client-version'] === 'react') || (process.env.CLIENT_VERSION && process.env.CLIENT_VERSION === 'react');
        const clientDir = useReact ? clientDirs[1] : clientDirs[0];
        res.sendFile(__dirname.replace('code', clientDir) + '/test/login.html');
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

export default app;
