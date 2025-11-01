import express from 'express';
import { authMiddleware } from '../utils/security.js';
import {
  getProfessionState,
  getProfessionChoices,
  regenerateProfessionChoices,
  selectProfession,
  clearActiveProfession,
  setCarryOver,
  getProfessionContext,
} from '../services/professionService.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const state = await getProfessionState(req.userId);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/context', authMiddleware, async (req, res) => {
  try {
    const data = await getProfessionContext(req.userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/regenerate', authMiddleware, async (req, res) => {
  try {
    const choices = await regenerateProfessionChoices(req.userId);
    res.json({ choices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/select', authMiddleware, async (req, res) => {
  try {
    const { index, profession } = req.body || {};
    let chosen = profession;

    if (chosen == null) {
      const choices = await getProfessionChoices(req.userId);
      if (typeof index !== 'number' || index < 0 || index >= choices.length) {
        return res.status(400).json({ error: 'Invalid profession index' });
      }
      chosen = choices[index];
    }

    const state = await selectProfession(req.userId, chosen);
    res.json(state);
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Select profession error');
    res.status(500).json({ error: err.message });
  }
});

router.post('/clear', authMiddleware, async (req, res) => {
  try {
    const state = await clearActiveProfession(req.userId, true);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/carry', authMiddleware, async (req, res) => {
  try {
    const { carry } = req.body || {};
    const state = await setCarryOver(req.userId, carry !== false);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;





