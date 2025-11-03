import express from 'express';
import { authMiddleware } from '../utils/security.js';
import { validateRequest } from '../utils/validators.js';
import { synthesizeSchema } from '../utils/validators.js';
import * as synthService from '../services/synthService.js';
import * as aiService from '../services/aiService.js';
import * as inventoryService from '../services/inventoryService.js';
import * as eventService from '../services/eventService.js';
import * as cardService from '../services/cardService.js';
import { isTechAllowed } from '../config/eraConfig.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const router = express.Router();

// 合成
router.post('/', authMiddleware, validateRequest(synthesizeSchema), async (req, res) => {
  try {
    const { inputs, name, mode, generateImage, preview } = req.validated;
    const userId = req.userId;
    
    // 验证输入类型
    if (!Array.isArray(inputs) || inputs.length < 2) {
      return res.status(400).json({ error: '至少需要2个输入项' });
    }
    
    // 判断输入类型：
    // 1. 对象数组（完整卡牌信息）-> 直接使用，避免重复查询
    // 2. 字符串数组（卡牌名称）-> 需要查询数据库（兼容旧格式）
    // 3. 数字数组（物品ID）-> 需要查询数据库（兼容旧格式）
    let inputItems;
    if (typeof inputs[0] === 'object' && inputs[0].name) {
      // 前端传递了完整的卡牌信息，直接使用
      inputItems = inputs.map(card => ({
        id: card.id,
        name: card.name,
        tier: card.tier || 1,
        attrs_json: card.attrs || {},
      }));
      logger.info({ userId, cardCount: inputs.length, cardNames: inputs.map(c => c.name) }, 'Using card data from client');
    } else {
      // 兼容旧格式：名称数组或ID数组
      const isNameArray = typeof inputs[0] === 'string' && !inputs[0].match(/^\d+$/);
      inputItems = await synthService.getInputItems(inputs, isNameArray ? userId : null);
    }
    
    // 获取时代信息
    const eventState = await eventService.getEventState(userId);
    const currentEra = eventState.era || '生存时代';

    // 生成配方哈希（需要统一格式：字符串数组）
    const inputNames = typeof inputs[0] === 'object' && inputs[0].name
      ? inputs.map(card => card.name)
      : inputs;
    const recipe_hash = synthService.generateRecipeHash(inputNames, name || '未命名');
    
    let output;
    let aiUsed = false;
    let aiIdeas = null;
    let aiPromptUsed = null;
    let aiModelUsed = null;
    
    // 尝试AI合成
    if ((mode === 'ai' || mode === 'auto') && env.aiEnabled) {
      logger.info({ userId, mode, aiEnabled: env.aiEnabled, hasApiKey: !!env.aiApiKey }, 'Attempting AI synthesis');
      try {
        const aiResult = await aiService.synthesizeByAI(inputItems, name, userId, currentEra);
        output = aiResult.output;
        aiIdeas = aiResult.ideas;
        aiPromptUsed = aiResult.prompt;
        aiModelUsed = aiResult.model;
        aiUsed = true;
        logger.info({ userId, mode, preview, era: currentEra, outputName: output?.name }, 'AI synthesis succeeded');
      } catch (err) {
        logger.error({ err: err.message, stack: err.stack, userId, mode }, 'AI synthesis failed');
        // AI合成失败，直接返回错误，不再降级到规则合成
        return res.status(500).json({ 
          error: '融合失败',
          message: err.message || 'AI合成服务暂时不可用，请稍后重试'
        });
      }
    } else {
      logger.info({ userId, mode, aiEnabled: env.aiEnabled, hasApiKey: !!env.aiApiKey }, 'AI synthesis skipped');
      // 如果AI未启用且不是rule模式，也返回错误
      if (mode === 'ai' || mode === 'auto') {
        return res.status(503).json({ 
          error: '融合失败',
          message: 'AI合成服务未启用'
        });
      }
    }
    
    // 如果没有输出，说明需要规则合成（但现在不再使用规则合成作为回退）
    if (!output) {
      return res.status(500).json({ 
        error: '融合失败',
        message: '无法生成合成结果'
      });
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

      return res.json(responsePayload);
    }
    
    // 保存配方和物品（事务处理）
    const item = await synthService.saveRecipe(
      userId,
      inputNames, // 使用统一的名称数组格式
      output,
      recipe_hash,
      aiPromptUsed,
      aiModelUsed || (aiUsed ? env.aiModel : null)
    );
    
    // 记录本次合成日志（按顺序写入）
    await synthService.logSynthesisEvent(userId, inputNames, item, recipe_hash, {
      era: currentEra,
      mode,
      aiUsed,
      aiModel: aiModelUsed || (aiUsed ? env.aiModel : null),
      prompt: aiPromptUsed,
    });
    
    // 判断是否需要消耗卡牌：如果inputs是字符串数组（卡牌名称），则需要消耗
    const needConsumeCards = typeof inputs[0] === 'string' && !inputs[0].match(/^\d+$/);
    logger.info({ userId, inputs: inputNames, itemId: item.id, cardsConsumed: needConsumeCards }, 'Synthesis completed');
    
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
        type: '普通卡',  // 合成生成的卡显示为"普通卡"
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
      cardsConsumed: needConsumeCards ? inputNames : null, // 告知客户端哪些卡牌被消耗
      needRefreshHand: needConsumeCards, // 提示客户端需要刷新手牌
    };

    if (aiIdeas) {
      responsePayload.ideas = aiIdeas;
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

