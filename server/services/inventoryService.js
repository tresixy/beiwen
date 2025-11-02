import pool from '../db/connection.js';
import logger from '../utils/logger.js';

export async function getInventory(userId) {
  try {
    const result = await pool.query(
      'SELECT slots_json FROM inventories WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return { slots: Array(20).fill(null) };
    }
    
    const slots = result.rows[0].slots_json;
    
    // 获取物品详情
    const itemIds = slots.filter(id => id !== null);
    if (itemIds.length === 0) {
      return { slots };
    }
    
    const items = await pool.query(
      'SELECT id, name, tier, attrs_json FROM items WHERE id = ANY($1)',
      [itemIds]
    );
    
    const itemMap = {};
    items.rows.forEach(item => {
      itemMap[item.id] = item;
    });
    
    return { slots, items: itemMap };
  } catch (err) {
    logger.error({ err, userId }, 'GetInventory error');
    throw err;
  }
}

export async function addItem(userId, itemId, slot = null) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      'SELECT slots_json FROM inventories WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    
    let slots = result.rows[0]?.slots_json || Array(20).fill(null);
    
    // 找空位
    if (slot === null) {
      slot = slots.findIndex(s => s === null);
      if (slot === -1) {
        throw new Error('Inventory full');
      }
    }
    
    if (slots[slot] !== null) {
      throw new Error('Slot occupied');
    }
    
    slots[slot] = itemId;
    
    await client.query(
      'UPDATE inventories SET slots_json = $1, updated_at = NOW() WHERE user_id = $2',
      [JSON.stringify(slots), userId]
    );
    
    await client.query('COMMIT');
    
    logger.info({ userId, itemId, slot }, 'Item added to inventory');
    
    return { slot, slots };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, userId, itemId }, 'AddItem error');
    throw err;
  } finally {
    client.release();
  }
}

// 将手牌中的卡牌加入背包（事件完成时使用）
export async function addCardsToInventory(userId, cardNames) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const addedCards = [];
    const failedCards = [];
    
    for (const cardName of cardNames) {
      try {
        // 查找或创建物品
        let itemResult = await client.query(
          'SELECT id FROM items WHERE user_id = $1 AND name = $2 LIMIT 1',
          [userId, cardName]
        );
        
        let itemId;
        if (itemResult.rows.length > 0) {
          itemId = itemResult.rows[0].id;
        } else {
          // 创建新物品
          const insertResult = await client.query(
            `INSERT INTO items (user_id, name, tier, attrs) 
             VALUES ($1, $2, 1, $3) 
             RETURNING id`,
            [userId, cardName, JSON.stringify({ description: `来自手牌的卡牌：${cardName}` })]
          );
          itemId = insertResult.rows[0].id;
        }
        
        // 获取当前背包
        const invResult = await client.query(
          'SELECT slots_json FROM inventories WHERE user_id = $1 FOR UPDATE',
          [userId]
        );
        
        let slots = invResult.rows[0]?.slots_json || Array(20).fill(null);
        
        // 找空位
        const emptySlot = slots.findIndex(s => s === null);
        if (emptySlot === -1) {
          failedCards.push({ name: cardName, reason: 'Inventory full' });
          continue;
        }
        
        slots[emptySlot] = itemId;
        
        await client.query(
          'UPDATE inventories SET slots_json = $1, updated_at = NOW() WHERE user_id = $2',
          [JSON.stringify(slots), userId]
        );
        
        addedCards.push({ name: cardName, itemId, slot: emptySlot });
        
      } catch (cardErr) {
        logger.error({ err: cardErr, userId, cardName }, 'Failed to add card to inventory');
        failedCards.push({ name: cardName, reason: cardErr.message });
      }
    }
    
    await client.query('COMMIT');
    
    logger.info({ userId, addedCards, failedCards }, 'Cards added to inventory');
    
    return { addedCards, failedCards };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, userId, cardNames }, 'AddCardsToInventory error');
    throw err;
  } finally {
    client.release();
  }
}

export async function removeItem(userId, itemId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      'SELECT slots_json FROM inventories WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    
    let slots = result.rows[0]?.slots_json || [];
    
    const index = slots.indexOf(itemId);
    if (index === -1) {
      throw new Error('Item not found in inventory');
    }
    
    slots[index] = null;
    
    await client.query(
      'UPDATE inventories SET slots_json = $1, updated_at = NOW() WHERE user_id = $2',
      [JSON.stringify(slots), userId]
    );
    
    await client.query('COMMIT');
    
    logger.info({ userId, itemId }, 'Item removed from inventory');
    
    return { slots };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, userId, itemId }, 'RemoveItem error');
    throw err;
  } finally {
    client.release();
  }
}

