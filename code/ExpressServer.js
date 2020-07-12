const express = require('express'),
    http = require('http'),
    passport = require('passport'),
    SessionStore = require('./SessionStore'),
    bodyParser = require('body-parser');
const session = require('express-session');

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (obj, done) {
    done(null, obj);
});

const app = express();
app.disable('x-powered-by');

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

app.use(passport.initialize());
app.use(passport.session());

app.use('/', require('./routerClient'));
app.use('/admin', require('./routerAdmin'));

const ExpressServer = http.createServer(app);

module.exports = ExpressServer;
