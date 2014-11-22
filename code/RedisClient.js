var redis = require('redis'),
    Config = require('./Config'),
    url = require('url'),
    redisURL = url.parse(Config.redisUrl),
    redisClient = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});

if (redisURL.auth) {
    redisClient.auth(redisURL.auth.split(":")[1]);
}

module.exports = redisClient;
