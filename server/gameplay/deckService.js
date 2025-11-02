import pool from '../db/connection.js';
import logger from '../utils/logger.js';

// 抽牌（只抽取灵感卡，钥匙卡通过合成获得）
export async function drawCards(userId, count = 3) {
  try {
    // 获取已解锁的灵感卡（排除钥匙卡和奖励卡）
    const result = await pool.query(
      `SELECT c.id, c.name, c.type, c.rarity, c.attrs_json, c.era, c.card_type, dc.count
       FROM deck_cards dc
       JOIN cards c ON dc.card_id = c.id
       WHERE dc.user_id = $1 
         AND dc.discovered = true 
         AND dc.count > 0
         AND c.card_type = 'inspiration'`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      logger.warn({ userId }, 'No inspiration cards available for drawing');
      throw new Error('没有可用的灵感卡，请先解锁一些灵感卡');
    }
    
    // 权重抽卡（灵感卡通常都是common，权重相同）
    const cards = result.rows;
    logger.info({ 
      userId, 
      availableCards: cards.length, 
      cardList: cards.map(c => ({ name: c.name, rarity: c.rarity, count: c.count }))
    }, 'Available cards for drawing');
    
    const hand = [];
    
    for (let i = 0; i < count && cards.length > 0; i++) {
      const weights = cards.map(c => {
        const rarityWeight = {
          common: 50,
          uncommon: 30,
          rare: 15,
          ruby: 15,
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
      
      const selectedCard = cards[selectedIndex];
      // 格式化卡牌数据，确保包含前端需要的所有字段
      hand.push({
        id: `card-${selectedCard.id}-${Date.now()}-${i}`,
        name: selectedCard.name,
        type: selectedCard.type,
        rarity: selectedCard.rarity,
        era: selectedCard.era,
        cardType: selectedCard.card_type,
        tier: 1,
        attrs: selectedCard.attrs_json || {},
      });
    }
    
    logger.info({ userId, count, drawn: hand.length, cards: hand.map(c => c.name) }, 'Cards drawn');
    
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

