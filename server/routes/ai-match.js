import express from 'express';
import { authMiddleware } from '../utils/security.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';

const router = express.Router();

// AI语义匹配：判断合成的卡牌是否与所需钥匙语义相近
router.post('/match', authMiddleware, async (req, res) => {
  try {
    const { cardName, requiredKey } = req.body;

    if (!cardName || !requiredKey) {
      return res.status(400).json({ error: '缺少cardName或requiredKey参数' });
    }

    logger.info({ cardName, requiredKey }, 'AI语义匹配请求');

    // 检查AI是否启用
    if (!env.aiEnabled || !env.aiApiKey || !env.aiBaseUrl) {
      logger.warn('AI未启用，返回no');
      return res.json({ match: 'no' });
    }

    // 构建提示词
    const prompt = `# 任务
你是一个语义判断专家。请判断以下两个词汇是否在语义上相近或相关。

## 判断规则
- 如果两个词汇表达相同或相近的概念，返回 yes
- 如果两个词汇有明确的因果或从属关系，返回 yes
- 否则返回 no

## 示例
- "火" 和 "火把" → yes（火把包含火）
- "火" 和 "焰火" → yes（焰火是火的一种形式）
- "农" 和 "农具" → yes（农具是农业工具）
- "农" 和 "锄头" → yes（锄头是农业工具）
- "文字" 和 "碑文" → yes（碑文是文字的载体）
- "文字" 和 "书" → yes（书是文字的载体）
- "律法" 和 "法典" → yes（法典是律法的载体）
- "货币" 和 "金币" → yes（金币是货币的一种）
- "火" 和 "水" → no（完全不同的概念）
- "农" 和 "文字" → no（不相关的概念）

## 需要判断的词汇
词汇1（关卡所需）: ${requiredKey}
词汇2（玩家合成）: ${cardName}

## 输出格式
只返回 yes 或 no，不要有任何其他内容。`;

    // 调用AI API
    const apiUrl = `${env.aiBaseUrl}/chat/completions`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.aiApiKey}`,
        ...(env.aiHttpReferer && { 'HTTP-Referer': env.aiHttpReferer }),
        ...(env.aiXTitle && { 'X-Title': env.aiXTitle }),
      },
      body: JSON.stringify({
        model: env.aiModel,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'AI API调用失败');
      return res.json({ match: 'no' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim().toLowerCase();

    logger.info({ cardName, requiredKey, aiResponse: content }, 'AI语义匹配结果');

    // 判断AI返回结果
    const match = content === 'yes' ? 'yes' : 'no';
    res.json({ match });

  } catch (err) {
    logger.error({ err }, 'AI语义匹配失败');
    res.json({ match: 'no' });
  }
});

export default router;

