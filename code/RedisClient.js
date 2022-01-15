const redis = require('redis'),
    Config = require('./Config'),
    redisClient = redis.createClient({ url: Config.redisUrl });
    
redisClient.on('error', function (err) {
    console.log('Redis Error: ' + err);
});

module.exports = redisClient;
