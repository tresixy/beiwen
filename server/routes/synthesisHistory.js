import express from 'express';
import pool from '../db/connection.js';
import { authMiddleware } from '../utils/security.js';
import logger from '../utils/logger.js';
import * as chronicleService from '../services/chronicleService.js';

const router = express.Router();

// 获取玩家编年史（史官记录）
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 50, format = 'entries' } = req.query;

    if (format === 'narrative') {
      // 返回完整叙事（按时间顺序）
      const narrative = await chronicleService.getFullNarrative(userId);
      return res.json({ narrative });
    }

    // 返回分页的编年史条目
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const historyResult = await pool.query(
      `SELECT 
        id,
        created_card_name,
        current_dilemma,
        log_entry,
        created_at
      FROM chronicle_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM chronicle_logs WHERE user_id = $1',
      [userId]
    );

    const total = parseInt(countResult.rows[0].total);

    res.json({
      chronicle: historyResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Get chronicle history error');
    res.status(500).json({ error: '获取编年史失败' });
  }
});

// 获取合成统计信息
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // 总合成次数
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM synthesis_logs WHERE user_id = $1',
      [userId]
    );

    // AI合成次数
    const aiResult = await pool.query(
      'SELECT COUNT(*) as ai_count FROM synthesis_logs WHERE user_id = $1 AND ai_used = true',
      [userId]
    );

    // 按时代统计
    const eraResult = await pool.query(
      `SELECT era, COUNT(*) as count 
       FROM synthesis_logs 
       WHERE user_id = $1 AND era IS NOT NULL
       GROUP BY era
       ORDER BY COUNT(*) DESC`,
      [userId]
    );

    // 最常用配方（前10）
    const recipesResult = await pool.query(
      `SELECT 
        recipe_hash,
        output_name,
        inputs_json,
        COUNT(*) as use_count,
        MAX(created_at) as last_used
       FROM synthesis_logs
       WHERE user_id = $1 AND recipe_hash IS NOT NULL
       GROUP BY recipe_hash, output_name, inputs_json
       ORDER BY use_count DESC
       LIMIT 10`,
      [userId]
    );

    res.json({
      total: parseInt(totalResult.rows[0].total),
      aiCount: parseInt(aiResult.rows[0].ai_count),
      byEra: eraResult.rows,
      topRecipes: recipesResult.rows,
    });
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Get synthesis stats error');
    res.status(500).json({ error: '获取统计信息失败' });
  }
});

export default router;

