import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './connection.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const migrationFile = path.join(__dirname, 'migrations', 'add_synthesis_count.sql');
  
  try {
    logger.info('开始执行迁移: add_synthesis_count.sql');
    
    const sql = fs.readFileSync(migrationFile, 'utf8');
    await pool.query(sql);
    
    logger.info('迁移执行成功！');
    console.log('✅ 合成次数统计功能数据库迁移完成');
    console.log('   - 已添加 users.synthesis_count 字段');
    console.log('   - 已创建索引');
    
  } catch (err) {
    logger.error({ err }, '迁移执行失败');
    console.error('❌ 迁移失败:', err.message);
    throw err;
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runMigration();

