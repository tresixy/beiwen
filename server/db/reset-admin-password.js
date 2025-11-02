import argon2 from 'argon2';
import pool from './connection.js';
import logger from '../utils/logger.js';

// 重置管理员密码
async function resetAdminPassword() {
  const adminEmail = 'aita@admin.com';
  const adminUsername = 'aita';
  const adminPassword = 'aitaita';
  
  try {
    // 检查管理员是否存在
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [adminUsername]
    );
    
    if (existing.rows.length === 0) {
      console.log('❌ 管理员账户不存在，请先创建');
      console.log('   运行: npm run admin:create');
      return;
    }
    
    // 加密新密码
    const passwordHash = await argon2.hash(adminPassword);
    
    // 更新密码
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [passwordHash, adminUsername]
    );
    
    logger.info({ adminId: existing.rows[0].id }, '管理员密码已重置');
    console.log('✅ 管理员密码已重置');
    console.log('   用户名: aita');
    console.log('   密码: aitaita');
    console.log('   邮箱: aita@admin.com');
    
  } catch (err) {
    logger.error({ err }, '重置管理员密码失败');
    throw err;
  } finally {
    await pool.end();
    process.exit(0);
  }
}

resetAdminPassword();

