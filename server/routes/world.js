import express from 'express';
import { authMiddleware } from '../utils/security.js';
import * as worldService from '../gameplay/worldService.js';

const router = express.Router();

// 获取世界状态
router.get('/state', authMiddleware, async (req, res) => {
  try {
    const state = await worldService.getWorldState(req.userId);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 初始化世界
router.post('/init', authMiddleware, async (req, res) => {
  try {
    const size = parseInt(req.body.size) || 10;
    await worldService.initWorld(req.userId, size);
    const state = await worldService.getWorldState(req.userId);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 放置实体
router.post('/place', authMiddleware, async (req, res) => {
  try {
    const { kind, cardId, x, y, attrs } = req.body;
    const entityId = await worldService.placeEntity(req.userId, kind, cardId, x, y, attrs);
    res.json({ entityId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 移除实体
router.delete('/entity/:id', authMiddleware, async (req, res) => {
  try {
    const entityId = parseInt(req.params.id);
    await worldService.removeEntity(req.userId, entityId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

