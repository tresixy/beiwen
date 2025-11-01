import pool from '../db/connection.js';
import logger from '../utils/logger.js';
import { getEraOrder } from '../config/eraConfig.js';
import * as cardService from './cardService.js';

// 为玩家生成本局的events序列
export async function generateEventSequence(userId) {
  try {
    // 获取所有events
    const eventsResult = await pool.query(
      'SELECT * FROM events ORDER BY event_number'
    );
    const allEvents = eventsResult.rows;

    // 按时代分组
    const eventsByEra = {};
    allEvents.forEach(event => {
      if (!eventsByEra[event.era]) {
        eventsByEra[event.era] = [];
      }
      eventsByEra[event.era].push(event);
    });

    // 为每个时代随机选择一个event
    const sequence = [];
    const eras = ['生存时代', '城邦时代', '分野时代', '帝国时代', '理性时代', '信仰时代', '启蒙时代'];
    
    for (const era of eras) {
      const eraEvents = eventsByEra[era] || [];
      if (eraEvents.length > 0) {
        // 随机选择一个event
        const selected = eraEvents[Math.floor(Math.random() * eraEvents.length)];
        sequence.push(selected.id);
      }
    }

    // 保存到数据库
    await pool.query(
      `INSERT INTO user_game_state (user_id, event_sequence, updated_at) 
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET event_sequence = $2, updated_at = NOW()`,
      [userId, JSON.stringify(sequence)]
    );

    logger.info({ userId, sequence }, 'Event sequence generated');
    return sequence;
  } catch (err) {
    logger.error({ err, userId }, 'GenerateEventSequence error');
    throw err;
  }
}

