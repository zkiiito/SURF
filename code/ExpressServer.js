import express from 'express';
import http from 'http';
import passport from 'passport';
import SessionStore from './SessionStore.js';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import routerClient from './routerClient.js';
import cors from 'cors';

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (obj, done) {
    done(null, obj);
});

export function startExpressServer() {
    const app = express();
    app.disable('x-powered-by');

    app.use(cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());
    app.use(cookieParser());

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
