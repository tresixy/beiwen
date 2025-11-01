import express from 'express';
import { authMiddleware } from '../utils/security.js';
import * as gameStateService from '../services/gameStateService.js';

const router = express.Router();

// 获取完整游戏状态
router.get('/state', authMiddleware, async (req, res) => {
  try {
    const state = await gameStateService.getGameState(req.userId);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 保存手牌
router.post('/hand', authMiddleware, async (req, res) => {
  try {
    const { hand } = req.body;
    if (!Array.isArray(hand)) {
      return res.status(400).json({ error: 'hand must be an array' });
    }
    
    await gameStateService.savePlayerHand(req.userId, hand);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 保存契约状态
router.post('/contract', authMiddleware, async (req, res) => {
  try {
    const { contract } = req.body;
    await gameStateService.saveContractState(req.userId, contract);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 清空契约
router.delete('/contract', authMiddleware, async (req, res) => {
  try {
    await gameStateService.clearContract(req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

