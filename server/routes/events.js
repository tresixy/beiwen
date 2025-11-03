import express from 'express';
import { authMiddleware } from '../utils/security.js';
import * as eventService from '../services/eventService.js';
import logger from '../utils/logger.js';
import pool from '../db/connection.js';

const router = express.Router();

// 获取玩家events进度概览
router.get('/progress', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const progress = await eventService.getProgressOverview(userId);
    res.json(progress);
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Get events progress error');
    res.status(500).json({ error: err.message });
  }
});

// 获取当前激活的event
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const event = await eventService.getActiveEvent(userId);
    if (!event) {
      return res.json({ event: null });
    }
    res.json({ event });
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Get active event error');
    res.status(500).json({ error: err.message });
  }
});

// 完成event（提交钥匙）
router.post('/complete', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { eventId, key, selectedHex, handCards = [], isFullVictory = true } = req.body;

    if (!eventId || !key) {
      return res.status(400).json({ error: '缺少eventId或key参数' });
    }

    // 验证event
    const activeEvent = await eventService.getActiveEvent(userId);
    if (!activeEvent || activeEvent.id !== eventId) {
      return res.status(400).json({ error: '该event未激活或已完成' });
    }

    // 验证钥匙（特殊处理第二次分野时代的多选钥匙）
    const requiredKeys = activeEvent.required_key.split('或').map(k => k.trim());
    if (!requiredKeys.includes(key)) {
      return res.status(400).json({ 
        error: '钥匙不匹配',
        required: activeEvent.required_key,
        provided: key,
      });
    }

    // 完成event（传入选中的地块坐标和是否完全胜利）
    const result = await eventService.completeEvent(userId, eventId, key, selectedHex, isFullVictory);

    // 将手牌中的卡牌加入背包（包括key卡和合成的卡牌）
    let cardsAddedToInventory = [];
    if (handCards && handCards.length > 0) {
      try {
        const inventoryService = await import('../services/inventoryService.js');
        const inventoryResult = await inventoryService.addCardsToInventory(userId, handCards);
        cardsAddedToInventory = inventoryResult.addedCards;
        
        if (inventoryResult.failedCards.length > 0) {
          logger.warn({ 
            userId, 
            eventId, 
            failedCards: inventoryResult.failedCards 
          }, 'Some cards failed to add to inventory');
        }
      } catch (invErr) {
        logger.error({ err: invErr, userId, eventId, handCards }, 'Failed to add cards to inventory');
        // 不阻止事件完成，继续执行
      }
    }

    logger.info({ 
      userId, 
      eventId, 
      key, 
      selectedHex, 
      isFullVictory,
      result, 
      cardsAddedToInventory,
      tileMarkersResult: result.tileMarkers
    }, 'Event completed');

    res.json({
      success: true,
      message: `成功完成【${activeEvent.name}】`,
      reward: activeEvent.reward,
      newEra: result.newEra,
      nextEventId: result.nextEventId,
      tileMarkers: result.tileMarkers,
      cardsAdded: cardsAddedToInventory,
      progress: {
        completed: result.completedCount,
        total: activeEvent.totalEvents,
      },
    });
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Complete event error');
    res.status(500).json({ error: err.message });
  }
});

// 重新生成events序列（用于新游戏）
router.post('/regenerate', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    // 重新生成序列
    const sequence = await eventService.generateEventSequence(userId);
    
    // 重置游戏进度：清空已完成事件、重置时代、设置第一个事件为激活状态
    const firstEventId = sequence.length > 0 ? sequence[0] : null;
    await pool.query(
      `UPDATE user_game_state 
       SET era = '生存时代', 
           unlocked_keys = '[]', 
           completed_events = '[]', 
           active_event_id = $2, 
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId, firstEventId]
    );
    
    logger.info({ userId, sequence, firstEventId }, 'Event sequence regenerated and progress reset');

    res.json({
      success: true,
      message: '已生成新的events序列并重置进度',
      sequence,
      firstEventId,
    });
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Regenerate events error');
    res.status(500).json({ error: err.message });
  }
});

export default router;

