import express from 'express';
import { authMiddleware } from '../utils/security.js';
import * as eventService from '../services/eventService.js';
import logger from '../utils/logger.js';

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
    const { eventId, key } = req.body;

    if (!eventId || !key) {
      return res.status(400).json({ error: '缺少eventId或key参数' });
    }

    // 验证event
    const activeEvent = await eventService.getActiveEvent(userId);
    if (!activeEvent || activeEvent.id !== eventId) {
      return res.status(400).json({ error: '该event未激活或已完成' });
    }

    // 验证钥匙
    if (activeEvent.required_key !== key) {
      return res.status(400).json({ 
        error: '钥匙不匹配',
        required: activeEvent.required_key,
        provided: key,
      });
    }

    // 完成event
    const result = await eventService.completeEvent(userId, eventId, key);

    logger.info({ userId, eventId, key, result }, 'Event completed');

    res.json({
      success: true,
      message: `成功完成【${activeEvent.name}】`,
      reward: activeEvent.reward,
      newEra: result.newEra,
      nextEventId: result.nextEventId,
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
    const sequence = await eventService.generateEventSequence(userId);
    
    logger.info({ userId, sequence }, 'Event sequence regenerated');

    res.json({
      success: true,
      message: '已生成新的events序列',
      sequence,
    });
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Regenerate events error');
    res.status(500).json({ error: err.message });
  }
});

export default router;

