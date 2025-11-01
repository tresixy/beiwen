// 卡牌数据库管理路由（管理员专用）
import express from 'express';
import { authMiddleware } from '../utils/security.js';
import { adminMiddleware } from '../utils/adminMiddleware.js';
import pool from '../db/connection.js';
import logger from '../utils/logger.js';

const router = express.Router();

// 获取所有卡牌（带分页）
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const eraFilter = req.query.era;
    const typeFilter = req.query.type;
    const sourceFilter = req.query.source; // 'base' 或 'user_generated'

    let query = `
      SELECT c.id, c.name, c.type, c.rarity, c.era, c.card_type, 
             c.unlock_condition, c.is_starter, c.is_decoy, c.attrs_json, 
             c.created_at, c.is_base_card, c.source_type, c.created_by_user_id,
             u.username as creator_name
      FROM cards c
      LEFT JOIN users u ON c.created_by_user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (sourceFilter === 'base') {
      query += ` AND c.is_base_card = TRUE`;
    } else if (sourceFilter === 'user_generated') {
      query += ` AND c.is_base_card = FALSE`;
    }

    if (eraFilter) {
      query += ` AND c.era = $${paramIndex}`;
      params.push(eraFilter);
      paramIndex++;
    }

    if (typeFilter) {
      query += ` AND c.card_type = $${paramIndex}`;
      params.push(typeFilter);
      paramIndex++;
    }

    query += ` ORDER BY c.is_base_card DESC, c.created_at DESC, c.era, c.card_type, c.name 
               LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // 构建计数查询
    let countQuery = 'SELECT COUNT(*) as count FROM cards c WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;

    if (sourceFilter === 'base') {
      countQuery += ' AND c.is_base_card = TRUE';
    } else if (sourceFilter === 'user_generated') {
      countQuery += ' AND c.is_base_card = FALSE';
    }

    if (eraFilter) {
      countQuery += ` AND c.era = $${countParamIndex}`;
      countParams.push(eraFilter);
      countParamIndex++;
    }

    if (typeFilter) {
      countQuery += ` AND c.card_type = $${countParamIndex}`;
      countParams.push(typeFilter);
      countParamIndex++;
    }
    
    const total = await pool.query(countQuery, countParams);

    // 获取统计数据
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_base_card = TRUE) as base_count,
        COUNT(*) FILTER (WHERE is_base_card = FALSE) as user_count
      FROM cards
    `);

    res.json({
      cards: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(total.rows[0].count),
        pages: Math.ceil(parseInt(total.rows[0].count) / limit),
      },
      stats: {
        baseCards: parseInt(stats.rows[0].base_count),
        userGeneratedCards: parseInt(stats.rows[0].user_count),
      },
    });
  } catch (err) {
    logger.error({ err }, 'GET /api/cards-database failed');
    res.status(500).json({ error: '获取卡牌列表失败' });
  }
});

// 获取时代列表
router.get('/eras', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT era FROM cards WHERE era IS NOT NULL ORDER BY era'
    );
    res.json({ eras: result.rows.map(r => r.era) });
  } catch (err) {
    logger.error({ err }, 'GET /api/cards-database/eras failed');
    res.status(500).json({ error: '获取时代列表失败' });
  }
});

// 创建新卡牌
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      name,
      type,
      rarity,
      era,
      card_type,
      unlock_condition,
      is_starter,
      is_decoy,
      attrs_json,
    } = req.body;

    // 验证必填字段
    if (!name || !type || !rarity) {
      return res.status(400).json({ error: '名称、类型和稀有度为必填项' });
    }

    // 检查卡牌名称是否已存在
    const existing = await pool.query('SELECT id FROM cards WHERE name = $1', [name]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: '卡牌名称已存在' });
    }

    const result = await pool.query(
      `INSERT INTO cards (
        name, type, rarity, era, card_type, 
        unlock_condition, is_starter, is_decoy, attrs_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        name,
        type,
        rarity,
        era || null,
        card_type || 'inspiration',
        unlock_condition || null,
        is_starter || false,
        is_decoy || false,
        attrs_json || {},
      ]
    );

    logger.info({ cardId: result.rows[0].id, name, adminId: req.userId }, 'Card created');
    res.json({ card: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'POST /api/cards-database failed');
    res.status(500).json({ error: '创建卡牌失败' });
  }
});

