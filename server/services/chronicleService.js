import pool from '../db/connection.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';

const WITNESS_PROMPT_TEMPLATE = `# **角色**

你是一位严谨的文明"宇宙史官"。你的任务是客观、冷静但又带有一丝幽默感地记录一个新生文明的每一次"发明"及其带来的影响。你正在为一本未来的历史书撰写一个连续的章节。

# **游戏背景与任务**

- 玩家正在面对一个特定的【困境】。
- 玩家刚刚通过合成创造出了一个新的【概念卡牌】。
- 我会向你提供【编年史摘要】，里面是到目前为止发生的所有事件记录。
- 你的任务是：基于【编年史摘要】，撰写**紧接着下一句**的日志。这新的一句需要记录新"概念"的诞生所带来的影响。

# **核心要求**

1. **风格**: 像纪录片旁白，简洁、中立但有趣。
2. **内容**: 只描述已发生的后果，不提供未来的引导。
3. **词汇限制**: **绝对不能**使用玩家尚未解锁的概念。你只能使用我提供的【可用概念列表】中的词，或者非常基础的词汇（如：天空、地面、声音、冷、热）。
4. **承上启下 (Continuity)**: **这是最重要的规则。** 新的日志条目必须感觉像是【编年史摘要】的自然延续。如果合理，它可以引用或呼应摘要中的某个事件，以展现文明思想的演进或试错过程。

# **输出格式**

请严格按照以下JSON格式返回结果，不要有任何多余的解释：

{
  "log_entry": "生成的、能够接续上文的单句日志条目。"
}

# **正式开始**

当前困境: {{current_dilemma}}

新创卡牌: {{created_card_name}}

可用概念列表: {{available_concepts}}

编年史摘要: {{narrative_so_far}}

输出:`;

// 生成编年史条目
export async function generateChronicleEntry(userId, createdCardName, currentDilemma = null) {
  try {
    // 获取用户已解锁的所有卡牌（可用概念列表）
    const availableConceptsResult = await pool.query(
      `SELECT DISTINCT c.name 
       FROM deck_cards dc
       JOIN cards c ON dc.card_id = c.id
       WHERE dc.user_id = $1 AND dc.discovered = true
       ORDER BY c.name`,
      [userId]
    );
    const availableConcepts = availableConceptsResult.rows.map(r => r.name);

    // 获取之前的编年史记录（最近20条）
    const previousLogsResult = await pool.query(
      `SELECT log_entry 
       FROM chronicle_logs 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [userId]
    );

    let narrativeSoFar;
    if (previousLogsResult.rows.length === 0) {
      narrativeSoFar = "文明的序章开始了。";
    } else {
      // 倒序拼接成完整叙事（从最早到最新）
      const entries = previousLogsResult.rows.reverse().map(r => r.log_entry);
      narrativeSoFar = entries.join(' ');
    }

    // 构建提示词
    const prompt = WITNESS_PROMPT_TEMPLATE
      .replace('{{current_dilemma}}', currentDilemma || '未知')
      .replace('{{created_card_name}}', createdCardName)
      .replace('{{available_concepts}}', JSON.stringify(availableConcepts))
      .replace('{{narrative_so_far}}', narrativeSoFar);

    // 调用AI生成
    const logEntry = await callAIForChronicle(prompt);

    return {
      logEntry,
      currentDilemma,
      availableConcepts,
      narrativeSoFar,
    };
  } catch (err) {
    logger.error({ err, userId, createdCardName }, 'Generate chronicle entry failed');
    throw err;
  }
}

// 调用AI API生成编年史
async function callAIForChronicle(prompt) {
  if (!env.aiEnabled || !env.aiApiKey || !env.aiBaseUrl) {
    logger.warn({ aiEnabled: env.aiEnabled, hasApiKey: !!env.aiApiKey, hasBaseUrl: !!env.aiBaseUrl }, 'AI未启用或配置不完整，使用默认编年史条目');
    return '文明的进程又迈出了新的一步，历史的车轮滚滚向前。';
  }

  try {
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
        temperature: 0.8,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'AI API调用失败');
      throw new Error(`AI API错误: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('AI返回内容为空');
    }

    // 清理可能的markdown代码块标记
    let cleanContent = content.trim();
    
    // 移除 ```json ... ``` 或 ``` ... ``` 包裹
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    
    // 尝试解析JSON
    try {
      const parsed = JSON.parse(cleanContent.trim());
      return parsed.log_entry || cleanContent;
    } catch {
      // 如果不是JSON，尝试提取log_entry值
      // 支持包含转义引号的内容
      const jsonMatch = cleanContent.match(/\{\s*"log_entry"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/);
      if (jsonMatch && jsonMatch[1]) {
        // 解析转义字符
        return jsonMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
      // 最后兜底，直接返回内容
      return cleanContent;
    }
  } catch (err) {
    logger.error({ err }, 'Call AI for chronicle failed');
    throw err;
  }
}

// 保存编年史条目到数据库
export async function saveChronicleLog(userId, synthesisLogId, chronicleData) {
  try {
    const { logEntry, currentDilemma, availableConcepts, narrativeSoFar } = chronicleData;

    const result = await pool.query(
      `INSERT INTO chronicle_logs 
       (user_id, synthesis_log_id, current_dilemma, created_card_name, 
        available_concepts, narrative_so_far, log_entry, ai_model)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        synthesisLogId,
        currentDilemma,
        chronicleData.createdCardName || '未知',
        availableConcepts,
        narrativeSoFar,
        logEntry,
        env.aiModel,
      ]
    );

    logger.info({ userId, chronicleId: result.rows[0].id }, 'Chronicle log saved');
    return result.rows[0].id;
  } catch (err) {
    logger.error({ err, userId }, 'Save chronicle log failed');
    throw err;
  }
}

// 获取用户的编年史
export async function getUserChronicle(userId, limit = 50) {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        created_card_name,
        current_dilemma,
        log_entry,
        created_at
       FROM chronicle_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  } catch (err) {
    logger.error({ err, userId }, 'Get user chronicle failed');
    throw err;
  }
}

// 获取完整的编年史叙事（按时间顺序）
export async function getFullNarrative(userId) {
  try {
    const result = await pool.query(
      `SELECT log_entry, created_at
       FROM chronicle_logs
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [userId]
    );

    return result.rows;
  } catch (err) {
    logger.error({ err, userId }, 'Get full narrative failed');
    throw err;
  }
}

