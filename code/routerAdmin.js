import express from 'express';
import { Passport } from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import Config from './Config.js';
import UserController from './adminController/User.js';
import WaveController from './adminController/Wave.js';
import WaveInviteController from './adminController/WaveInvite.js';
import MessageController from './adminController/Message.js';

const passport = new Passport();
const app = express.Router();
const __dirname = import.meta.dirname;

var adminDir = __dirname.replace('code', 'admin/public');

app.use('/css', express.static(adminDir + '/css'));
app.use('/fonts', express.static(adminDir + '/fonts'));
app.use('/js', express.static(adminDir + '/js'));

app.use(function (req, res, next) {
    if (req.url !== '/login' && !req.session.admin) {
        return res.redirect('/admin/login');
    }
    next();
});

/*jslint unparam: true*/
app.get('/', function (req, res) {
    res.sendFile(adminDir + '/index.html');
});

app.get('/login', function (req, res) {
    res.sendFile(adminDir + '/login.html');
});
/*jslint unparam: false*/

passport.use(new LocalStrategy(
    function (username, password, done) {
        if ('admin' === username) {
            if (password === Config.adminPass) {
                return done(null, {
                    admin: true
                });
            }
        }
        return done('auth error');
    }
));

app.post('/login', passport.authorize('local', { failureRedirect: '/admin/login' }), function (req, res) {
    req.session.admin = true;
    res.redirect('/admin#waves');
});

app.get('/api/user', UserController.index);
app.get('/api/user/:id', UserController.getById);
app.get('/api/wave', WaveController.index);
app.get('/api/message/:waveId', MessageController.index);
app.get('/api/waveinvite', WaveInviteController.index);
app.put('/api/user/:id', UserController.update);
app.put('/api/wave/:id', WaveController.update);
app.put('/api/message/:waveId/:id', MessageController.update);
app.put('/api/waveinvite/:id', WaveInviteController.update);

app.get('/api/unread/:userId/:waveId', UserController.getUnreadCountByWave);
app.delete('/api/unread/:userId/:waveId', UserController.deleteUnreadCountByWave);

export default app;