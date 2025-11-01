import express from 'express';
import { authMiddleware } from '../utils/security.js';
import { validateRequest } from '../utils/validators.js';
import { inventoryAddSchema, inventoryRemoveSchema } from '../utils/validators.js';
import * as inventoryService from '../services/inventoryService.js';

const router = express.Router();

// 获取背包
router.get('/', authMiddleware, async (req, res) => {
  try {
    const inventory = await inventoryService.getInventory(req.userId);
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 添加物品
router.post('/add', authMiddleware, validateRequest(inventoryAddSchema), async (req, res) => {
  try {
    const result = await inventoryService.addItem(
      req.userId,
      req.validated.itemId,
      req.validated.slot
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 移除物品
router.post('/remove', authMiddleware, validateRequest(inventoryRemoveSchema), async (req, res) => {
  try {
    const result = await inventoryService.removeItem(req.userId, req.validated.itemId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

