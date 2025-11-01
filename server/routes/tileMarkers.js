import express from 'express';
import { authMiddleware } from '../utils/security.js';
import * as tileMarkerService from '../services/tileMarkerService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// 获取用户的所有地块标志
router.get('/markers', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const markers = await tileMarkerService.getUserMarkers(userId);
    res.json({ markers });
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Get markers error');
    res.status(500).json({ error: err.message });
  }
});

// 获取用户的所有高亮地块
router.get('/highlights', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const highlights = await tileMarkerService.getUserHighlightedTiles(userId);
    res.json({ highlights });
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Get highlights error');
    res.status(500).json({ error: err.message });
  }
});

// 清除所有标志和高亮（重置游戏用）
router.delete('/clear', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    await tileMarkerService.clearUserMarkers(userId);
    res.json({ success: true, message: '已清除所有地块标志' });
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Clear markers error');
    res.status(500).json({ error: err.message });
  }
});

export default router;

