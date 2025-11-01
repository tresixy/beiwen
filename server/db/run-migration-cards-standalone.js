#!/usr/bin/env node

// 独立的卡牌迁移脚本（不依赖env.js）
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 从环境变量或使用默认值
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/minigame';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('开始执行卡牌系统数据库迁移...');
    console.log('数据库连接:', DATABASE_URL.replace(/:[^:]*@/, ':****@')); // 隐藏密码
    
    const migrationPath = join(__dirname, 'init-cards-v2.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log('读取迁移脚本:', migrationPath);
    
    await pool.query(sql);
    
    console.log('✅ 卡牌系统数据库迁移完成');
    
    // 查询插入的卡牌数量
    const result = await pool.query(`
      SELECT era, card_type, is_base_card, COUNT(*) as count 
      FROM cards 
      GROUP BY era, card_type, is_base_card 
      ORDER BY era, card_type
    `);
    
    console.log('\n卡牌统计:');
    console.table(result.rows);
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ 迁移失败:', err.message);
    console.error(err);
    await pool.end();
    process.exit(1);
  }
}

runMigration();

