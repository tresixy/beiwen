import crypto from 'crypto';
import pool from '../db/connection.js';
import { findCustomRule } from '../rules/customRules.js';
import logger from '../utils/logger.js';

// 规则合成（确定性）
export async function synthesizeByRule(inputItems, name) {
  try {
    const inputNames = inputItems.map(item => item.name);
    
    // 检查自定义规则
    const customOutput = findCustomRule(inputNames);
    if (customOutput) {
      return {
        name: customOutput.name,
        tier: customOutput.tier,
        attrs: customOutput.attrs,
      };
    }
    
    // 基础合成逻辑
    const avgTier = Math.ceil(inputItems.reduce((sum, item) => sum + item.tier, 0) / inputItems.length);
    const tier = Math.min(avgTier + 1, 10);
    
    // 合并属性
    const attrs = {};
    inputItems.forEach(item => {
      Object.assign(attrs, item.attrs_json);
    });
    
    return {
      name: name || `合成物-${Date.now()}`,
      tier,
      attrs,
    };
  } catch (err) {
    logger.error({ err, inputItems }, 'SynthesizeByRule error');
    throw err;
  }
}

// 保存合成结果
export async function saveRecipe(userId, inputItemIds, output, recipe_hash, prompt = null, model = null) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 创建物品
    const itemResult = await client.query(
      'INSERT INTO items (name, tier, attrs_json, created_by) VALUES ($1, $2, $3, $4) RETURNING id',
      [output.name, output.tier, JSON.stringify(output.attrs), userId]
    );
    
    const itemId = itemResult.rows[0].id;
    
    // 保存配方
    await client.query(
      'INSERT INTO ai_recipes (recipe_hash, inputs_json, output_item_id, prompt, model) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (recipe_hash) DO NOTHING',
      [recipe_hash, JSON.stringify(inputItemIds), itemId, prompt, model]
    );
    
    await client.query('COMMIT');
    
    logger.info({ userId, itemId, recipe_hash }, 'Recipe saved');
    
    return { ...output, id: itemId };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, userId, inputItemIds }, 'SaveRecipe error');
    throw err;
  } finally {
    client.release();
  }
}

// 生成配方哈希
export function generateRecipeHash(inputItemIds, name) {
  const sortedIds = inputItemIds.slice().sort();
  const str = `${sortedIds.join(',')}:${name}`;
  return crypto.createHash('sha256').update(str).digest('hex');
}

// 获取输入物品
// 如果第二个参数userId不为null，则inputs是卡牌名称数组，需要从cards表查询
// 否则inputs是物品ID数组，从items表查询
export async function getInputItems(inputs, userId = null) {
  try {
    if (userId !== null) {
      // 输入是卡牌名称数组，从cards表查询
      const result = await pool.query(
        `SELECT c.id, c.name, 
         COALESCE((c.attrs_json->>'tier')::INTEGER, 
           CASE c.rarity 
             WHEN 'common' THEN 1
             WHEN 'uncommon' THEN 2
             WHEN 'rare' THEN 3
             WHEN 'epic' THEN 4
             WHEN 'legendary' THEN 5
             ELSE 1
           END) as tier,
         c.attrs_json
         FROM cards c
         WHERE c.name = ANY($1)`,
        [inputs]
      );
      
      if (result.rows.length !== inputs.length) {
        const foundNames = result.rows.map(r => r.name);
        const missing = inputs.filter(name => !foundNames.includes(name));
        throw new Error(`Some cards not found: ${missing.join(', ')}`);
      }
      
      // 转换为items格式
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        tier: row.tier,
        attrs_json: row.attrs_json || {},
      }));
    } else {
      // 输入是物品ID数组，从items表查询
      const result = await pool.query(
        'SELECT id, name, tier, attrs_json FROM items WHERE id = ANY($1)',
        [inputs]
      );
      
      if (result.rows.length !== inputs.length) {
        throw new Error('Some input items not found');
      }
      
      return result.rows;
    }
  } catch (err) {
    logger.error({ err, inputs, userId }, 'GetInputItems error');
    throw err;
  }
}

// 记录一次合成事件
export async function logSynthesisEvent(userId, inputNames, outputItem, recipeHash, options = {}) {
  try {
    const era = options.era ?? null;
    const mode = options.mode ?? null;
    const aiUsed = options.aiUsed ?? false;
    const aiModel = options.aiModel ?? null;
    const prompt = options.prompt ?? null;

    const result = await pool.query(
      `INSERT INTO synthesis_logs 
       (user_id, inputs_json, output_item_id, output_name, recipe_hash, era, mode, ai_used, ai_model, prompt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        userId,
        JSON.stringify(inputNames),
        outputItem?.id ?? null,
        outputItem?.name ?? null,
        recipeHash ?? null,
        era,
        mode,
        aiUsed,
        aiModel,
        prompt,
      ]
    );

    const synthesisLogId = result.rows[0].id;
    logger.info({ userId, synthesisLogId, outputItemId: outputItem?.id, outputName: outputItem?.name }, 'Synthesis event logged');
    return synthesisLogId;
  } catch (err) {
    // 记录失败不应阻断合成流程
    logger.error({ err, userId, outputItemId: outputItem?.id }, 'Failed to log synthesis event');
    return null;
  }
}

// 增加用户合成次数
export async function incrementSynthesisCount(userId) {
  try {
    await pool.query(
      'UPDATE users SET synthesis_count = synthesis_count + 1 WHERE id = $1',
      [userId]
    );
    logger.info({ userId }, 'Synthesis count incremented');
  } catch (err) {
    // 计数失败不应阻断合成流程
    logger.error({ err, userId }, 'Failed to increment synthesis count');
  }
}

