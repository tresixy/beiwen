import { createClient } from 'redis';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const redis = createClient({
  url: env.redisUrl,
});

let redisConnected = false;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2秒

redis.on('error', (err) => {
  logger.error({ err }, 'Redis error');
  redisConnected = false;
});

redis.on('connect', () => {
  logger.info('Redis connected');
  redisConnected = true;
  connectionAttempts = 0;
});

redis.on('disconnect', () => {
  logger.warn('Redis disconnected');
  redisConnected = false;
});

// 异步连接Redis，带重试机制
async function connectRedis() {
  try {
    await redis.connect();
    redisConnected = true;
    logger.info('Redis connection established');
  } catch (err) {
    connectionAttempts++;
    logger.error({ err, attempt: connectionAttempts, maxAttempts: MAX_RETRY_ATTEMPTS }, 'Redis connection failed');
    
    if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
      logger.info({ delay: RETRY_DELAY, nextAttempt: connectionAttempts + 1 }, 'Retrying Redis connection...');
      setTimeout(() => connectRedis(), RETRY_DELAY);
    } else {
      logger.warn('Redis connection failed after max attempts, cache functionality disabled');
      // 应用继续运行，但缓存功能不可用
    }
  }
}

// 启动连接
connectRedis();

export default redis;

// 工具函数
export async function cacheGet(key) {
  // 如果Redis未连接，直接返回null（降级处理）
  if (!redisConnected) {
    return null;
  }
  
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    logger.error({ err, key }, 'Cache get error');
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = 3600) {
  // 如果Redis未连接，直接返回false（降级处理）
  if (!redisConnected) {
    logger.debug({ key }, 'Cache set skipped (Redis not connected)');
    return false;
  }
  
  try {
    await redis.setEx(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (err) {
    logger.error({ err, key }, 'Cache set error');
    return false;
  }
}

export async function cacheDel(key) {
  // 如果Redis未连接，直接返回false（降级处理）
  if (!redisConnected) {
    return false;
  }
  
  try {
    await redis.del(key);
    return true;
  } catch (err) {
    logger.error({ err, key }, 'Cache del error');
    return false;
  }
}

// 导出连接状态检查函数
export function isRedisConnected() {
  return redisConnected;
}

