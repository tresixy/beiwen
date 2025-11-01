#!/usr/bin/env node

// 执行卡牌系统数据库迁移脚本
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../db/connection.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    logger.info('开始执行卡牌系统数据库迁移...');
    
    const migrationPath = join(__dirname, 'init-cards-v2.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    logger.info({ migrationPath }, '读取迁移脚本');
    
    await pool.query(sql);
    
    logger.info('✅ 卡牌系统数据库迁移完成');
    
    // 查询插入的卡牌数量
    const result = await pool.query('SELECT era, card_type, COUNT(*) as count FROM cards GROUP BY era, card_type ORDER BY era, card_type');
    logger.info({ cards: result.rows }, '卡牌统计');
    
    process.exit(0);
  } catch (err) {
    logger.error({ err }, '❌ 迁移失败');
    process.exit(1);
  }
}

runMigration();