// 更新卡牌
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const cardId = parseInt(req.params.id);
    const {
      name,
      type,
      rarity,
      era,
      card_type,
      unlock_condition,
      is_starter,
      is_decoy,
      attrs_json,
    } = req.body;

    // 验证卡牌是否存在
    const existing = await pool.query('SELECT id FROM cards WHERE id = $1', [cardId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '卡牌不存在' });
    }

    // 检查名称冲突（排除当前卡牌）
    if (name) {
      const nameCheck = await pool.query(
        'SELECT id FROM cards WHERE name = $1 AND id != $2',
        [name, cardId]
      );
      if (nameCheck.rows.length > 0) {
        return res.status(409).json({ error: '卡牌名称已被使用' });
      }
    }

    const result = await pool.query(
      `UPDATE cards SET
        name = COALESCE($2, name),
        type = COALESCE($3, type),
        rarity = COALESCE($4, rarity),
        era = COALESCE($5, era),
        card_type = COALESCE($6, card_type),
        unlock_condition = $7,
        is_starter = COALESCE($8, is_starter),
        is_decoy = COALESCE($9, is_decoy),
        attrs_json = COALESCE($10, attrs_json)
      WHERE id = $1
      RETURNING *`,
      [
        cardId,
        name,
        type,
        rarity,
        era,
        card_type,
        unlock_condition,
        is_starter,
        is_decoy,
        attrs_json,
      ]
    );

    logger.info({ cardId, name, adminId: req.userId }, 'Card updated');
    res.json({ card: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'PUT /api/cards-database/:id failed');
    res.status(500).json({ error: '更新卡牌失败' });
  }
});

// 删除卡牌
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const cardId = parseInt(req.params.id);

    // 检查卡牌是否存在
    const existing = await pool.query('SELECT name FROM cards WHERE id = $1', [cardId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '卡牌不存在' });
    }

    // 删除卡牌
    await pool.query('DELETE FROM cards WHERE id = $1', [cardId]);

    logger.info({ cardId, name: existing.rows[0].name, adminId: req.userId }, 'Card deleted');
    res.json({ success: true, message: '卡牌已删除' });
  } catch (err) {
    logger.error({ err }, 'DELETE /api/cards-database/:id failed');
    
    // 检查是否是外键约束错误
    if (err.code === '23503') {
      return res.status(409).json({ error: '无法删除：该卡牌已被使用' });
    }
    
    res.status(500).json({ error: '删除卡牌失败' });
  }
});

// 批量导入卡牌
router.post('/batch', authMiddleware, adminMiddleware, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { cards } = req.body;
    
    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: '请提供卡牌数组' });
    }

    await client.query('BEGIN');
    
    const imported = [];
    const errors = [];

    for (const card of cards) {
      try {
        const result = await client.query(
          `INSERT INTO cards (
            name, type, rarity, era, card_type, 
            unlock_condition, is_starter, is_decoy, attrs_json
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (name) DO UPDATE SET
            type = EXCLUDED.type,
            rarity = EXCLUDED.rarity,
            era = EXCLUDED.era,
            card_type = EXCLUDED.card_type,
            unlock_condition = EXCLUDED.unlock_condition,
            is_starter = EXCLUDED.is_starter,
            is_decoy = EXCLUDED.is_decoy,
            attrs_json = EXCLUDED.attrs_json
          RETURNING id, name`,
          [
            card.name,
            card.type,
            card.rarity,
            card.era || null,
            card.card_type || 'inspiration',
            card.unlock_condition || null,
            card.is_starter || false,
            card.is_decoy || false,
            card.attrs_json || {},
          ]
        );
        imported.push(result.rows[0].name);
      } catch (err) {
        errors.push({ name: card.name, error: err.message });
      }
    }

    await client.query('COMMIT');
    
    logger.info({ count: imported.length, adminId: req.userId }, 'Batch import completed');
    res.json({ 
      success: true, 
      imported: imported.length,
      errors: errors.length,
      details: { imported, errors }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'POST /api/cards-database/batch failed');
    res.status(500).json({ error: '批量导入失败' });
  } finally {
    client.release();
  }
});

export default router;

