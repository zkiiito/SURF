import RedisStore from 'connect-redis';
import redisClient from './RedisClient.js';

export default new RedisStore({
    client: redisClient,
    prefix: 'wave.sid:',
});
