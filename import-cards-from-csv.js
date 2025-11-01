#!/usr/bin/env node

import fs from 'fs';
import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/minigame';
const CSV_FILE = process.argv[2] || '数值体系 - 卡牌.csv';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current);
        current = '';
      } else if (char === '\n') {
        row.push(current);
        rows.push(row);
        row = [];
        current = '';
      } else if (char === '\r') {
        continue;
      } else {
        current += char;
      }
    }
  }

  if (inQuotes) {
    throw new Error('CSV 格式错误：缺少结束引号');
  }

  row.push(current);
  rows.push(row);

  return rows
    .map(columns => columns.map(value => value.trim()))
    .filter(columns => columns.some(value => value !== ''));
}

function normalizeCardType(csvCardType) {
  const typeStr = csvCardType.toLowerCase();
  
  if (typeStr.includes('钥匙卡') || typeStr.includes('key')) {
    return 'key';
  }
  if (typeStr.includes('奖励') || typeStr.includes('reward') || typeStr.includes('解锁')) {
    return 'reward';
  }
  return 'inspiration';
}

function getTypeFromCardType(cardType) {
  const typeMap = {
    'key': 'key',
    'reward': 'reward',
    'inspiration': 'inspiration'
  };
  return typeMap[cardType] || 'inspiration';
}

function isStarterCard(getMethod) {
  const method = getMethod.toLowerCase();
  return method.includes('游戏开始') || method.includes('初始');
}

function isDecoyCard(getMethod) {
  const method = getMethod.toLowerCase();
  return method.includes('迷惑项');
}

function extractUnlockCondition(getMethod, difficultyColumn, description, cardType) {
  // 1. 优先使用困境列（如果不是"奖励卡，承上启下"这种描述）
  if (difficultyColumn && difficultyColumn.trim() && !difficultyColumn.includes('奖励卡')) {
    return difficultyColumn.trim();
  }
  
  // 2. 从获取方式中提取（通关【xxx】）
  if (getMethod.includes('通关【')) {
    const match = getMethod.match(/通关【([^】]+)】/);
    if (match) {
      return match[1];
    }
  }
  
  // 3. 对于钥匙卡，从描述中提取（解决【xxx】的关键）
  if (cardType === 'key' && description.includes('解决【')) {
    const match = description.match(/解决【([^】]+)】/);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

function convertCsvToCards(csvText) {
  const rows = parseCsv(csvText);
  
  if (rows.length < 2) {
    throw new Error('CSV 文件缺少表头或数据');
  }

  const headers = rows[0];
  const cards = [];

  // 验证表头
  const expectedHeaders = ['排序', '卡牌名称', '卡牌类型', '所属文明', '获取方式', '设计阐述', '困境', 'AI文明名称'];
  console.log('CSV 表头:', headers);
  
  // 检测是否有排序列
  const hasOrderColumn = headers[0] && (headers[0].includes('排序') || headers[0].toLowerCase().includes('order'));
  const startIndex = hasOrderColumn ? 1 : 0;
  
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    
    if (!values.some(v => v)) {
      continue;
    }

    const cardName = values[startIndex] || '';
    const cardTypeRaw = values[startIndex + 1] || '';
    const era = values[startIndex + 2] || '';
    const getMethod = values[startIndex + 3] || '';
    const description = values[startIndex + 4] || '';
    const difficulty = values[startIndex + 5] || '';
    const aiCivilizationName = values[startIndex + 6] || '';

    // 去除名称中的【】符号
    const name = cardName.replace(/【|】/g, '').trim();
    
    if (!name) {
      console.warn(`第 ${i + 1} 行：跳过空卡牌`);
      continue;
    }

    const cardType = normalizeCardType(cardTypeRaw);
    const type = getTypeFromCardType(cardType);
    const isStarter = isStarterCard(getMethod);
    const isDecoy = isDecoyCard(getMethod);
    const unlockCondition = extractUnlockCondition(getMethod, difficulty, description, cardType);

    // 构建 attrs_json
    const attrsJson = {};
    if (description) {
      attrsJson.description = description;
    }
    if (getMethod && !isStarter) {
      attrsJson.obtain_method = getMethod;
    }

    const card = {
      name,
      type,
      rarity: cardType === 'key' ? 'uncommon' : (cardType === 'reward' ? 'rare' : 'common'),
      era: era || null,
      card_type: cardType,
      unlock_condition: unlockCondition,
      is_starter: isStarter,
      is_decoy: isDecoy,
      description,
      ai_civilization_name: aiCivilizationName || era || null,
    };

    cards.push(card);
  }

  return cards;
}

async function importCards() {
  console.log(`\n🚀 开始从 CSV 导入卡牌数据...\n`);
  console.log(`CSV 文件: ${CSV_FILE}\n`);

  try {
    // 读取 CSV 文件
    const csvText = fs.readFileSync(CSV_FILE, 'utf-8');
    
    // 转换为卡牌数据
    const cards = convertCsvToCards(csvText);
    
    console.log(`📊 解析完成，共 ${cards.length} 张卡牌\n`);

    // 先删除所有基础卡牌
    console.log('🗑️  删除现有基础卡牌...');
    await pool.query('DELETE FROM deck_cards WHERE card_id IN (SELECT id FROM cards WHERE is_base_card = TRUE)');
    await pool.query('DELETE FROM cards WHERE is_base_card = TRUE');
    console.log('✅ 已清理旧数据\n');

    // 批量插入
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const imported = [];
      const errors = [];

      console.log('📥 开始批量导入...\n');

      for (const card of cards) {
        try {
          const result = await client.query(
            `INSERT INTO cards (
              name, type, rarity, era, card_type,
              unlock_condition, is_starter, is_decoy, attrs_json,
              is_base_card, source_type, ai_civilization_name
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, 'csv_imported', $10)
            RETURNING id, name`,
            [
              card.name,
              card.type,
              card.rarity,
              card.era,
              card.card_type,
              card.unlock_condition,
              card.is_starter,
              card.is_decoy,
              { description: card.description },
              card.ai_civilization_name,
            ]
          );

          imported.push(card.name);
          console.log(`  ✅ ${card.name} (${card.era} - ${card.card_type})`);
        } catch (err) {
          errors.push({ name: card.name, error: err.message });
          console.error(`  ❌ ${card.name}: ${err.message}`);
        }
      }

      await client.query('COMMIT');

      console.log(`\n📊 导入统计:`);
      console.log(`   成功: ${imported.length} 张`);
      console.log(`   失败: ${errors.length} 张`);

      if (errors.length > 0) {
        console.log(`\n❌ 失败详情:`);
        errors.forEach(e => console.log(`   - ${e.name}: ${e.error}`));
      }

      // 显示按时代统计
      const stats = await pool.query(`
        SELECT era, card_type, COUNT(*) as count
        FROM cards
        WHERE is_base_card = TRUE
        GROUP BY era, card_type
        ORDER BY 
          CASE era
            WHEN '生存时代' THEN 1
            WHEN '城邦时代' THEN 2
            WHEN '分野时代' THEN 3
            WHEN '帝国时代' THEN 4
            WHEN '信仰时代' THEN 5
            WHEN '理性时代' THEN 6
            WHEN '启蒙时代' THEN 7
            WHEN '全球时代' THEN 8
            WHEN '星辰时代' THEN 9
            WHEN '奇点时代' THEN 10
            ELSE 99
          END,
          card_type
      `);

      console.log(`\n📈 卡牌统计 (按时代):\n`);
      console.table(stats.rows);

      console.log(`\n✅ 卡牌数据导入完成！\n`);

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error(`\n❌ 导入失败:`, err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importCards();

