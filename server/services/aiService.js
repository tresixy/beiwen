import OpenAI from 'openai';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { cacheGet, cacheSet } from '../db/redis.js';
import { generateRecipeHash } from './synthService.js';
import { TECH_TIERS, ERAS } from '../config/eraConfig.js';

let openai = null;

if (env.aiEnabled && env.aiApiKey) {
  const clientOptions = {
    apiKey: env.aiApiKey,
  };

  if (env.aiBaseUrl) {
    clientOptions.baseURL = env.aiBaseUrl;
  }

  const defaultHeaders = {};
  if (env.aiHttpReferer) {
    defaultHeaders['HTTP-Referer'] = env.aiHttpReferer;
  }
  if (env.aiXTitle) {
    defaultHeaders['X-Title'] = env.aiXTitle;
  }

  if (Object.keys(defaultHeaders).length > 0) {
    clientOptions.defaultHeaders = defaultHeaders;
  }

  openai = new OpenAI(clientOptions);
}

// AI合成
export async function synthesizeByAI(inputItems, name, userId, currentEra = '生存时代', lastFailReason = null) {
  if (!env.aiEnabled || !openai) {
    throw new Error('AI service not available');
  }

  // 使用名称而非ID生成缓存key，避免不同用户相同卡牌组合的缓存miss
  // 如果有失败原因，不使用缓存，强制重新生成
  const inputNames = inputItems.map(item => item.name);
  const recipeHash = generateRecipeHash(
    inputNames,
    `${name || '未命名'}#${currentEra}`
  );
  const cacheKey = `cache:recipe:${recipeHash}`;

  try {
    // 如果有失败原因，跳过缓存
    if (!lastFailReason) {
      const cached = await cacheGet(cacheKey);
      if (cached) {
        logger.info({ recipe_hash: recipeHash }, 'AI synthesis cache hit');
        return cached;
      }
    } else {
      logger.info({ recipe_hash: recipeHash, lastFailReason }, 'Skipping cache due to retry');
    }
    
    const combinationSentence = formatCombinationInputs(inputNames);

    // 获取AI文明名称（优先使用第一张卡牌的ai_civilization_name，否则使用currentEra）
    const aiCivilizationName = inputItems[0]?.ai_civilization_name || currentEra || '石器时代';

    // 获取时代配置
    const techConfig = TECH_TIERS[currentEra] || TECH_TIERS['生存时代'];
    
    // 获取时代定义
    const eraInfo = ERAS.find(e => e.name === currentEra) || ERAS[0];
    const eraDefinition = eraInfo.description || '人类文明的萌芽期';

    const promptLines = [
      '# 核心规则：时代限制',
      '',
      '你必须严格遵循以下时代背景来生成所有结果。你的所有想象都必须牢牢扎根于这个时代背景。合成物的名称、概念和生图提示词必须是这个时代的人能够理解或想象的。',
      '',
      `- **当前时代**：${aiCivilizationName}`,
      `- **时代定义**：${eraDefinition}`,
      `- **合成原料**：${combinationSentence}`,
      '',
      '# 创作要求',
      '',
      `1. **紧扣时代**：合成结果必须完全符合【时代定义】。`,
      `   - 允许的概念：${techConfig.allowedConcepts.slice(0, 8).join('、')}等`,
      `   - **严格禁止**：${techConfig.forbiddenConcepts.join('、')}`,
      `   - 在"${currentEra}"，绝对不能出现任何禁止概念相关的物品`,
      '',
      '2. **适度幻想**：在遵循时代背景的前提下，发挥你的想象力。合成物可以是符合逻辑的工具，也可以是那个时代的人因认知局限而产生的"神秘"或"奇迹"般的物品。',
      '',
      '3. **多样性**：至少提供3个不同的合成结果设想。',
      '',
      '4. **生图质量**：`prompt` 字段需要是一个简洁但画面感强的中文短语，用于AI绘画。',
    ];
    
    // 如果有上次失败的原因，添加警告
    if (lastFailReason) {
      promptLines.push('');
      promptLines.push('# 重要警告');
      promptLines.push('');
      promptLines.push(`上次生成的结果不符合要求：${lastFailReason}`);
      promptLines.push(`请务必避免生成包含【${techConfig.forbiddenConcepts.join('、')}】等概念的物品！`);
    }
    
    promptLines.push('');
    promptLines.push('# 输出格式');
    promptLines.push('');
    promptLines.push('请严格按照以下JSON格式返回结果，不要包含任何JSON格式之外的解释、注释或文字。');
    promptLines.push('');
    promptLines.push('{');
    promptLines.push('  "combinations": [');
    promptLines.push('    {"name": "合成物名称1", "prompt": "对应的中文生图提示词1"},');
    promptLines.push('    {"name": "合成物名称2", "prompt": "对应的中文生图提示词2"},');
    promptLines.push('    {"name": "合成物名称3", "prompt": "对应的中文生图提示词3"}');
    promptLines.push('  ]');
    promptLines.push('}');
    
    const prompt = promptLines.join('\n');

    const response = await openai.chat.completions.create({
      model: env.aiModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      max_tokens: 800,
    });

    const rawContent = response.choices?.[0]?.message?.content?.trim();
    if (!rawContent) {
      throw new Error('AI没有返回内容');
    }

    const parsed = parseAiCombination(rawContent);
    const ideas = Array.isArray(parsed.combinations)
      ? parsed.combinations.filter(entry => entry && (entry.name || entry.results))
      : [];

    if (ideas.length === 0) {
      throw new Error('AI没有提供合成结果');
    }

    const tier = calculateTier(inputItems);
    const primaryIdea = ideas[0];
    // 支持新格式(name)和旧格式(results)
    const ideaName = primaryIdea.name || primaryIdea.results;
    // 优先使用AI生成的名字，如果AI名字不可用才使用用户输入的名字
    const outputName = deriveNameFromIdea(ideaName, null, inputNames) || name || '未知造物';

    const attrs = {
      description: ideaName,
      ideas,
      source: 'ai',
    };

    const iconPrompts = ideas.map(entry => entry.prompt).filter(Boolean);
    if (iconPrompts.length > 0) {
      attrs.iconPrompts = iconPrompts;
    }

    const output = {
      name: outputName,
      tier,
      attrs,
    };

    const payload = {
      output,
      ideas,
      prompt,
      model: env.aiModel,
    };

    // 只在没有失败原因的情况下缓存（首次成功）
    if (!lastFailReason) {
      const cacheSuccess = await cacheSet(cacheKey, payload, 7 * 24 * 3600);
      if (!cacheSuccess) {
        logger.warn({ userId, recipe_hash: recipeHash }, 'Failed to cache AI synthesis result (Redis unavailable or error)');
      }
      logger.info({ userId, recipe_hash: recipeHash, cached: cacheSuccess }, 'AI synthesis completed');
    } else {
      logger.info({ userId, recipe_hash: recipeHash, wasRetry: true }, 'AI synthesis completed (retry, not cached)');
    }

    return payload;
  } catch (err) {
    logger.error({ err, inputItems, name }, 'AI synthesis error');
    throw err;
  }
}

