import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './connection.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const client = await pool.connect();

  try {
    logger.info('开始执行合成日志表迁移...');

    const migrationPath = path.join(__dirname, 'migrations', 'add_synthesis_logs.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await client.query(sql);

    logger.info('✅ 合成日志表迁移完成');
    console.log('✅ synthesis_logs 表已创建/校验');
  } catch (err) {
    logger.error({ err }, '❌ 迁移失败');
    console.error('❌ 迁移失败:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((err) => {
  logger.error({ err }, 'Migration script failed');
  process.exit(1);
});


