import OpenAI from 'openai';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { cacheGet, cacheSet } from '../db/redis.js';
import { generateRecipeHash } from './synthService.js';

let openai = null;

if (env.aiEnabled && env.openaiApiKey) {
  const clientOptions = {
    apiKey: env.openaiApiKey,
  };

  if (env.openaiBaseUrl) {
    clientOptions.baseURL = env.openaiBaseUrl;
  }

  const defaultHeaders = {};
  if (env.openaiHttpReferer) {
    defaultHeaders['HTTP-Referer'] = env.openaiHttpReferer;
  }
  if (env.openaiXTitle) {
    defaultHeaders['X-Title'] = env.openaiXTitle;
  }

  if (Object.keys(defaultHeaders).length > 0) {
    clientOptions.defaultHeaders = defaultHeaders;
  }

  openai = new OpenAI(clientOptions);
}

// AI合成
export async function synthesizeByAI(inputItems, name, userId, profession = null) {
  if (!env.aiEnabled || !openai) {
    throw new Error('AI service not available');
  }

  const recipeHash = generateRecipeHash(
    inputItems.map(i => i.id),
    `${name || '未命名'}${profession?.name ? `#${profession.name}` : ''}`
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

    const professionLine = profession?.name
      ? `职业：${profession.name}（偏好：${Array.isArray(profession.focus) && profession.focus.length ? profession.focus.join('、') : '综合'}）`
      : '职业：无';

    const prompt = [
      `我在做一个游戏，我需要你用json格式回复我：${combinationSentence}可以合成什么东西。`,
      '你需要想象所有可能合成的东西，可以是现实的、魔法的、科幻的、魔幻的等等所有能想象到的内容。',
      professionLine,
      '请确保只返回一个JSON，格式如下：',
      '{',
      '  "combinations": [',
      '    {"results": "...", "prompt": "..."}',
      '  ]',
      '}',
      '要求：',
      '1. 至少给出3个不同的合成结果设想；',
      '2. results 使用中文详细描述每个合成物，prompt 填写用于生成图标的中文提示词；',
      '3. 不要输出JSON以外的任何多余文字。'
    ].join('\n');

    const response = await openai.chat.completions.create({
      model: env.openaiModel,
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
      ? parsed.combinations.filter(entry => entry && entry.results)
      : [];

    if (ideas.length === 0) {
      throw new Error('AI没有提供合成结果');
    }

    const tier = calculateTier(inputItems);
    const primaryIdea = ideas[0];
    const outputName = deriveNameFromIdea(primaryIdea.results, name, inputNames);

    const attrs = {
      description: primaryIdea.results,
      ideas,
      source: 'ai',
    };

    if (profession?.name) {
      attrs.professionSynergy = {
        profession: profession.name,
        focus: profession.focus || [],
        bonus: profession.bonus || '职业偏好影响了本次合成结果',
      };
    }

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
      model: env.openaiModel,
    };

    await cacheSet(cacheKey, payload, 7 * 24 * 3600);

    logger.info({ userId, recipe_hash: recipeHash }, 'AI synthesis completed');

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
      provider: 'openai',
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
      model: env.openaiModel,
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

