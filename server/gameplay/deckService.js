import pool from '../db/connection.js';
import logger from '../utils/logger.js';

// 抽牌（只抽取灵感卡，钥匙卡通过合成获得）
// 只能抽取基础卡牌，不能抽用户合成的卡牌
export async function drawCards(userId, count = 3) {
  try {
    // 获取玩家手牌状态，判断是否是第一次抽牌
    const stateResult = await pool.query(
      'SELECT hand_json FROM user_game_state WHERE user_id = $1',
      [userId]
    );
    const currentHand = stateResult.rows.length > 0 ? stateResult.rows[0].hand_json : null;
    
    // 判断是否是第一次抽牌（手牌为空或null）
    const isFirstDraw = !currentHand || currentHand.length === 0;
    
    // 获取可抽取的灵感卡：只能抽取基础卡牌（is_base_card = TRUE），不能抽用户合成的卡牌
    const result = await pool.query(
      `SELECT c.id, c.name, c.type, c.rarity, c.attrs_json, c.era, c.card_type, dc.count
       FROM deck_cards dc
       JOIN cards c ON dc.card_id = c.id
       WHERE dc.user_id = $1 
         AND dc.discovered = true 
         AND dc.count > 0
         AND c.card_type = 'inspiration'
         AND c.is_base_card = TRUE`,
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
      cardList: cards.map(c => ({ name: c.name, rarity: c.rarity, count: c.count })),
      isFirstDraw
    }, 'Available cards for drawing');
    
    const hand = [];
    const availableCards = [...cards]; // 复制一份可用卡牌列表
    
    // 第一次抽牌时，确保第一张是"人"卡
    if (isFirstDraw && count > 0) {
      const humanCardIndex = availableCards.findIndex(c => c.name === '人');
      if (humanCardIndex !== -1) {
        const humanCard = availableCards[humanCardIndex];
        hand.push({
          id: `card-${humanCard.id}-${Date.now()}-0`,
          name: humanCard.name,
          type: humanCard.type,
          rarity: humanCard.rarity,
          era: humanCard.era,
          cardType: humanCard.card_type,
          tier: 1,
          attrs: humanCard.attrs_json || {},
        });
        // 从可用列表中移除"人"卡
        availableCards.splice(humanCardIndex, 1);
        logger.info({ userId }, '第一次抽牌，保证抽到"人"卡');
      }
    }
    
    // 抽取剩余的卡牌（允许重复抽取同一种卡）
    const remainingCount = count - hand.length;
    for (let i = 0; i < remainingCount; i++) {
      if (cards.length === 0) break; // 没有可用卡牌则停止
      
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
        id: `card-${selectedCard.id}-${Date.now()}-${hand.length}-${Math.random().toString(36).substr(2, 9)}`,
        name: selectedCard.name,
        type: selectedCard.type,
        rarity: selectedCard.rarity,
        era: selectedCard.era,
        cardType: selectedCard.card_type,
        tier: 1,
        attrs: selectedCard.attrs_json || {},
      });
      
      // 不再移除已选择的卡牌，允许重复抽取
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
      `SELECT c.id, c.name, c.type, c.rarity, c.card_type, dc.discovered, dc.count
       FROM deck_cards dc
       JOIN cards c ON dc.card_id = c.id
       WHERE dc.user_id = $1
         AND (c.created_by_user_id = $1 OR c.created_by_user_id IS NULL OR c.is_base_card = TRUE)
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

// 更新卡牌类型（将inspiration卡标记为keycard）
export async function updateCardType(userId, cardName, cardType, rarity) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 更新cards表中的card_type和rarity
    const updateResult = await client.query(
      `UPDATE cards 
       SET card_type = $1, rarity = $2
       WHERE name = $3 AND source_type = 'user_generated'
       RETURNING id`,
      [cardType, rarity, cardName]
    );
    
    if (updateResult.rows.length === 0) {
      throw new Error(`Card ${cardName} not found`);
    }
    
    await client.query('COMMIT');
    logger.info({ userId, cardName, cardType, rarity }, 'Card type updated');
    
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, userId, cardName, cardType }, 'UpdateCardType error');
    throw err;
  } finally {
    client.release();
  }
}

