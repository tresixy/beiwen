import express from 'express';
import { authMiddleware } from '../utils/security.js';
import * as turnService from '../gameplay/turnService.js';
import * as resourceService from '../gameplay/resourceService.js';
import * as contractService from '../gameplay/contractService.js';

const router = express.Router();

// 结束回合
router.post('/end', authMiddleware, async (req, res) => {
  try {
    const result = await turnService.endTurn(req.userId);
    
    // 检查是否有契约可用
    const contract = await contractService.getAvailableContract(req.userId, result.turn);
    
    res.json({
      ...result,
      contract,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取回合历史
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = await turnService.getTurnHistory(req.userId, limit);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取资源
router.get('/resources', authMiddleware, async (req, res) => {
  try {
    const resources = await resourceService.getResources(req.userId);
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

