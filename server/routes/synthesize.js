import express from 'express';
import { authMiddleware, synthesizeRateLimit } from '../utils/security.js';
import { validateRequest } from '../utils/validators.js';
import { synthesizeSchema } from '../utils/validators.js';
import * as synthService from '../services/synthService.js';
import * as aiService from '../services/aiService.js';
import * as inventoryService from '../services/inventoryService.js';
import * as professionService from '../services/professionService.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const router = express.Router();

// 合成
router.post('/', authMiddleware, synthesizeRateLimit, validateRequest(synthesizeSchema), async (req, res) => {
  try {
    const { inputs, name, mode, generateImage } = req.validated;
    const userId = req.userId;
    
    // 获取输入物品
    const inputItems = await synthService.getInputItems(inputs);
    
    // 获取职业信息
    const professionState = await professionService.getProfessionState(userId);
    const activeProfession = professionState.carryOver !== false ? professionState.active : null;

    // 生成配方哈希
    const hashName = activeProfession?.name ? `${name || '未命名'}#${activeProfession.name}` : name;
    const recipe_hash = synthService.generateRecipeHash(inputs, hashName);
    
    let output;
    let aiUsed = false;
    let aiIdeas = null;
    let aiPromptUsed = null;
    let aiModelUsed = null;
    
    // 尝试AI合成
    if ((mode === 'ai' || mode === 'auto') && env.aiEnabled) {
      try {
        const aiResult = await aiService.synthesizeByAI(inputItems, name, userId, activeProfession);
        output = aiResult.output;
        aiIdeas = aiResult.ideas;
        aiPromptUsed = aiResult.prompt;
        aiModelUsed = aiResult.model;
        aiUsed = true;
        logger.info({ userId, mode: 'ai' }, 'AI synthesis used');
      } catch (err) {
        logger.warn({ err }, 'AI synthesis failed, falling back to rule');
        if (mode === 'ai') {
          throw err; // 如果明确要求AI则失败
        }
      }
    }
    
    // 降级到规则合成
    if (!output) {
      output = await synthService.synthesizeByRule(inputItems, name, activeProfession);
      logger.info({ userId, mode: 'rule' }, 'Rule synthesis used');
    }
    
    // 保存配方和物品
    const item = await synthService.saveRecipe(
      userId,
      inputs,
      output,
      recipe_hash,
      aiPromptUsed,
      aiModelUsed || (aiUsed ? env.openaiModel : null)
    );
    
    // 添加到背包
    try {
      await inventoryService.addItem(userId, item.id);
    } catch (err) {
      logger.warn({ err, userId, itemId: item.id }, 'Failed to add to inventory (full?)');
    }
    
    // 生成图片（可选）
    let image = null;
    if (generateImage && env.imageEnabled) {
      try {
        image = await aiService.generateImage(`A fantasy game item: ${item.name}. ${item.attrs?.description || ''}`);
      } catch (err) {
        logger.warn({ err }, 'Image generation failed');
      }
    }
    
    const responsePayload = {
      item,
      recipe_hash,
      aiUsed,
      image,
    };

    if (aiIdeas) {
      responsePayload.ideas = aiIdeas;
    }

    if (activeProfession) {
      responsePayload.profession = {
        active: activeProfession,
        carryOver: professionState.carryOver !== false,
      };
    }

    res.json(responsePayload);
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Synthesize error');
    res.status(500).json({ error: err.message });
  }
});

export default router;

