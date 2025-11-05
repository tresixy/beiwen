import express from 'express';
import { authMiddleware } from '../utils/security.js';
import * as deckService from '../gameplay/deckService.js';

const router = express.Router();

// 抽牌
router.get('/draw', authMiddleware, async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 3;
    const hand = await deckService.drawCards(req.userId, count);
    res.json({ hand });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取牌库状态
router.get('/state', authMiddleware, async (req, res) => {
  try {
    const state = await deckService.getDeckState(req.userId);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 解锁卡牌
router.post('/unlock', authMiddleware, async (req, res) => {
  try {
    const { cardId } = req.body;
    await deckService.unlockCard(req.userId, cardId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新卡牌类型（将inspiration卡标记为keycard）
router.post('/update-card-type', authMiddleware, async (req, res) => {
  try {
    const { cardName, cardType, rarity } = req.body;
    await deckService.updateCardType(req.userId, cardName, cardType, rarity);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