// 生成图片
export async function generateImage(prompt, options = {}) {
  if (!env.imageEnabled || !openai) {
    throw new Error('Image generation not available');
  }
  
  try {
    const response = await openai.images.generate({
      model: env.imageModel,
      prompt,
      size: options.size || '1024x1024',
      quality: options.quality || 'standard',
      n: 1,
    });
    
    const imageUrl = response.data[0].url;
    
    logger.info({ prompt, imageUrl }, 'Image generated');
    
    return {
      url: imageUrl,
      prompt,
      provider: 'openrouter',
    };
  } catch (err) {
    logger.error({ err, prompt }, 'Image generation error');
    throw err;
  }
}

function formatCombinationInputs(inputNames) {
  if (inputNames.length === 0) {
    return '未知材料';
  }

  if (inputNames.length === 1) {
    return `「${inputNames[0]}」`;
  }

  const wrapped = inputNames.map(name => `「${name}」`);
  const last = wrapped.pop();
  return `${wrapped.join('、')}和${last}`;
}

function sanitizeJsonContent(content) {
  let text = content.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z]*\s*/i, '');
    text = text.replace(/```$/i, '');
  }
  return text.trim();
}

function parseAiCombination(content) {
  const cleaned = sanitizeJsonContent(content);
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    logger.error({ content }, 'Failed to parse AI JSON');
    throw new Error('AI返回格式不是JSON');
  }
}

function calculateTier(inputItems) {
  if (!inputItems.length) {
    return 1;
  }
  const total = inputItems.reduce((sum, item) => sum + (item.tier || 1), 0);
  const avg = Math.ceil(total / inputItems.length);
  return Math.min(avg + 1, 10);
}

function deriveNameFromIdea(ideaText, fallbackName, inputNames) {
  if (fallbackName && fallbackName.trim()) {
    return fallbackName.trim();
  }

  if (ideaText) {
    const segments = ideaText.split(/[:：]/);
    let candidate = segments[0] || ideaText;
    candidate = candidate.split(/[,，、。\s]/)[0] || candidate;
    candidate = candidate.trim();
    if (candidate.length >= 2 && candidate.length <= 16) {
      return candidate;
    }
  }

  if (inputNames.length >= 2) {
    return `${inputNames[0]}·${inputNames[inputNames.length - 1]}之造物`;
  }
  if (inputNames.length === 1) {
    return `${inputNames[0]}的衍生体`;
  }
  return '未知造物';
}

export async function generateProfessionOptions(context) {
  if (!env.aiEnabled || !openai) {
    return createFallbackProfessions(context);
  }

  const itemList = (context?.itemNames || []).slice(0, 12);
  const entityList = (context?.entityNames || []).slice(0, 8);
  const turnInfo = context?.turn ? `当前回合：${context.turn}` : '当前回合未知';

  const prompt = [
    '请作为一位策略类游戏的职业设计导师，根据玩家在首轮结束时保留的元素，设计5条职业转职方向。',
    turnInfo,
    `保留的物品：${itemList.length ? itemList.join('、') : '暂无'}`,
    `场上单位/建筑：${entityList.length ? entityList.join('、') : '暂无'}`,
    '请返回 JSON：',
    '{',
    '  "professions": [',
    '    {',
    '      "name": "职业名称",',
    '      "focus": ["关键词1", "关键词2"],',
    '      "description": "职业特色与合成倾向（中文）",',
    '      "bonus": "对合成的增益描述（中文）"',
    '    }',
    '  ]',
    '}',
    '要求：',
    '1. name 简洁、有辨识度；',
    '2. focus 列出1-3个中文关键词（如 魔法、科技、炼金、自然 等）；',
    '3. description 和 bonus 必须使用中文，且与道具、场上元素呼应；',
    '4. 返回严格 JSON，不要额外文本；',
    '5. 至少给出5个职业供玩家选择。',
  ].join('\n');

  try {
    const response = await openai.chat.completions.create({
      model: env.aiModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.85,
      max_tokens: 800,
    });

    const rawContent = response.choices?.[0]?.message?.content?.trim();
    if (!rawContent) {
      throw new Error('AI没有返回内容');
    }

    const parsed = parseProfessionResponse(rawContent);
    if (!parsed.professions || parsed.professions.length === 0) {
      throw new Error('AI未提供职业选项');
    }

    return parsed.professions.slice(0, 5);
  } catch (err) {
    logger.error({ err, context }, 'generateProfessionOptions error');
    return createFallbackProfessions(context);
  }
}

function parseProfessionResponse(content) {
  const cleaned = sanitizeJsonContent(content);
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    logger.error({ content }, 'Failed to parse profession JSON');
    throw new Error('职业生成返回格式错误');
  }
}

function createFallbackProfessions(context) {
  const base = ['魔法师', '炼金术士', '工匠', '自然祭司', '星象学者', '符文诗人', '时空旅者'];
  const shuffled = [...base].sort(() => Math.random() - 0.5).slice(0, 5);

  return shuffled.map((name) => ({
    name,
    focus: guessFocusByName(name),
    description: `${name}擅长围绕对应元素进行合成，能稳定提升该方向的成功率。`,
    bonus: `${name}在涉及${guessFocusByName(name).join('、')}的合成时有更高的收益。`,
  }));
}

function guessFocusByName(name) {
  if (name.includes('魔') || name.includes('法')) {
    return ['魔法'];
  }
  if (name.includes('炼金')) {
    return ['炼金', '化学'];
  }
  if (name.includes('工匠')) {
    return ['工艺', '机械'];
  }
  if (name.includes('自然') || name.includes('祭司')) {
    return ['自然'];
  }
  if (name.includes('星') || name.includes('象')) {
    return ['星象', '神秘'];
  }
  if (name.includes('符文')) {
    return ['符文', '魔法'];
  }
  if (name.includes('时空')) {
    return ['时空', '奥秘'];
  }
  return ['多面'];
}

