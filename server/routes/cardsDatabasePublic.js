// 卡牌数据库管理路由（通过 Nginx Basic Auth 保护）
// 这个版本不需要 JWT token，只依赖 nginx 的 HTTP Basic Auth

import express from 'express';
import { nginxAuthMiddleware, nginxAdminMiddleware } from '../middleware/nginxAuthMiddleware.js';
import pool from '../db/connection.js';
import logger from '../utils/logger.js';

const router = express.Router();

// 对所有路由应用 nginx 认证中间件
router.use(nginxAuthMiddleware);
router.use(nginxAdminMiddleware);

// 获取所有卡牌（带分页）
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const eraFilter = req.query.era;
    const typeFilter = req.query.type;
    const sourceFilter = req.query.source;

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
    logger.error({ err }, 'GET /cardsdatabase failed');
    res.status(500).json({ error: '获取卡牌列表失败' });
  }
});

// 获取时代列表
router.get('/eras', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT era FROM cards WHERE era IS NOT NULL ORDER BY era'
    );
    res.json({ eras: result.rows.map(r => r.era) });
  } catch (err) {
    logger.error({ err }, 'GET /cardsdatabase/eras failed');
    res.status(500).json({ error: '获取时代列表失败' });
  }
});

// 创建新卡牌
router.post('/', async (req, res) => {
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

    const normalizedName = (name ?? '').toString().trim();
    const normalizedType = (type ?? '').toString().trim();
    const normalizedRarity = normalizeRarity(rarity);

    if (!normalizedName || !normalizedType) {
      return res.status(400).json({ error: '名称和类型为必填项' });
    }

    const existing = await pool.query('SELECT id FROM cards WHERE name = $1', [normalizedName]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: '卡牌名称已存在' });
    }

    const result = await pool.query(
      `INSERT INTO cards (
        name, type, rarity, era, card_type, 
        unlock_condition, is_starter, is_decoy, attrs_json,
        is_base_card, source_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, 'admin_created')
      RETURNING *`,
      [
        normalizedName,
        normalizedType,
        normalizedRarity,
        era || null,
        card_type || 'inspiration',
        unlock_condition || null,
        is_starter || false,
        is_decoy || false,
        attrs_json || {},
      ]
    );

    logger.info({ cardId: result.rows[0].id, name }, 'Card created via nginx auth');
    res.json({ card: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'POST /cardsdatabase failed');
    res.status(500).json({ error: '创建卡牌失败' });
  }
});

// 更新卡牌
router.put('/:id', async (req, res) => {
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

    const existing = await pool.query('SELECT id FROM cards WHERE id = $1', [cardId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '卡牌不存在' });
    }

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

    logger.info({ cardId, name }, 'Card updated via nginx auth');
    res.json({ card: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'PUT /cardsdatabase/:id failed');
    res.status(500).json({ error: '更新卡牌失败' });
  }
});

// 删除卡牌
router.delete('/:id', async (req, res) => {
  try {
    const cardId = parseInt(req.params.id);

    const existing = await pool.query('SELECT name FROM cards WHERE id = $1', [cardId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '卡牌不存在' });
    }

    await pool.query('DELETE FROM cards WHERE id = $1', [cardId]);

    logger.info({ cardId, name: existing.rows[0].name }, 'Card deleted via nginx auth');
    res.json({ success: true, message: '卡牌已删除' });
  } catch (err) {
    logger.error({ err }, 'DELETE /cardsdatabase/:id failed');
    
    if (err.code === '23503') {
      return res.status(409).json({ error: '无法删除：该卡牌已被使用' });
    }
    
    res.status(500).json({ error: '删除卡牌失败' });
  }
});

router.post('/import', async (req, res) => {
  const { cards } = req.body || {};

  if (!Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ error: '请提供待导入的卡牌数据' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const imported = [];
    const errors = [];

    for (let index = 0; index < cards.length; index++) {
      const rawCard = cards[index];
      const rowNumber = rawCard?.sourceRow || index + 1;

      try {
        const normalized = normalizeImportCard(rawCard);
        const attrsJson = normalized.attrs_json;

        const result = await client.query(
          `INSERT INTO cards (
            name, type, rarity, era, card_type,
            unlock_condition, is_starter, is_decoy, attrs_json,
            is_base_card, source_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, 'admin_imported')
          ON CONFLICT (name) DO UPDATE SET
            type = EXCLUDED.type,
            rarity = EXCLUDED.rarity,
            era = EXCLUDED.era,
            card_type = EXCLUDED.card_type,
            unlock_condition = EXCLUDED.unlock_condition,
            is_starter = EXCLUDED.is_starter,
            is_decoy = EXCLUDED.is_decoy,
            attrs_json = EXCLUDED.attrs_json,
            is_base_card = TRUE,
            source_type = 'admin_imported'
          RETURNING id, name`,
          [
            normalized.name,
            normalized.type,
            normalized.rarity,
            normalized.era,
            normalized.card_type,
            normalized.unlock_condition,
            normalized.is_starter,
            normalized.is_decoy,
            attrsJson,
          ]
        );

        imported.push(result.rows[0].name);
      } catch (err) {
        errors.push({
          row: rowNumber,
          name: rawCard?.name || null,
          error: err.message,
        });
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      imported: imported.length,
      errors,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'POST /cards-database-public/import failed');
    res.status(500).json({ error: '批量导入失败' });
  } finally {
    client.release();
  }
});

function normalizeImportCard(card) {
  if (!card || typeof card !== 'object') {
    throw new Error('卡牌数据格式无效');
  }

  const name = (card.name ?? '').toString().trim();
  const type = (card.type ?? '').toString().trim();
  const rarity = normalizeRarity(card.rarity);
  const era = sanitizeNullable(card.era);
  const cardType = sanitizeNullable(card.card_type) || 'inspiration';
  const unlockCondition = sanitizeNullable(card.unlock_condition);
  const description = sanitizeNullable(card.description);
  const isStarter = toBoolean(card.is_starter);
  const isDecoy = toBoolean(card.is_decoy);

  if (!name || !type) {
    throw new Error('名称、类型为必填字段');
  }

  const attrsJson = {};
  if (description) {
    attrsJson.description = description;
  }

  return {
    name,
    type,
    rarity,
    era,
    card_type: cardType,
    unlock_condition: unlockCondition,
    is_starter: isStarter,
    is_decoy: isDecoy,
    attrs_json: attrsJson,
  };
}

function sanitizeNullable(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = value.toString().trim();
  return text === '' ? null : text;
}

function toBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      return false;
    }

    if (['false', '0', 'no', 'n', '否'].includes(normalized)) {
      return false;
    }

    return ['true', '1', 'yes', 'y', '是', '初始', 'starter', 't', 'on'].includes(normalized);
  }

  return false;
}

function normalizeRarity(value) {
  if (value === undefined || value === null) {
    return 'common';
  }

  const text = value.toString().trim();
  if (!text) {
    return 'common';
  }

  const normalized = text.toLowerCase();
  const allowed = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

  if (!allowed.includes(normalized)) {
    throw new Error(`稀有度取值无效：${text}`);
  }

  return normalized;
}

export default router;

