import MongoStore from 'connect-mongo';
import Config from './Config.js';

/**
 * Session store backed by MongoDB. Uses its own connection rather than sharing
 * mongoose's — the overhead is one extra pool, which is fine at this scale.
 */
export default MongoStore.create({
  mongoUrl: Config.mongoUrl,
  collectionName: 'sessions',
  ttl: 14 * 24 * 60 * 60,
  stringify: false,
});
