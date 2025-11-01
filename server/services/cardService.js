// 卡牌服务
import pool from '../db/connection.js';
import logger from '../utils/logger.js';
import { getCardsByEra, getStarterCards, findCardByName } from '../config/cardConfig.js';

// 获取所有卡牌
export async function getAllCards() {
  try {
    const result = await pool.query(
      `SELECT id, name, type, rarity, era, card_type, 
              unlock_condition, is_starter, is_decoy, attrs_json
       FROM cards 
       ORDER BY era, card_type, name`
    );
    return result.rows;
  } catch (err) {
    logger.error({ err }, 'Failed to get all cards');
    throw err;
  }
}

// 根据时代获取卡牌
export async function getCardsByEraFromDB(eraName) {
  try {
    const result = await pool.query(
      `SELECT id, name, type, rarity, era, card_type, 
              unlock_condition, is_starter, is_decoy, attrs_json
       FROM cards 
       WHERE era = $1
       ORDER BY card_type, name`,
      [eraName]
    );
    return result.rows;
  } catch (err) {
    logger.error({ err, eraName }, 'Failed to get cards by era');
    throw err;
  }
}

// 获取起始卡牌
export async function getStarterCardsFromDB() {
  try {
    const result = await pool.query(
      `SELECT id, name, type, rarity, era, card_type, attrs_json
       FROM cards 
       WHERE is_starter = TRUE
       ORDER BY name`
    );
    return result.rows;
  } catch (err) {
    logger.error({ err }, 'Failed to get starter cards');
    throw err;
  }
}

