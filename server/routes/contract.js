import express from 'express';
import { authMiddleware } from '../utils/security.js';
import { validateRequest } from '../utils/validators.js';
import { contractChooseSchema } from '../utils/validators.js';
import * as contractService from '../gameplay/contractService.js';

const router = express.Router();

// 选择契约
router.post('/choose', authMiddleware, validateRequest(contractChooseSchema), async (req, res) => {
  try {
    const { contractId, choice } = req.validated;
    const result = await contractService.chooseContract(req.userId, contractId, choice);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

