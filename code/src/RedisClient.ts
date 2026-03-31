import { createClient, RedisClientType } from 'redis';
import Config from './Config.js';

const redisClient: RedisClientType = createClient({ url: Config.redisUrl });

redisClient.on('error', (err: Error) => {
  console.log('Redis Error: ' + err);
});

export default redisClient;
