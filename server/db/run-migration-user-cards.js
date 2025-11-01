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
    logger.info('开始执行用户生成卡牌迁移...');

    const migrationPath = path.join(__dirname, 'migrations', 'add_user_generated_cards.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await client.query(sql);

    logger.info('✅ 用户生成卡牌迁移完成');
  } catch (err) {
    logger.error({ err }, '❌ 迁移失败');
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


