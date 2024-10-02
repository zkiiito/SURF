const RedisStore = require('connect-redis').default;
const redisClient = require('./RedisClient');

module.exports = new RedisStore({
    client: redisClient,
    prefix: 'wave.sid:',
});
