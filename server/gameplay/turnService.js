import pool from '../db/connection.js';
import logger from '../utils/logger.js';
import { calculateTurnProduction } from './resourceService.js';
import { onTurnEnd as handleProfessionTurnEnd } from '../services/professionService.js';

// 结束回合
export async function endTurn(userId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 获取当前回合数
    const turnResult = await client.query(
      'SELECT turn FROM resources WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    
    const currentTurn = turnResult.rows[0]?.turn || 0;
    const nextTurn = currentTurn + 1;
    
    // 计算资源产出
    const production = await calculateTurnProduction(userId);
    
    // 更新资源和回合数
    await client.query(
      `UPDATE resources
       SET food = food + $2,
           production = production + $3,
           research = research + $4,
           turn = $5,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId, production.food, production.production, production.research, nextTurn]
    );
    
    // 触发随机事件
    const events = await triggerRandomEvents(userId, nextTurn, client);
    
    // 推进项目进度
    const projects = await updateProjects(userId, production.production, client);
    
    // 记录日志
    await client.query(
      `INSERT INTO events_log (user_id, type, payload_json, turn)
       VALUES ($1, 'turn_end', $2, $3)`,
      [userId, JSON.stringify({ production, events, projects }), nextTurn]
    );
    
    await client.query('COMMIT');
    
    const professionChoices = await handleProfessionTurnEnd(userId, nextTurn);
    
    logger.info({ userId, turn: nextTurn, production }, 'Turn ended');
    
    return {
      turn: nextTurn,
      production,
      events,
      projects,
      professionChoices,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, userId }, 'EndTurn error');
    throw err;
  } finally {
    client.release();
  }
}

// 触发随机事件
async function triggerRandomEvents(userId, turn, client) {
  const events = [];
  
  // 每5回合触发一个事件
  if (turn % 5 === 0) {
    const eventTypes = [
      { type: 'blessing', desc: '自然的祝福', effect: { food: 10 } },
      { type: 'discovery', desc: '发现新资源', effect: { production: 10 } },
      { type: 'inspiration', desc: '灵感迸发', effect: { research: 10 } },
      { type: 'disaster', desc: '小型灾难', effect: { food: -5 } },
    ];
    
    const event = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    events.push(event);
    
    // 应用效果
    if (event.effect.food) {
      await client.query(
        'UPDATE resources SET food = food + $2 WHERE user_id = $1',
        [userId, event.effect.food]
      );
    }
    if (event.effect.production) {
      await client.query(
        'UPDATE resources SET production = production + $2 WHERE user_id = $1',
        [userId, event.effect.production]
      );
    }
    if (event.effect.research) {
      await client.query(
        'UPDATE resources SET research = research + $2 WHERE user_id = $1',
        [userId, event.effect.research]
      );
    }
  }
  
  return events;
}

// 更新项目进度
async function updateProjects(userId, productionAmount, client) {
  const result = await client.query(
    'SELECT id, name, progress, required_production FROM projects WHERE user_id = $1 AND completed = false',
    [userId]
  );
  
  const updates = [];
  
  for (const project of result.rows) {
    const newProgress = project.progress + productionAmount;
    const completed = newProgress >= project.required_production;
    
    await client.query(
      'UPDATE projects SET progress = $2, completed = $3 WHERE id = $1',
      [project.id, newProgress, completed]
    );
    
    updates.push({
      id: project.id,
      name: project.name,
      progress: newProgress,
      required: project.required_production,
      completed,
    });
  }
  
  return updates;
}

// 获取回合历史
export async function getTurnHistory(userId, limit = 10) {
  try {
    const result = await pool.query(
      `SELECT type, payload_json, turn, created_at
       FROM events_log
       WHERE user_id = $1
       ORDER BY turn DESC
       LIMIT $2`,
      [userId, limit]
    );
    
    return result.rows;
  } catch (err) {
    logger.error({ err, userId }, 'GetTurnHistory error');
    throw err;
  }
}

