import express from 'express';
import { authMiddleware, synthesizeRateLimit } from '../utils/security.js';
import { validateRequest } from '../utils/validators.js';
import { synthesizeSchema } from '../utils/validators.js';
import * as synthService from '../services/synthService.js';
import * as aiService from '../services/aiService.js';
import * as inventoryService from '../services/inventoryService.js';
import * as professionService from '../services/professionService.js';
import * as eventService from '../services/eventService.js';
import * as cardService from '../services/cardService.js';
import { isTechAllowed } from '../config/eraConfig.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const router = express.Router();

// 合成
router.post('/', authMiddleware, synthesizeRateLimit, validateRequest(synthesizeSchema), async (req, res) => {
  try {
    const { inputs, name, mode, generateImage, preview } = req.validated;
    const userId = req.userId;
    
    // 获取输入物品
    const inputItems = await synthService.getInputItems(inputs);
    
    // 获取职业信息和时代信息
    const [professionState, eventState] = await Promise.all([
      professionService.getProfessionState(userId),
      eventService.getEventState(userId),
    ]);
    const activeProfession = professionState.carryOver !== false ? professionState.active : null;
    const currentEra = eventState.era || '生存时代';

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
        const aiResult = await aiService.synthesizeByAI(inputItems, name, userId, activeProfession, currentEra);
        output = aiResult.output;
        aiIdeas = aiResult.ideas;
        aiPromptUsed = aiResult.prompt;
        aiModelUsed = aiResult.model;
        aiUsed = true;
        logger.info({ userId, mode: 'ai', preview, era: currentEra }, 'AI synthesis used');
      } catch (err) {
        logger.warn({ err }, 'AI synthesis failed, falling back to rule');
        if (mode === 'ai') {
          throw err; // 如果明确要求AI则失败
        }
      }
    }
    
    // 降级到规则合成
    if (!output) {
      output = await synthService.synthesizeByRule(inputItems, name, activeProfession, currentEra);
      logger.info({ userId, mode: 'rule', preview, era: currentEra }, 'Rule synthesis used');
    }
    
    // 检查时代限制
    const techCheck = isTechAllowed(output.name, output.tier, output.attrs, currentEra);
    if (!techCheck.allowed) {
      return res.status(403).json({ 
        error: '时代限制',
        message: techCheck.reason,
        currentEra,
        suggestedTier: output.tier,
      });
    }
    
    // 如果是预览模式，只返回结果不保存
    if (preview) {
      const responsePayload = {
        output,
        recipe_hash,
        aiUsed,
        preview: true,
        era: currentEra,
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

      return res.json(responsePayload);
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
    let inventoryFull = false;
    try {
      await inventoryService.addItem(userId, item.id);
    } catch (err) {
      if (err.message === 'Inventory full') {
        inventoryFull = true;
        logger.warn({ userId, itemId: item.id }, 'Inventory full, item not added');
      } else {
        logger.error({ err, userId, itemId: item.id }, 'Failed to add to inventory');
      }
    }
    
    // 将合成物品注册为卡牌，添加到用户卡牌池
    try {
      const rarityMap = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      const cardData = {
        name: item.name,
        type: 'inspiration',
        rarity: rarityMap[Math.min(item.tier - 1, 4)] || 'common',
        era: currentEra,
        card_type: 'inspiration',
        attrs_json: item.attrs || {},
        source_type: 'user_generated',
      };
      await cardService.createOrGetUserCard(userId, cardData);
      logger.info({ userId, itemName: item.name, itemTier: item.tier }, 'Item registered as card');
    } catch (cardErr) {
      logger.error({ err: cardErr, userId, itemId: item.id }, 'Failed to register item as card');
      // 不阻止合成流程，继续执行
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
      era: currentEra,
      inventoryFull,
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
    
    if (inventoryFull) {
      responsePayload.warning = '背包已满，物品已合成但未添加到背包，请先清理背包';
    }

    res.json(responsePayload);
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Synthesize error');
    res.status(500).json({ error: err.message });
  }
});

export default router;

