var config = {
    googleId: process.env.GOOGLE_APPID || '290177368237.apps.googleusercontent.com',
    googleSecret: process.env.GOOGLE_APPSECRET || 'x58fnA7rUYCqhsLeAXTakjdN',
    facebookId: process.env.FACEBOOK_APPID || '540926909316211',
    facebookSecret: process.env.FACEBOOK_APPSECRET || 'ca1521da4e2d0dac4dc3978580d25ae6',
    mongoUrl: process.env.MONGOLAB_URI || 'mongodb://localhost/wave0',
    redisUrl: process.env.REDISCLOUD_URL || 'redis://localhost:6379',
    hostName: process.env.HOSTNAME || null,
    testMode: process.env.TESTMODE || 0,
    port: process.env.PORT || 8000,
    graphiteKey: process.env.HOSTEDGRAPHITE_APIKEY || null,
    nodetimeKey: process.env.NODETIME_ACCOUNT_KEY || null
};

module.exports = config;
