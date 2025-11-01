import express from 'express';
import { authMiddleware } from '../utils/security.js';
import * as blueprintService from '../gameplay/blueprintService.js';

const router = express.Router();

// 获取当前蓝图
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const blueprints = await blueprintService.getCurrentBlueprints(req.userId);
    res.json({ blueprints });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

