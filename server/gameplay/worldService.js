import pool from '../db/connection.js';
import logger from '../utils/logger.js';

// 获取世界状态
export async function getWorldState(userId) {
  try {
    const tiles = await pool.query(
      'SELECT x, y, biome, data_json FROM world_tiles WHERE user_id = $1',
      [userId]
    );
    
    const entities = await pool.query(
      'SELECT id, kind, card_id, x, y, attrs_json FROM entities WHERE user_id = $1',
      [userId]
    );
    
    return {
      tiles: tiles.rows,
      entities: entities.rows,
    };
  } catch (err) {
    logger.error({ err, userId }, 'GetWorldState error');
    throw err;
  }
}

// 初始化世界地图
export async function initWorld(userId, size = 10) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 创建基础地块
    const biomes = ['plains', 'forest', 'mountains', 'water'];
    
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const biome = biomes[Math.floor(Math.random() * biomes.length)];
        await client.query(
          `INSERT INTO world_tiles (user_id, x, y, biome)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, x, y) DO NOTHING`,
          [userId, x, y, biome]
        );
      }
    }
    
    await client.query('COMMIT');
    
    logger.info({ userId, size }, 'World initialized');
    
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, userId, size }, 'InitWorld error');
    throw err;
  } finally {
    client.release();
  }
}

// 放置实体
export async function placeEntity(userId, kind, cardId, x, y, attrs = {}) {
  try {
    const result = await pool.query(
      `INSERT INTO entities (user_id, kind, card_id, x, y, attrs_json)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, kind, cardId, x, y, JSON.stringify(attrs)]
    );
    
    const entityId = result.rows[0].id;
    
    logger.info({ userId, entityId, kind, x, y }, 'Entity placed');
    
    return entityId;
  } catch (err) {
    logger.error({ err, userId, kind, x, y }, 'PlaceEntity error');
    throw err;
  }
}

// 移除实体
export async function removeEntity(userId, entityId) {
  try {
    await pool.query(
      'DELETE FROM entities WHERE id = $1 AND user_id = $2',
      [entityId, userId]
    );
    
    logger.info({ userId, entityId }, 'Entity removed');
    
    return true;
  } catch (err) {
    logger.error({ err, userId, entityId }, 'RemoveEntity error');
    throw err;
  }
}

