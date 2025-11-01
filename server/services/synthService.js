import crypto from 'crypto';
import pool from '../db/connection.js';
import { findCustomRule } from '../rules/customRules.js';
import logger from '../utils/logger.js';

// 规则合成（确定性）
export async function synthesizeByRule(inputItems, name, currentEra = '生存时代') {
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
    const avgTier = Math.ceil(inputItems.reduce((sum, item) => sum + (item.tier || 1), 0) / inputItems.length);
    const tier = Math.min(avgTier + 1, 10);
    
    // 合并属性
    const attrs = {};
    inputItems.forEach(item => {
      Object.assign(attrs, item.attrs_json);
    });
    
    attrs.era = currentEra;

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
  const sortedInputs = inputItemIds.slice().sort();
  const str = `${sortedInputs.join(',')}:${name}`;
  return crypto.createHash('sha256').update(str).digest('hex');
}

// 获取输入物品
export async function getInputItems(inputItemIds) {
  try {
    // 如果输入是字符串数组（名称），从cards表查询
    if (Array.isArray(inputItemIds) && inputItemIds.length > 0 && typeof inputItemIds[0] === 'string' && !inputItemIds[0].match(/^\d+$/)) {
      const cardResult = await pool.query(
        `SELECT id, name, rarity, attrs_json, era, ai_civilization_name
         FROM cards
         WHERE name = ANY($1)`,
        [inputItemIds]
      );
      
      // 将卡牌稀有度映射为tier
      const rarityToTier = {
        'common': 1,
        'uncommon': 2,
        'rare': 3,
        'epic': 4,
        'legendary': 5
      };
      
      // 为每个输入名称创建物品对象
      return inputItemIds.map(name => {
        const card = cardResult.rows.find(c => c.name === name);
        if (card) {
          return {
            id: card.id,
            name: card.name,
            tier: rarityToTier[card.rarity] || 1,
            attrs_json: card.attrs_json || { type: '基础元素' },
            era: card.era,
            ai_civilization_name: card.ai_civilization_name,
          };
        }
        // 如果找不到卡牌，返回默认对象
        return {
          id: null,
          name: name,
          tier: 1,
          attrs_json: { type: '基础元素' },
          era: null,
          ai_civilization_name: null,
        };
      });
    }
    
    const result = await pool.query(
      'SELECT id, name, tier, attrs_json FROM items WHERE id = ANY($1)',
      [inputItemIds]
    );
    
    if (result.rows.length !== inputItemIds.length) {
      throw new Error('Some input items not found');
    }
    
    return result.rows;
  } catch (err) {
    logger.error({ err, inputItemIds }, 'GetInputItems error');
    throw err;
  }
}

