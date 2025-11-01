import pool from '../db/connection.js';
import logger from '../utils/logger.js';

// 抽牌
export async function drawCards(userId, count = 3) {
  try {
    // 获取已解锁的卡牌
    const result = await pool.query(
      `SELECT c.id, c.name, c.type, c.rarity, c.attrs_json, dc.count
       FROM deck_cards dc
       JOIN cards c ON dc.card_id = c.id
       WHERE dc.user_id = $1 AND dc.discovered = true AND dc.count > 0`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('No cards available');
    }
    
    // 权重抽卡（稀有度影响）
    const cards = result.rows;
    const hand = [];
    
    for (let i = 0; i < count && cards.length > 0; i++) {
      const weights = cards.map(c => {
        const rarityWeight = {
          common: 50,
          uncommon: 30,
          rare: 15,
          epic: 4,
          legendary: 1,
        }[c.rarity] || 30;
        return rarityWeight;
      });
      
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let random = Math.random() * totalWeight;
      
      let selectedIndex = 0;
      for (let j = 0; j < weights.length; j++) {
        random -= weights[j];
        if (random <= 0) {
          selectedIndex = j;
          break;
        }
      }
      
      hand.push(cards[selectedIndex]);
    }
    
    logger.info({ userId, count, drawn: hand.length }, 'Cards drawn');
    
    return hand;
  } catch (err) {
    logger.error({ err, userId, count }, 'DrawCards error');
    throw err;
  }
}

// 获取牌库状态
export async function getDeckState(userId) {
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.type, c.rarity, dc.discovered, dc.count
       FROM deck_cards dc
       JOIN cards c ON dc.card_id = c.id
       WHERE dc.user_id = $1
       ORDER BY dc.discovered DESC, c.rarity, c.name`,
      [userId]
    );
    
    return {
      cards: result.rows,
      totalDiscovered: result.rows.filter(c => c.discovered).length,
      totalCards: result.rows.length,
    };
  } catch (err) {
    logger.error({ err, userId }, 'GetDeckState error');
    throw err;
  }
}

// 解锁卡牌
export async function unlockCard(userId, cardId) {
  try {
    await pool.query(
      `INSERT INTO deck_cards (user_id, card_id, discovered, count)
       VALUES ($1, $2, true, 1)
       ON CONFLICT (user_id, card_id)
       DO UPDATE SET discovered = true, count = deck_cards.count + 1`,
      [userId, cardId]
    );
    
    logger.info({ userId, cardId }, 'Card unlocked');
    
    return true;
  } catch (err) {
    logger.error({ err, userId, cardId }, 'UnlockCard error');
    throw err;
  }
}

