import { createClient } from 'redis';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const redis = createClient({
  url: env.redisUrl,
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis error');
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

await redis.connect();

export default redis;

// 工具函数
export async function cacheGet(key) {
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    logger.error({ err, key }, 'Cache get error');
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = 3600) {
  try {
    await redis.setEx(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (err) {
    logger.error({ err, key }, 'Cache set error');
    return false;
  }
}

export async function cacheDel(key) {
  try {
    await redis.del(key);
    return true;
  } catch (err) {
    logger.error({ err, key }, 'Cache del error');
    return false;
  }
}

