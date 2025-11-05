import crypto from 'crypto';
import pool from '../db/connection.js';
import logger from './logger.js';

/**
 * 生成唯一的 user_id
 * 格式：usr_xxxxxx（6位随机字符）
 */
export async function generateUniqueUserId(maxAttempts = 10) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const randomStr = crypto.randomBytes(4).toString('hex').substring(0, 6);
    const userId = `usr_${randomStr}`;
    
    // 检查是否已存在
    const result = await pool.query(
      'SELECT 1 FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return userId;
    }
  }
  
  // 如果多次尝试都失败，使用更长的随机字符串
  const longRandomStr = crypto.randomBytes(8).toString('hex').substring(0, 12);
  const userId = `usr_${longRandomStr}`;
  
  logger.warn({ userId }, 'Generated longer user_id after max attempts');
  
  return userId;
}

/**
 * 验证 user_id 格式
 */
export function validateUserId(userId) {
  if (!userId) return false;
  
  // 格式：usr_ + 至少6位字母数字
  const pattern = /^usr_[a-z0-9]{6,}$/;
  return pattern.test(userId);
}

