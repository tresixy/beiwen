import pool from '../db/connection.js';
import logger from '../utils/logger.js';
import { getEraOrder } from '../config/eraConfig.js';
import * as cardService from './cardService.js';
import * as tileMarkerService from './tileMarkerService.js';

// 为玩家生成本局的events序列
export async function generateEventSequence(userId) {
  try {
    // 获取所有events，按event_number严格排序
    const eventsResult = await pool.query(
      'SELECT id FROM events ORDER BY event_number ASC'
    );
    
    // 按照排序顺序生成序列，玩家将依次触发所有困境
    const sequence = eventsResult.rows.map(row => row.id);

    // 保存到数据库
    await pool.query(
      `INSERT INTO user_game_state (user_id, event_sequence, updated_at) 
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET event_sequence = $2, updated_at = NOW()`,
      [userId, JSON.stringify(sequence)]
    );

    logger.info({ userId, sequenceLength: sequence.length }, 'Event sequence generated in order');
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
    
    // 如果event_sequence为空或null，重新生成
    if (!row.event_sequence || row.event_sequence.length === 0) {
      const sequence = await generateEventSequence(userId);
      const firstEventId = sequence.length > 0 ? sequence[0] : null;
      
      await pool.query(
        `UPDATE user_game_state 
         SET event_sequence = $2, active_event_id = $3, updated_at = NOW()
         WHERE user_id = $1`,
        [userId, JSON.stringify(sequence), firstEventId]
      );
      
      return {
        era: row.era || '生存时代',
        unlockedKeys: row.unlocked_keys || [],
        completedEvents: row.completed_events || [],
        activeEventId: firstEventId,
        eventSequence: sequence,
      };
    }
    
    const eventSequence = row.event_sequence || [];
    const completedEvents = row.completed_events || [];
    let activeEventId = row.active_event_id;
    
    // 如果active_event_id为空，需要设置激活事件
    if (!activeEventId) {
      // 如果已完成事件数为0，设置为第一个事件
      if (completedEvents.length === 0) {
        // 获取event_number=1的事件ID
        const firstEventResult = await pool.query(
          'SELECT id FROM events WHERE event_number = 1 LIMIT 1'
        );
        const correctFirstEventId = firstEventResult.rows.length > 0 ? firstEventResult.rows[0].id : null;
        
        activeEventId = correctFirstEventId || (eventSequence.length > 0 ? eventSequence[0] : null);
        
        // 同时确保序列的第一个也是event_number=1的事件
        if (eventSequence.length > 0 && eventSequence[0] !== correctFirstEventId) {
          // 重新生成正确的序列
          const sequence = await generateEventSequence(userId);
          activeEventId = sequence.length > 0 ? sequence[0] : null;
          
          await pool.query(
            `UPDATE user_game_state 
             SET event_sequence = $2, active_event_id = $3, updated_at = NOW()
             WHERE user_id = $1`,
            [userId, JSON.stringify(sequence), activeEventId]
          );
          
          return {
            era: row.era || '生存时代',
            unlockedKeys: row.unlocked_keys || [],
            completedEvents: completedEvents,
            activeEventId: activeEventId,
            eventSequence: sequence,
          };
        } else {
          // 只更新active_event_id
          await pool.query(
            `UPDATE user_game_state 
             SET active_event_id = $2, updated_at = NOW()
             WHERE user_id = $1`,
            [userId, activeEventId]
          );
        }
      } else {
        // 如果有已完成事件但active_event_id为空，设置为序列中下一个未完成的事件
        const nextUncompletedIndex = completedEvents.length;
        activeEventId = nextUncompletedIndex < eventSequence.length 
          ? eventSequence[nextUncompletedIndex] 
          : null;
        
        if (activeEventId) {
          await pool.query(
            `UPDATE user_game_state 
             SET active_event_id = $2, updated_at = NOW()
             WHERE user_id = $1`,
            [userId, activeEventId]
          );
        }
      }
    }
    
    return {
      era: row.era || '生存时代',
      unlockedKeys: row.unlocked_keys || [],
      completedEvents: completedEvents,
      activeEventId: activeEventId,
      eventSequence: eventSequence,
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

    const event = result.rows[0];
    
    // 解锁该 event 所属时代的灵感卡（如果还没解锁）
    if (event.era) {
      try {
        const unlockedEraCards = await cardService.unlockEraCards(userId, event.era);
        if (unlockedEraCards.length > 0) {
          logger.info({ userId, eventEra: event.era, unlockedEraCards }, 'Auto-unlocked era cards for active event');
        }
      } catch (eraCardErr) {
        logger.error({ err: eraCardErr, userId, eventEra: event.era }, 'Failed to auto-unlock era cards');
      }
    }

    return {
      ...event,
      progress: state.completedEvents.length,
      totalEvents: state.eventSequence.length,
    };
  } catch (err) {
    logger.error({ err, userId }, 'GetActiveEvent error');
    throw err;
  }
}

// 完成event，解锁钥匙并激活下一个event
export async function completeEvent(userId, eventId, unlockedKey, selectedHex = null, isFullVictory = true, selectedRegionTiles = null) {
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
      
      // 将 keycard 添加到用户的卡牌池（deck_cards）
      try {
        const unlockResult = await cardService.unlockCard(userId, unlockedKey);
        logger.info({ userId, unlockedKey, unlockResult }, 'Keycard unlocked to deck');
      } catch (keyErr) {
        logger.error({ err: keyErr, userId, unlockedKey }, 'Failed to unlock keycard to deck');
        // 不抛出错误，继续执行
      }
    }

    // 获取下一个event
    const currentIndex = eventSequence.indexOf(eventId);
    let nextEventId = currentIndex >= 0 && currentIndex < eventSequence.length - 1
      ? eventSequence[currentIndex + 1]
      : null;

    // 检查是否需要升级时代
    let newEra = state.era;
    
    // 特殊处理第二次分野时代：根据选择的钥匙决定进入星辰时代还是奇点时代
    if (state.era === '第二次分野时代') {
      if (unlockedKey === '太空电梯') {
        newEra = '星辰时代';
        logger.info({ userId, choice: unlockedKey, newEra }, 'Chosen stellar path');
      } else if (unlockedKey === '脑机接口') {
        newEra = '奇点时代';
        logger.info({ userId, choice: unlockedKey, newEra }, 'Chosen singularity path');
      }
      
      // 第二次分野后需要生成新的事件序列
      if (newEra !== state.era) {
        const eras = newEra === '星辰时代' 
          ? ['星辰时代']
          : ['奇点时代'];
        
        const newSequence = [];
        for (const era of eras) {
          const eraResult = await client.query(
            'SELECT id FROM events WHERE era = $1 ORDER BY event_number',
            [era]
          );
          newSequence.push(...eraResult.rows.map(r => r.id));
        }
        
        // 更新事件序列
        await client.query(
          'UPDATE user_game_state SET event_sequence = $1 WHERE user_id = $2',
          [JSON.stringify(newSequence), userId]
        );
        
        // 设置下一个事件为新序列的第一个（覆盖之前计算的nextEventId）
        nextEventId = newSequence.length > 0 ? newSequence[0] : null;
      }
    } else if (nextEventId) {
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

    // 获取事件信息用于后续处理
    let eventName = '';
    let eventReward = '';
    let unlockedRewardCards = [];
    try {
      const eventResult = await pool.query('SELECT name, reward FROM events WHERE id = $1', [eventId]);
      if (eventResult.rows.length > 0) {
        eventName = eventResult.rows[0].name.replace(/【|】/g, ''); // 移除【】符号
        eventReward = eventResult.rows[0].reward;
        
        // 解锁奖励卡牌
        unlockedRewardCards = await cardService.checkAndUnlockRewardCards(userId, eventName);
        logger.info({ userId, eventId, eventName, unlockedRewardCards }, 'Reward cards unlocked after event');
      }
    } catch (cardErr) {
      logger.error({ err: cardErr, userId, eventId }, 'Failed to unlock reward cards');
      // 不抛出错误，因为event已经完成
    }

    // 在地图上放置标志并高亮地块（使用 unlockedKey 作为 marker）
    let tileMarkerResult = null;
    if (selectedHex) {
      try {
        // 使用 unlockedKey（如"火"）作为marker类型和event名称
        const markerName = unlockedKey || eventReward || eventName || 'completed';
        
        tileMarkerResult = await tileMarkerService.markEventCompletion(
          userId,
          selectedHex.q,
          selectedHex.r,
          markerName,
          eventName || unlockedKey,
          isFullVictory,
          selectedRegionTiles
        );
        logger.info({ 
          userId, 
          eventId, 
          selectedHex, 
          markerName,
          eventName,
          unlockedKey,
          isFullVictory,
          selectedRegionTiles: selectedRegionTiles ? selectedRegionTiles.length : 0,
          tileMarkerResult 
        }, 'Tile markers placed for event completion');
      } catch (markerErr) {
        logger.error({ err: markerErr, userId, eventId, selectedHex }, 'Failed to place tile markers');
        // 不抛出错误，标志放置失败不影响事件完成
      }
    } else {
      logger.warn({ userId, eventId }, 'No selectedHex provided, skipping tile marker placement');
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

    // 解决 events 后，解锁用户已合成的卡牌（使其可用于抽牌）
    try {
      const unlockedUserCards = await cardService.unlockUserGeneratedCards(userId);
      logger.info({ userId, eventId, unlockedUserCards }, 'User generated cards unlocked after event');
    } catch (userCardErr) {
      logger.error({ err: userCardErr, userId, eventId }, 'Failed to unlock user generated cards');
      // 不抛出错误，因为event已经完成
    }

    return {
      success: true,
      newEra,
      unlockedKey,
      nextEventId,
      completedCount: completedEvents.length,
      tileMarkers: tileMarkerResult,
      unlockedRewardCards: unlockedRewardCards || [],
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

