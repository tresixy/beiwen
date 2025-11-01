import OpenAI from 'openai';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { cacheGet, cacheSet } from '../db/redis.js';
import { generateRecipeHash } from './synthService.js';
import { TECH_TIERS } from '../config/eraConfig.js';

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
export async function synthesizeByAI(inputItems, name, userId, currentEra = '生存时代') {
  if (!env.aiEnabled || !openai) {
    throw new Error('AI service not available');
  }

  const recipeHash = generateRecipeHash(
    inputItems.map(i => i.id),
    `${name || '未命名'}#${currentEra}`
  );
  const cacheKey = `cache:recipe:${recipeHash}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      logger.info({ recipe_hash: recipeHash }, 'AI synthesis cache hit');
      return cached;
    }

    const inputNames = inputItems.map(item => item.name);
    const combinationSentence = formatCombinationInputs(inputNames);

    // 获取AI文明名称（优先使用第一张卡牌的ai_civilization_name，否则使用currentEra）
    const aiCivilizationName = inputItems[0]?.ai_civilization_name || currentEra || '石器时代';

    // 获取时代限制
    const techConfig = TECH_TIERS[currentEra] || TECH_TIERS['生存时代'];
    const techRestriction = [
      `当前时代：${currentEra}`,
      `科技限制：最高等级${techConfig.maxTier}，允许的概念包括：${techConfig.allowedConcepts.slice(0, 10).join('、')}等`,
      `禁止概念：${techConfig.forbiddenConcepts.slice(0, 8).join('、')}等`,
    ].join('；');

    const prompt = [
      `我在做一个游戏，我需要你用json格式回复我：${combinationSentence}在${aiCivilizationName}可以合成什么东西。`,
      '你需要想象所有可能合成的东西，可以是现实的、魔法的、科幻的、魔幻的等等所有能想象到的内容。',
      techRestriction,
      '请确保只返回一个JSON，格式如下：',
      '{',
      '  "combinations": [',
      '    {"name": "合成物名称", "prompt": "生图提示词"}',
      '  ]',
      '}',
      '要求：',
      '1. 至少给出3个不同的合成结果设想；',
      '2. name 字段填写合成物的名称（中文），prompt 字段填写简单的生图提示词（中文）；',
      '3. 合成结果必须符合当前时代的科技限制，不能包含禁止的概念；',
      '4. 每个合成物都要有独立的 {name:"", prompt:""} 对象；',
      '5. 只返回JSON，不要有其他文字。'
    ].join('\n');

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
    const outputName = deriveNameFromIdea(ideaName, name, inputNames);

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

    // 缓存AI合成结果（7天）
    const cacheSuccess = await cacheSet(cacheKey, payload, 7 * 24 * 3600);
    if (!cacheSuccess) {
      logger.warn({ userId, recipe_hash: recipeHash }, 'Failed to cache AI synthesis result (Redis unavailable or error)');
    }

    logger.info({ userId, recipe_hash: recipeHash, cached: cacheSuccess }, 'AI synthesis completed');

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

