var express = require('express'),
    http = require('http'),
    passport = require('passport'),
    SessionStore = require('./SessionStore'),
    bodyParser = require('body-parser');
var session = require('express-session');

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (obj, done) {
    done(null, obj);
});

var app = express();
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

var ExpressServer = http.createServer(app);

module.exports = ExpressServer;