import argon2 from 'argon2';
import pool from './connection.js';
import logger from '../utils/logger.js';

// 创建默认管理员账户
async function createAdminAccount() {
  const adminEmail = 'aita@admin.com';
  const adminUsername = 'aita';
  const adminPassword = 'aita';
  
  try {
    // 检查管理员是否已存在
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [adminUsername]
    );
    
    if (existing.rows.length > 0) {
      logger.info('管理员账户已存在');
      return;
    }
    
    // 加密密码
    const passwordHash = await argon2.hash(adminPassword);
    
    // 创建管理员账户
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash, role, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING id`,
      [adminEmail, adminUsername, passwordHash, 'admin']
    );
    
    const adminId = result.rows[0].id;
    
    // 初始化管理员数据
    await pool.query(
      'INSERT INTO inventories (user_id, slots_json) VALUES ($1, $2)',
      [adminId, JSON.stringify(Array(50).fill(null))] // 管理员50格背包
    );
    
    await pool.query(
      'INSERT INTO resources (user_id, food, production, research) VALUES ($1, 9999, 9999, 9999)',
      [adminId]
    );
    
    // 解锁所有卡牌
    const cards = await pool.query('SELECT id FROM cards');
    for (const card of cards.rows) {
      await pool.query(
        'INSERT INTO deck_cards (user_id, card_id, discovered, count) VALUES ($1, $2, true, 10)',
        [adminId, card.id]
      );
    }
    
    logger.info({ adminId }, '默认管理员账户创建成功');
    console.log('✅ 管理员账户创建成功');
    console.log('   用户名: aita');
    console.log('   密码: aita');
    console.log('   邮箱: aita@admin.com');
    
  } catch (err) {
    logger.error({ err }, '创建管理员账户失败');
    throw err;
  } finally {
    await pool.end();
    process.exit(0);
  }
}

createAdminAccount();

