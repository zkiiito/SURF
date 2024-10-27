import express from 'express';
import http from 'http';
import passport from 'passport';
import SessionStore from './SessionStore.js';
import bodyParser from 'body-parser';
import session from 'express-session';
import routerClient from './routerClient.js';
import { startRouterAdmin } from './routerAdmin.js';

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (obj, done) {
    done(null, obj);
});

export function startExpressServer() {
    const app = express();
    app.disable('x-powered-by');

    app.use('/admin', startRouterAdmin());

    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());

    app.use(session({
        name: 'surf.sid',
        store: SessionStore,
        secret: 'surfSessionSecret9',
        cookie: {
            httpOnly: true,
            // secure: process.env.NODE_ENV === 'production',
        },
        saveUninitialized: true,
        resave: true
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    app.use('/', routerClient);

    return http.createServer(app);
}
