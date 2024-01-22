import createClient from './createClient.redis.js';
import Logger from './logger.js';

const defaultClientRedis = createClient('client');

defaultClientRedis.on('ready', () => {
  Logger.info('Redis client is ready');
});

export default defaultClientRedis;
