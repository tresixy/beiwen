import express from 'express';
import { authMiddleware, imageRateLimit } from '../utils/security.js';
import { validateRequest } from '../utils/validators.js';
import { imageGenerateSchema } from '../utils/validators.js';
import * as imageService from '../services/imageService.js';

const router = express.Router();

// 生成图片
router.post('/generate', authMiddleware, imageRateLimit, validateRequest(imageGenerateSchema), async (req, res) => {
  try {
    const { prompt, options } = req.validated;
    
    const image = await imageService.generateImage(prompt, null, options);
    
    res.json(image);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取图片
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const imageId = parseInt(req.params.id);
    const image = await imageService.getImage(imageId);
    
    res.json(image);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

export default router;

