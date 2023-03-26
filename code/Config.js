const config = {
    //google account for localhost:8000 / redirect uri: http://localhost:8000/auth/google/callback
    googleId: process.env.GOOGLE_APPID || '290177368237.apps.googleusercontent.com',
    googleSecret: process.env.GOOGLE_APPSECRET || 'x58fnA7rUYCqhsLeAXTakjdN',
    //fb account for localhost:8000 for user zooli
    facebookId: process.env.FACEBOOK_APPID || '622693977806170',
    facebookSecret: process.env.FACEBOOK_APPSECRET || '2dd0b88a5cd92702ae6dfc11f3096e5c',
    mongoUrl: process.env.MONGOLAB_URI || process.env.DB_URI || 'mongodb://localhost:27017/wave0',
    mongoDebug: process.env.MONGO_DEBUG || false,
    redisUrl: process.env.REDISCLOUD_URL || 'redis://localhost:6379',
    hostName: process.env.HOSTNAME || '',
    testMode: process.env.TESTMODE || 0,
    port: process.env.PORT || 8000,
    graphiteKey: process.env.HOSTEDGRAPHITE_APIKEY || null,
    adminPass: process.env.ADMINPASS || 'adminPass',
    mysql: {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'surf'
        //, debug: ['ComQueryPacket']
    },
    dal: process.env.DAL || 'DALMongoRedis'
};

module.exports = config;
