// 卡牌相关路由
import express from 'express';
import { authMiddleware } from '../utils/security.js';
import * as cardService from '../services/cardService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// 获取所有卡牌（用于图鉴）
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const cards = await cardService.getAllCards();
    res.json({ cards });
  } catch (err) {
    logger.error({ err }, 'GET /api/cards/all failed');
    res.status(500).json({ error: '获取卡牌列表失败' });
  }
});

// 获取指定时代的卡牌
router.get('/era/:eraName', authMiddleware, async (req, res) => {
  try {
    const { eraName } = req.params;
    const cards = await cardService.getCardsByEraFromDB(eraName);
    res.json({ era: eraName, cards });
  } catch (err) {
    logger.error({ err }, 'GET /api/cards/era/:eraName failed');
    res.status(500).json({ error: '获取时代卡牌失败' });
  }
});

// 获取用户已解锁的卡牌
router.get('/unlocked', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const cards = await cardService.getUserUnlockedCards(userId);
    res.json({ cards });
  } catch (err) {
    logger.error({ err }, 'GET /api/cards/unlocked failed');
    res.status(500).json({ error: '获取已解锁卡牌失败' });
  }
});

// 获取起始卡牌
router.get('/starter', authMiddleware, async (req, res) => {
  try {
    const cards = await cardService.getStarterCardsFromDB();
    res.json({ cards });
  } catch (err) {
    logger.error({ err }, 'GET /api/cards/starter failed');
    res.status(500).json({ error: '获取起始卡牌失败' });
  }
});

// 获取卡牌详情
router.get('/:cardName', authMiddleware, async (req, res) => {
  try {
    const { cardName } = req.params;
    const card = await cardService.getCardDetails(cardName);
    
    if (!card) {
      return res.status(404).json({ error: '卡牌不存在' });
    }
    
    res.json({ card });
  } catch (err) {
    logger.error({ err }, 'GET /api/cards/:cardName failed');
    res.status(500).json({ error: '获取卡牌详情失败' });
  }
});

export default router;

