import redis from 'redis';
import Config from './Config.js';

const redisClient = redis.createClient({ url: Config.redisUrl });
    
redisClient.on('error', function (err) {
    console.log('Redis Error: ' + err);
});

export default redisClient;
