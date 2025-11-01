#!/usr/bin/env node

import fs from 'fs';
import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/minigame';
const CSV_FILE = process.argv[2] || '数值体系 - 困境与文明.csv';

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

function normalizeEraName(eraName) {
  // 处理特殊的时代名称
  if (eraName.includes('第二次分野')) {
    return '第二次分野时代';
  }
  if (eraName.includes('最终结局')) {
    return eraName.replace('(最终结局)', '').trim();
  }
  return eraName.trim();
}

function normalizeKeyName(keyStr) {
  if (!keyStr) return null;
  
  // 去除【】符号
  let normalized = keyStr.replace(/【|】/g, '').trim();
  
  // 处理多个选项的情况（如"官僚体系 或 宗教"）
  // 保持原样，因为数据库可能需要存储完整的描述
  return normalized;
}

function normalizeEventName(name) {
  // 去除【】符号
  return name.replace(/【|】/g, '').trim();
}

function convertCsvToEvents(csvText) {
  const rows = parseCsv(csvText);
  
  if (rows.length < 2) {
    throw new Error('CSV 文件缺少表头或数据');
  }

  const headers = rows[0];
  const events = [];

  console.log('CSV 表头:', headers);
  
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    
    if (!values.some(v => v)) {
      continue;
    }

    const eventNumber = parseInt(values[0]) || i;
    const era = normalizeEraName(values[1] || '');
    const rawName = values[2] || '';
    const rawKey = values[3] || '';
    const description = values[4] || '';
    const reward = values[5] || '';
    const eraIntro = values[6] || '';

    // 跳过空行或无效数据
    if (!rawName || !era) {
      console.warn(`第 ${i + 1} 行：跳过无效数据`);
      continue;
    }

    const name = normalizeEventName(rawName);
    const requiredKey = normalizeKeyName(rawKey);

    const event = {
      event_number: eventNumber,
      era,
      name,
      description,
      reward: reward || null,
      required_key: requiredKey,
      era_intro: eraIntro || null,
    };

    events.push(event);
  }

  return events;
}

async function addEraIntroField() {
  try {
    await pool.query(`
      ALTER TABLE events ADD COLUMN IF NOT EXISTS era_intro TEXT;
      COMMENT ON COLUMN events.era_intro IS '时代开场语';
    `);
    console.log('✅ era_intro 字段添加成功');
  } catch (err) {
    console.error('❌ 添加字段失败:', err.message);
    throw err;
  }
}

async function importEvents() {
  console.log(`\n🚀 开始从 CSV 导入events数据...\n`);
  console.log(`CSV 文件: ${CSV_FILE}\n`);

  try {
    // 读取 CSV 文件
    const csvText = fs.readFileSync(CSV_FILE, 'utf-8');
    
    // 转换为events数据
    const events = convertCsvToEvents(csvText);
    
    console.log(`📊 解析完成，共 ${events.length} 个events\n`);

    // 添加 era_intro 字段（如果不存在）
    console.log('📝 检查并添加 era_intro 字段...');
    await addEraIntroField();

    // 先删除所有现有events
    console.log('\n🗑️  删除现有events数据...');
    await pool.query('DELETE FROM events');
    console.log('✅ 已清理旧数据\n');

    // 批量插入
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const imported = [];
      const errors = [];

      console.log('📥 开始批量导入...\n');

      for (const event of events) {
        try {
          const result = await client.query(
            `INSERT INTO events (
              event_number, era, name, description, reward, required_key, era_intro
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, name`,
            [
              event.event_number,
              event.era,
              event.name,
              event.description,
              event.reward,
              event.required_key,
              event.era_intro,
            ]
          );

          imported.push(event.name);
          console.log(`  ✅ ${event.name} (${event.era} #${event.event_number})`);
        } catch (err) {
          errors.push({ name: event.name, error: err.message });
          console.error(`  ❌ ${event.name}: ${err.message}`);
        }
      }

      await client.query('COMMIT');

      console.log(`\n📊 导入统计:`);
      console.log(`   成功: ${imported.length} 个`);
      console.log(`   失败: ${errors.length} 个`);

      if (errors.length > 0) {
        console.log(`\n❌ 失败详情:`);
        errors.forEach(e => console.log(`   - ${e.name}: ${e.error}`));
      }

      // 显示按时代统计
      const stats = await pool.query(`
        SELECT era, COUNT(*) as count
        FROM events
        GROUP BY era
        ORDER BY MIN(event_number)
      `);

      console.log(`\n📈 Events统计 (按时代):\n`);
      console.table(stats.rows);

      // 显示所有events
      const allEvents = await pool.query(`
        SELECT event_number, era, name, required_key
        FROM events
        ORDER BY event_number
      `);

      console.log(`\n📋 Events列表:\n`);
      console.table(allEvents.rows);

      console.log(`\n✅ Events数据导入完成！\n`);

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

importEvents();