// 获取玩家的events状态
export async function getEventState(userId) {
  try {
    const result = await pool.query(
      `SELECT era, unlocked_keys, completed_events, active_event_id, event_sequence 
       FROM user_game_state 
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // 初始化：生成序列并设置第一个event为激活状态
      const sequence = await generateEventSequence(userId);
      const firstEventId = sequence.length > 0 ? sequence[0] : null;
      
      await pool.query(
        `INSERT INTO user_game_state (user_id, era, unlocked_keys, completed_events, active_event_id, event_sequence, updated_at) 
         VALUES ($1, '生存时代', '[]', '[]', $2, $3, NOW())`,
        [userId, firstEventId, JSON.stringify(sequence)]
      );

      return {
        era: '生存时代',
        unlockedKeys: [],
        completedEvents: [],
        activeEventId: firstEventId,
        eventSequence: sequence,
      };
    }

    const row = result.rows[0];
    return {
      era: row.era || '生存时代',
      unlockedKeys: row.unlocked_keys || [],
      completedEvents: row.completed_events || [],
      activeEventId: row.active_event_id,
      eventSequence: row.event_sequence || [],
    };
  } catch (err) {
    logger.error({ err, userId }, 'GetEventState error');
    throw err;
  }
}

// 获取当前激活的event详情
export async function getActiveEvent(userId) {
  try {
    const state = await getEventState(userId);
    if (!state.activeEventId) {
      return null;
    }

    const result = await pool.query(
      'SELECT * FROM events WHERE id = $1',
      [state.activeEventId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      ...result.rows[0],
      progress: state.completedEvents.length,
      totalEvents: state.eventSequence.length,
    };
  } catch (err) {
    logger.error({ err, userId }, 'GetActiveEvent error');
    throw err;
  }
}

// 完成event，解锁钥匙并激活下一个event
export async function completeEvent(userId, eventId, unlockedKey) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 获取当前状态
    const stateResult = await client.query(
      `SELECT era, unlocked_keys, completed_events, event_sequence 
       FROM user_game_state 
       WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );

    if (stateResult.rows.length === 0) {
      throw new Error('玩家状态不存在');
    }

    const state = stateResult.rows[0];
    const completedEvents = state.completed_events || [];
    const unlockedKeys = state.unlocked_keys || [];
    const eventSequence = state.event_sequence || [];

    // 检查是否已完成
    if (completedEvents.includes(eventId)) {
      throw new Error('该event已完成');
    }

    // 添加到已完成列表
    completedEvents.push(eventId);
    
    // 添加解锁的钥匙
    if (unlockedKey && !unlockedKeys.includes(unlockedKey)) {
      unlockedKeys.push(unlockedKey);
    }

    // 获取下一个event
    const currentIndex = eventSequence.indexOf(eventId);
    const nextEventId = currentIndex >= 0 && currentIndex < eventSequence.length - 1
      ? eventSequence[currentIndex + 1]
      : null;

    // 检查是否需要升级时代
    let newEra = state.era;
    if (nextEventId) {
      const nextEventResult = await client.query(
        'SELECT era FROM events WHERE id = $1',
        [nextEventId]
      );
      if (nextEventResult.rows.length > 0) {
        const nextEventEra = nextEventResult.rows[0].era;
        if (getEraOrder(nextEventEra) > getEraOrder(state.era)) {
          newEra = nextEventEra;
          logger.info({ userId, oldEra: state.era, newEra }, 'Era upgraded');
        }
      }
    }

    // 更新状态
    await client.query(
      `UPDATE user_game_state 
       SET era = $2, 
           unlocked_keys = $3, 
           completed_events = $4, 
           active_event_id = $5, 
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId, newEra, JSON.stringify(unlockedKeys), JSON.stringify(completedEvents), nextEventId]
    );

    // 记录日志
    await client.query(
      `INSERT INTO events_log (user_id, type, payload_json, turn)
       VALUES ($1, 'event_completed', $2, (SELECT turn FROM resources WHERE user_id = $1))`,
      [userId, JSON.stringify({ eventId, unlockedKey, newEra })]
    );

    await client.query('COMMIT');

    logger.info({ userId, eventId, unlockedKey, newEra }, 'Event completed');

    // 完成事务后，解锁奖励卡牌（不在事务中执行，避免阻塞）
    try {
      const eventResult = await pool.query('SELECT name FROM events WHERE id = $1', [eventId]);
      if (eventResult.rows.length > 0) {
        const eventName = eventResult.rows[0].name.replace(/【|】/g, ''); // 移除【】符号
        const unlockedRewardCards = await cardService.checkAndUnlockRewardCards(userId, eventName);
        logger.info({ userId, eventId, eventName, unlockedRewardCards }, 'Reward cards unlocked after event');
      }
    } catch (cardErr) {
      logger.error({ err: cardErr, userId, eventId }, 'Failed to unlock reward cards');
      // 不抛出错误，因为event已经完成
    }
    
    // 如果进入新时代，解锁该时代的初始卡牌
    if (newEra !== state.era) {
      try {
        const unlockedEraCards = await cardService.unlockEraCards(userId, newEra);
        logger.info({ userId, newEra, unlockedEraCards }, 'Era cards unlocked');
      } catch (eraCardErr) {
        logger.error({ err: eraCardErr, userId, newEra }, 'Failed to unlock era cards');
      }
    }

    return {
      success: true,
      newEra,
      unlockedKey,
      nextEventId,
      completedCount: completedEvents.length,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, userId, eventId }, 'CompleteEvent error');
    throw err;
  } finally {
    client.release();
  }
}

// 检查玩家是否拥有某个钥匙
export async function hasKey(userId, keyName) {
  try {
    const state = await getEventState(userId);
    return state.unlockedKeys.includes(keyName);
  } catch (err) {
    logger.error({ err, userId, keyName }, 'HasKey error');
    return false;
  }
}

// 获取玩家进度概览
export async function getProgressOverview(userId) {
  try {
    const state = await getEventState(userId);
    const activeEvent = await getActiveEvent(userId);

    // 获取所有events详情
    const eventsResult = await pool.query(
      'SELECT * FROM events WHERE id = ANY($1) ORDER BY event_number',
      [state.eventSequence]
    );

    const allEvents = eventsResult.rows.map(event => ({
      ...event,
      completed: state.completedEvents.includes(event.id),
      active: event.id === state.activeEventId,
    }));

    return {
      era: state.era,
      unlockedKeys: state.unlockedKeys,
      completedCount: state.completedEvents.length,
      totalCount: state.eventSequence.length,
      activeEvent,
      allEvents,
    };
  } catch (err) {
    logger.error({ err, userId }, 'GetProgressOverview error');
    throw err;
  }
}

