import path from 'path';
import type { Config } from './types.js';

const config: Config = {
  googleId: process.env.GOOGLE_APPID || '290177368237.apps.googleusercontent.com',
  googleSecret: process.env.GOOGLE_APPSECRET || 'x58fnA7rUYCqhsLeAXTakjdN',
  mongoUrl: process.env.MONGOLAB_URI || process.env.DB_URI || 'mongodb://localhost:27017/wave0',
  mongoDebug: Boolean(process.env.MONGO_DEBUG) || false,
  redisUrl: process.env.REDISCLOUD_URL || 'redis://localhost:6379',
  hostName: process.env.HOSTNAME || '',
  testMode: Boolean(process.env.TESTMODE) || false,
  port: Number(process.env.PORT) || 8000,
  uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024,
};

export default config;
