import OpenAI from 'openai';
import crypto from 'crypto';
import pool from '../db/connection.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { cacheGet, cacheSet } from '../db/redis.js';

let openai = null;

if (env.imageEnabled && env.imageApiKey) {
  openai = new OpenAI({
    apiKey: env.imageApiKey,
  });
}

// 生成图片
export async function generateImage(prompt, itemId = null, options = {}) {
  if (!env.imageEnabled || !openai) {
    throw new Error('Image generation not available');
  }
  
  try {
    // 生成提示词哈希用于缓存
    const promptHash = crypto.createHash('sha256').update(prompt).digest('hex');
    const cacheKey = `cache:image:${promptHash}`;
    
    // 检查缓存
    const cached = await cacheGet(cacheKey);
    if (cached) {
      logger.info({ promptHash }, 'Image cache hit');
      return cached;
    }
    
    // 调用 DALL-E
    const response = await openai.images.generate({
      model: env.imageModel || 'dall-e-3',
      prompt,
      size: options.size || '1024x1024',
      quality: options.quality || 'standard',
      n: 1,
    });
    
    const imageUrl = response.data[0].url;
    const seed = options.seed || null;
    
    // 保存到数据库
    const result = await pool.query(
      `INSERT INTO images (item_id, provider, prompt, image_url, seed)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [itemId, env.imageProvider, prompt, imageUrl, seed]
    );
    
    const imageData = {
      id: result.rows[0].id,
      url: imageUrl,
      prompt,
      provider: env.imageProvider,
      seed,
    };
    
    // 缓存结果（30天）
    const cacheSuccess = await cacheSet(cacheKey, imageData, 30 * 24 * 3600);
    if (!cacheSuccess) {
      logger.warn({ imageId: imageData.id, promptHash }, 'Failed to cache image result (Redis unavailable or error)');
    }
    
    logger.info({ imageId: imageData.id, promptHash, cached: cacheSuccess }, 'Image generated');
    
    return imageData;
  } catch (err) {
    logger.error({ err, prompt }, 'Image generation error');
    throw err;
  }
}

// 获取图片
export async function getImage(imageId) {
  try {
    const result = await pool.query(
      'SELECT id, item_id, provider, prompt, image_url, seed FROM images WHERE id = $1',
      [imageId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Image not found');
    }
    
    return result.rows[0];
  } catch (err) {
    logger.error({ err, imageId }, 'Get image error');
    throw err;
  }
}

// 生成物品提示词
export function generateItemPrompt(item) {
  const { name, tier, attrs } = item;
  
  let prompt = `A fantasy game item: ${name}. `;
  
  if (attrs.description) {
    prompt += attrs.description + '. ';
  }
  
  // 根据等级添加描述
  if (tier >= 7) {
    prompt += 'Legendary quality, glowing with magical energy. ';
  } else if (tier >= 5) {
    prompt += 'Epic quality, ornate and powerful. ';
  } else if (tier >= 3) {
    prompt += 'Rare quality, well-crafted. ';
  }
  
  // 添加元素描述
  if (attrs.element) {
    prompt += `Associated with ${attrs.element} element. `;
  }
  
  prompt += 'Game item icon, detailed, high quality, fantasy art style.';
  
  return prompt;
}

