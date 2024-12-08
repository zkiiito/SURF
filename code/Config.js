const config = {
    //google account for localhost:8000 / redirect uri: http://localhost:8000/auth/google/callback
    googleId: process.env.GOOGLE_APPID || '290177368237.apps.googleusercontent.com',
    googleSecret: process.env.GOOGLE_APPSECRET || 'x58fnA7rUYCqhsLeAXTakjdN',
    //fb account for localhost:8000 for user zooli
    mongoUrl: process.env.MONGOLAB_URI || process.env.DB_URI || 'mongodb://localhost:27017/wave0',
    mongoDebug: process.env.MONGO_DEBUG || false,
    redisUrl: process.env.REDISCLOUD_URL || 'redis://localhost:6379',
    hostName: process.env.HOSTNAME || '',
    testMode: process.env.TESTMODE || 0,
    port: process.env.PORT || 8000,
};

export default config;
