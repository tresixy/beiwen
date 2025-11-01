import pool from '../db/connection.js';
import logger from '../utils/logger.js';

// 获取资源
export async function getResources(userId) {
  try {
    const result = await pool.query(
      'SELECT food, production, research, turn FROM resources WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return { food: 0, production: 0, research: 0, turn: 0 };
    }
    
    return result.rows[0];
  } catch (err) {
    logger.error({ err, userId }, 'GetResources error');
    throw err;
  }
}

// 更新资源
export async function updateResources(userId, delta) {
  try {
    const result = await pool.query(
      `UPDATE resources
       SET food = food + $2,
           production = production + $3,
           research = research + $4,
           updated_at = NOW()
       WHERE user_id = $1
       RETURNING food, production, research, turn`,
      [userId, delta.food || 0, delta.production || 0, delta.research || 0]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Resources not found');
    }
    
    logger.info({ userId, delta, result: result.rows[0] }, 'Resources updated');
    
    return result.rows[0];
  } catch (err) {
    logger.error({ err, userId, delta }, 'UpdateResources error');
    throw err;
  }
}

// 计算回合资源产出
export async function calculateTurnProduction(userId) {
  try {
    // 获取所有实体
    const entities = await pool.query(
      `SELECT kind, attrs_json FROM entities WHERE user_id = $1`,
      [userId]
    );
    
    let food = 0;
    let production = 0;
    let research = 0;
    
    // 基础产出
    food += 5;
    production += 3;
    research += 2;
    
    // 实体产出
    for (const entity of entities.rows) {
      const attrs = entity.attrs_json;
      
      if (entity.kind === 'building') {
        food += attrs.food_production || 0;
        production += attrs.production || 0;
        research += attrs.research || 0;
      }
      
      if (entity.kind === 'unit') {
        food -= attrs.food_cost || 1; // 单位消耗食物
      }
    }
    
    return {
      food: Math.max(food, -10), // 最低-10
      production: Math.max(production, 0),
      research: Math.max(research, 0),
    };
  } catch (err) {
    logger.error({ err, userId }, 'CalculateTurnProduction error');
    throw err;
  }
}

// 消耗资源
export async function consumeResources(userId, cost) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      'SELECT food, production, research FROM resources WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Resources not found');
    }
    
    const current = result.rows[0];
    
    // 检查是否足够
    if (
      (cost.food && current.food < cost.food) ||
      (cost.production && current.production < cost.production) ||
      (cost.research && current.research < cost.research)
    ) {
      throw new Error('Insufficient resources');
    }
    
    // 扣除
    await client.query(
      `UPDATE resources
       SET food = food - $2,
           production = production - $3,
           research = research - $4,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId, cost.food || 0, cost.production || 0, cost.research || 0]
    );
    
    await client.query('COMMIT');
    
    logger.info({ userId, cost }, 'Resources consumed');
    
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, userId, cost }, 'ConsumeResources error');
    throw err;
  } finally {
    client.release();
  }
}

