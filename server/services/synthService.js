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
    
    // 基础合成逻辑 - 修复tier计算
    const validTiers = inputItems.map(item => item.tier || 1).filter(t => t > 0);
    const avgTier = validTiers.length > 0 
      ? Math.ceil(validTiers.reduce((sum, t) => sum + t, 0) / validTiers.length)
      : 1;
    
    // tier提升逻辑：平均tier + 1，但不超过10，至少为1
    const tier = Math.max(1, Math.min(avgTier + 1, 10));
    
    // 合并属性 - 深拷贝避免污染
    const attrs = {};
    inputItems.forEach(item => {
      if (item.attrs_json && typeof item.attrs_json === 'object') {
        Object.assign(attrs, JSON.parse(JSON.stringify(item.attrs_json)));
      }
    });
    
    attrs.era = currentEra;
    attrs.synthesizedFrom = inputNames;
    attrs.synthesizedAt = new Date().toISOString();

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

// 保存合成结果（包含消耗卡牌）
export async function saveRecipe(userId, inputItemIds, output, recipe_hash, prompt = null, model = null, consumeCards = false) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 如果需要消耗卡牌，先消耗
    if (consumeCards && Array.isArray(inputItemIds) && typeof inputItemIds[0] === 'string') {
      // 统计每个卡牌需要消耗的数量
      const cardUsageCount = {};
      for (const name of inputItemIds) {
        cardUsageCount[name] = (cardUsageCount[name] || 0) + 1;
      }
      
      // 获取卡牌ID
      const cardResult = await client.query(
        `SELECT id, name FROM cards WHERE name = ANY($1)`,
        [Object.keys(cardUsageCount)]
      );
      
      if (cardResult.rows.length !== Object.keys(cardUsageCount).length) {
        throw new Error('部分输入卡牌不存在');
      }
      
      // 消耗卡牌（在事务中）
      for (const card of cardResult.rows) {
        const count = cardUsageCount[card.name];
        await client.query(
          `UPDATE deck_cards 
           SET count = GREATEST(0, count - $1)
           WHERE user_id = $2 AND card_id = $3`,
          [count, userId, card.id]
        );
      }
      
      logger.info({ userId, cardUsageCount }, 'Cards consumed in transaction');
    }
    
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
    
    logger.info({ userId, itemId, recipe_hash, cardsConsumed: consumeCards }, 'Recipe saved');
    
    return { ...output, id: itemId };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, userId, inputItemIds }, 'SaveRecipe error');
    throw err;
  } finally {
    client.release();
  }
}

// 生成配方哈希（标准化处理）
export function generateRecipeHash(inputItemIds, name) {
  // 排序输入以确保相同的输入产生相同的哈希
  const sortedInputs = inputItemIds.slice().sort((a, b) => {
    const aStr = String(a).toLowerCase();
    const bStr = String(b).toLowerCase();
    return aStr.localeCompare(bStr);
  });
  
  // 标准化名称（去除空格，转小写）
  const normalizedName = (name || '').trim().toLowerCase();
  
  const str = `${sortedInputs.join(',')}:${normalizedName}`;
  return crypto.createHash('sha256').update(str).digest('hex');
}

// 获取输入物品（验证卡牌归属）
export async function getInputItems(inputItemIds, userId = null) {
  try {
    // 如果输入是字符串数组（名称），从cards表查询
    if (Array.isArray(inputItemIds) && inputItemIds.length > 0 && typeof inputItemIds[0] === 'string' && !inputItemIds[0].match(/^\d+$/)) {
      // 查询卡牌基础信息
      const cardResult = await pool.query(
        `SELECT id, name, rarity, attrs_json, era, ai_civilization_name
         FROM cards
         WHERE name = ANY($1)`,
        [inputItemIds]
      );
      
      // 如果提供了userId，验证用户是否拥有这些卡牌
      if (userId) {
        const deckResult = await pool.query(
          `SELECT card_id, count 
           FROM deck_cards 
           WHERE user_id = $1 AND card_id = ANY($2) AND discovered = true AND count > 0`,
          [userId, cardResult.rows.map(c => c.id)]
        );
        
        const availableCardIds = new Set(deckResult.rows.map(r => r.card_id));
        
        // 检查所有卡牌是否可用
        for (const card of cardResult.rows) {
          if (!availableCardIds.has(card.id)) {
            throw new Error(`卡牌 "${card.name}" 不可用或数量不足`);
          }
        }
        
        // 统计每个卡牌需要的数量
        const cardUsageCount = {};
        for (const name of inputItemIds) {
          cardUsageCount[name] = (cardUsageCount[name] || 0) + 1;
        }
        
        // 验证数量是否足够
        for (const card of cardResult.rows) {
          const needed = cardUsageCount[card.name] || 0;
          const deckCard = deckResult.rows.find(r => r.card_id === card.id);
          const available = deckCard ? deckCard.count : 0;
          
          if (needed > available) {
            throw new Error(`卡牌 "${card.name}" 数量不足，需要 ${needed} 张，可用 ${available} 张`);
          }
        }
      }
      
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
        // 如果找不到卡牌，抛出错误
        throw new Error(`卡牌 "${name}" 不存在`);
      });
    }
    
    // 处理ID数组（物品ID）
    const result = await pool.query(
      'SELECT id, name, tier, attrs_json FROM items WHERE id = ANY($1)',
      [inputItemIds]
    );
    
    if (result.rows.length !== inputItemIds.length) {
      throw new Error('Some input items not found');
    }
    
    return result.rows;
  } catch (err) {
    logger.error({ err, inputItemIds, userId }, 'GetInputItems error');
    throw err;
  }
}

// 消耗输入卡牌
export async function consumeInputCards(userId, cardNames) {
  try {
    // 统计每个卡牌需要消耗的数量
    const cardUsageCount = {};
    for (const name of cardNames) {
      cardUsageCount[name] = (cardUsageCount[name] || 0) + 1;
    }
    
    // 获取卡牌ID
    const cardResult = await pool.query(
      `SELECT id, name FROM cards WHERE name = ANY($1)`,
      [Object.keys(cardUsageCount)]
    );
    
    // 消耗卡牌
    for (const card of cardResult.rows) {
      const count = cardUsageCount[card.name];
      await pool.query(
        `UPDATE deck_cards 
         SET count = GREATEST(0, count - $1)
         WHERE user_id = $2 AND card_id = $3`,
        [count, userId, card.id]
      );
    }
    
    logger.info({ userId, cardNames, counts: cardUsageCount }, 'Input cards consumed');
  } catch (err) {
    logger.error({ err, userId, cardNames }, 'ConsumeInputCards error');
    throw err;
  }
}