// 获取用户已解锁的卡牌
export async function getUserUnlockedCards(userId) {
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.type, c.rarity, c.era, c.card_type, 
              c.attrs_json, dc.discovered, dc.count
       FROM cards c
       LEFT JOIN deck_cards dc ON c.id = dc.card_id AND dc.user_id = $1
       WHERE dc.discovered = TRUE OR c.is_starter = TRUE
       ORDER BY c.era, c.card_type, c.name`,
      [userId]
    );
    return result.rows;
  } catch (err) {
    logger.error({ err, userId }, 'Failed to get user unlocked cards');
    throw err;
  }
}

// 解锁卡牌
export async function unlockCard(userId, cardName) {
  try {
    // 查找卡牌ID
    const cardResult = await pool.query(
      'SELECT id FROM cards WHERE name = $1',
      [cardName]
    );
    
    if (cardResult.rows.length === 0) {
      logger.warn({ userId, cardName }, 'Card not found for unlock');
      return null;
    }
    
    const cardId = cardResult.rows[0].id;
    
    // 插入或更新用户卡牌记录
    const result = await pool.query(
      `INSERT INTO deck_cards (user_id, card_id, discovered, count, updated_at)
       VALUES ($1, $2, TRUE, 1, NOW())
       ON CONFLICT (user_id, card_id) 
       DO UPDATE SET discovered = TRUE, count = deck_cards.count + 1, updated_at = NOW()
       RETURNING *`,
      [userId, cardId]
    );
    
    logger.info({ userId, cardName, cardId }, 'Card unlocked');
    return result.rows[0];
  } catch (err) {
    logger.error({ err, userId, cardName }, 'Failed to unlock card');
    throw err;
  }
}

// 检查卡牌是否应该解锁（基于event完成情况）
export async function checkAndUnlockRewardCards(userId, completedEventName) {
  try {
    // 查找该event解锁的奖励卡牌
    const cardsToUnlock = await pool.query(
      `SELECT id, name FROM cards 
       WHERE card_type = 'reward' AND unlock_condition = $1`,
      [completedEventName]
    );
    
    if (cardsToUnlock.rows.length === 0) {
      return [];
    }
    
    // 解锁这些卡牌
    const unlocked = [];
    for (const card of cardsToUnlock.rows) {
      const result = await unlockCard(userId, card.name);
      if (result) {
        unlocked.push(card.name);
      }
    }
    
    logger.info({ userId, completedEventName, unlocked }, 'Reward cards unlocked');
    return unlocked;
  } catch (err) {
    logger.error({ err, userId, completedEventName }, 'Failed to check and unlock reward cards');
    throw err;
  }
}

// 根据时代解锁该时代的初始卡牌
export async function unlockEraCards(userId, eraName) {
  try {
    // 获取该时代的所有初始灵感卡
    const eraCards = await pool.query(
      `SELECT id, name FROM cards 
       WHERE era = $1 AND card_type = 'inspiration' AND is_starter = FALSE`,
      [eraName]
    );
    
    const unlocked = [];
    for (const card of eraCards.rows) {
      const result = await unlockCard(userId, card.name);
      if (result) {
        unlocked.push(card.name);
      }
    }
    
    logger.info({ userId, eraName, unlocked }, 'Era cards unlocked');
    return unlocked;
  } catch (err) {
    logger.error({ err, userId, eraName }, 'Failed to unlock era cards');
    throw err;
  }
}

// 获取卡牌详情
export async function getCardDetails(cardName) {
  try {
    const result = await pool.query(
      `SELECT id, name, type, rarity, era, card_type, 
              unlock_condition, is_starter, is_decoy, attrs_json,
              is_base_card, created_by_user_id, source_type
       FROM cards 
       WHERE name = $1`,
      [cardName]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (err) {
    logger.error({ err, cardName }, 'Failed to get card details');
    throw err;
  }
}

// 创建或获取用户生成的卡牌
export async function createOrGetUserCard(userId, cardData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      name,
      type = 'inspiration',
      rarity = 'common',
      era = null,
      card_type = 'inspiration',
      attrs_json = {},
      source_type = 'user_generated',
    } = cardData;
    
    // 检查卡牌是否已存在
    const existingCard = await client.query(
      'SELECT id, is_base_card, source_type FROM cards WHERE name = $1',
      [name]
    );
    
    let cardId;
    let isNewCard = false;
    
    if (existingCard.rows.length > 0) {
      // 卡牌已存在，直接使用
      cardId = existingCard.rows[0].id;
      logger.info({ cardId, name, userId }, 'Card already exists, reusing');
    } else {
      // 创建新卡牌
      const newCard = await client.query(
        `INSERT INTO cards (
          name, type, rarity, era, card_type, attrs_json,
          is_base_card, created_by_user_id, source_type,
          is_starter, is_decoy
        ) VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7, $8, FALSE, FALSE)
        RETURNING id`,
        [name, type, rarity, era, card_type, attrs_json, userId, source_type]
      );
      
      cardId = newCard.rows[0].id;
      isNewCard = true;
      logger.info({ cardId, name, userId, source_type }, 'New user card created');
    }
    
    // 添加到用户背包（如果还没有）
    await client.query(
      `INSERT INTO deck_cards (user_id, card_id, discovered, count, updated_at)
       VALUES ($1, $2, TRUE, 1, NOW())
       ON CONFLICT (user_id, card_id) 
       DO UPDATE SET count = deck_cards.count + 1, discovered = TRUE, updated_at = NOW()`,
      [userId, cardId]
    );
    
    await client.query('COMMIT');
    
    return {
      cardId,
      name,
      isNewCard,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, userId, cardData }, 'Failed to create or get user card');
    throw err;
  } finally {
    client.release();
  }
}

// 获取用户创建的卡牌列表
export async function getUserCreatedCards(userId) {
  try {
    const result = await pool.query(
      `SELECT id, name, type, rarity, era, card_type, attrs_json, 
              source_type, created_at
       FROM cards 
       WHERE created_by_user_id = $1 AND is_base_card = FALSE
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  } catch (err) {
    logger.error({ err, userId }, 'Failed to get user created cards');
    throw err;
  }
}

// 获取所有基础卡牌
export async function getBaseCards() {
  try {
    const result = await pool.query(
      `SELECT id, name, type, rarity, era, card_type, 
              unlock_condition, is_starter, is_decoy, attrs_json
       FROM cards 
       WHERE is_base_card = TRUE
       ORDER BY era, card_type, name`
    );
    return result.rows;
  } catch (err) {
    logger.error({ err }, 'Failed to get base cards');
    throw err;
  }
}

// 获取所有用户生成的卡牌
export async function getAllUserGeneratedCards(limit = 100, offset = 0) {
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.type, c.rarity, c.era, c.card_type, 
              c.attrs_json, c.source_type, c.created_at,
              u.username as creator_name, c.created_by_user_id
       FROM cards c
       LEFT JOIN users u ON c.created_by_user_id = u.id
       WHERE c.is_base_card = FALSE
       ORDER BY c.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  } catch (err) {
    logger.error({ err }, 'Failed to get user generated cards');
    throw err;
  }
}

