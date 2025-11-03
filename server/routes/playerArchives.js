import express from 'express';
import { authMiddleware } from '../utils/security.js';
import { adminMiddleware } from '../utils/adminMiddleware.js';
import pool from '../db/connection.js';
import logger from '../utils/logger.js';

const router = express.Router();

// 获取所有玩家存档列表
router.get('/list', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    
    // 查询玩家总数
    let countQuery = 'SELECT COUNT(*) FROM users';
    let countParams = [];
    
    if (search) {
      countQuery += ' WHERE username ILIKE $1 OR email ILIKE $1';
      countParams = [`%${search}%`];
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalUsers = parseInt(countResult.rows[0].count);
    
    // 查询玩家列表及其存档信息
    let query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.created_at,
        u.synthesis_count,
        ugs.era,
        ugs.completed_events,
        ugs.active_event_id,
        (SELECT COUNT(*) FROM deck_cards WHERE user_id = u.id AND discovered = true) as total_cards,
        (SELECT COUNT(*) FROM tile_markers WHERE user_id = u.id) as total_markers,
        (SELECT COUNT(*) FROM highlighted_tiles WHERE user_id = u.id) as total_highlights,
        ugs.updated_at as last_played
      FROM users u
      LEFT JOIN user_game_state ugs ON u.id = ugs.user_id
    `;
    
    let queryParams = [];
    
    if (search) {
      query += ' WHERE u.username ILIKE $1 OR u.email ILIKE $1';
      queryParams = [`%${search}%`];
    }
    
    query += ` ORDER BY u.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    
    const result = await pool.query(query, queryParams);
    
    const players = result.rows.map(row => ({
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      createdAt: row.created_at,
      synthesisCount: parseInt(row.synthesis_count) || 0,
      era: row.era || '生存时代',
      completedEvents: row.completed_events || [],
      activeEventId: row.active_event_id,
      totalCards: parseInt(row.total_cards) || 0,
      totalMarkers: parseInt(row.total_markers) || 0,
      totalHighlights: parseInt(row.total_highlights) || 0,
      lastPlayed: row.last_played,
    }));
    
    res.json({
      players,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (err) {
    logger.error({ err }, 'Get player archives error');
    res.status(500).json({ error: err.message });
  }
});

// 获取单个玩家的详细存档信息
router.get('/:userId/detail', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // 基本信息
    const userResult = await pool.query(
      `SELECT id, username, email, role, synthesis_count, created_at FROM users WHERE id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // 游戏状态
    const stateResult = await pool.query(
      `SELECT era, completed_events, active_event_id, event_sequence, hand_json, updated_at 
       FROM user_game_state WHERE user_id = $1`,
      [userId]
    );
    const gameState = stateResult.rows[0] || {};
    
    // 卡牌收藏
    const cardsResult = await pool.query(
      `SELECT c.id, c.name, c.type, c.rarity, c.era, c.card_type, dc.discovered, dc.count
       FROM deck_cards dc
       JOIN cards c ON dc.card_id = c.id
       WHERE dc.user_id = $1 AND dc.discovered = true
       ORDER BY c.era, c.card_type, c.name`,
      [userId]
    );
    
    // 地块标志
    const markersResult = await pool.query(
      `SELECT q, r, marker_type, event_name, created_at
       FROM tile_markers WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    
    // 高亮地块
    const highlightsResult = await pool.query(
      `SELECT q, r, event_name, created_at
       FROM highlighted_tiles WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    
    // 事件日志（最近50条）
    const logsResult = await pool.query(
      `SELECT type, payload_json, turn, created_at
       FROM events_log WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        synthesisCount: user.synthesis_count || 0,
        createdAt: user.created_at,
      },
      gameState: {
        era: gameState.era || '生存时代',
        completedEvents: gameState.completed_events || [],
        activeEventId: gameState.active_event_id,
        eventSequence: gameState.event_sequence || [],
        hand: gameState.hand_json || [],
        lastPlayed: gameState.updated_at,
      },
      cards: cardsResult.rows,
      markers: markersResult.rows,
      highlights: highlightsResult.rows,
      recentLogs: logsResult.rows,
      statistics: {
        synthesisCount: user.synthesis_count || 0,
        totalCards: cardsResult.rows.length,
        totalMarkers: markersResult.rows.length,
        totalHighlights: highlightsResult.rows.length,
        cardsByType: {
          inspiration: cardsResult.rows.filter(c => c.card_type === 'inspiration').length,
          key: cardsResult.rows.filter(c => c.card_type === 'key').length,
          reward: cardsResult.rows.filter(c => c.card_type === 'reward').length,
        },
      },
    });
  } catch (err) {
    logger.error({ err, userId: req.params.userId }, 'Get player detail error');
    res.status(500).json({ error: err.message });
  }
});

// 删除玩家存档
router.delete('/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = parseInt(req.params.userId);
    const adminId = req.userId;
    
    // 防止删除管理员账号
    const userCheck = await client.query(
      'SELECT username, email, role FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const targetUser = userCheck.rows[0];
    
    if (targetUser.role === 'admin') {
      return res.status(403).json({ error: '不能删除管理员账号' });
    }
    
    await client.query('BEGIN');
    
    // 删除用户（级联删除会自动清理关联数据）
    // - deck_cards
    // - user_game_state
    // - tile_markers
    // - highlighted_tiles
    // - events_log
    // - resources
    // - inventories
    // - world_tiles
    // - entities
    // - projects
    
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    
    await client.query('COMMIT');
    
    logger.info({ 
      userId, 
      username: targetUser.username, 
      email: targetUser.email,
      deletedBy: adminId 
    }, 'Player archive deleted');
    
    res.json({ 
      success: true, 
      message: `已删除玩家 ${targetUser.username} 的所有存档数据` 
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, userId: req.params.userId }, 'Delete player archive error');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 批量删除玩家存档
router.post('/batch-delete', authMiddleware, adminMiddleware, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userIds } = req.body;
    const adminId = req.userId;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: '请提供要删除的用户ID列表' });
    }
    
    // 检查是否包含管理员
    const adminCheck = await client.query(
      `SELECT id, username FROM users WHERE id = ANY($1) AND role = 'admin'`,
      [userIds]
    );
    
    if (adminCheck.rows.length > 0) {
      return res.status(403).json({ 
        error: '不能删除管理员账号',
        adminUsers: adminCheck.rows.map(r => r.username),
      });
    }
    
    await client.query('BEGIN');
    
    // 删除用户
    const result = await client.query(
      `DELETE FROM users WHERE id = ANY($1) AND role != 'admin' RETURNING id, username, email`,
      [userIds]
    );
    
    await client.query('COMMIT');
    
    logger.info({ 
      userIds, 
      count: result.rows.length,
      deletedBy: adminId 
    }, 'Batch delete player archives');
    
    res.json({ 
      success: true, 
      message: `已删除 ${result.rows.length} 个玩家的存档数据`,
      deletedUsers: result.rows,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, userIds: req.body.userIds }, 'Batch delete error');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 重置玩家密码
router.post('/:userId/reset-password', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { newPassword } = req.body;
    const adminId = req.userId;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少为6位' });
    }
    
    // 检查用户是否存在
    const userCheck = await pool.query(
      'SELECT username, role FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const targetUser = userCheck.rows[0];
    
    // 哈希新密码
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // 更新密码
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, userId]
    );
    
    logger.info({ 
      userId, 
      username: targetUser.username,
      resetBy: adminId 
    }, 'Password reset by admin');
    
    res.json({ 
      success: true, 
      message: `已重置玩家 ${targetUser.username} 的密码` 
    });
  } catch (err) {
    logger.error({ err, userId: req.params.userId }, 'Reset password error');
    res.status(500).json({ error: err.message });
  }
});

// 重置玩家游戏进度（保留账号，清空游戏数据）
router.post('/:userId/reset', authMiddleware, adminMiddleware, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = parseInt(req.params.userId);
    const adminId = req.userId;
    
    await client.query('BEGIN');
    
    // 清空游戏状态
    await client.query('DELETE FROM user_game_state WHERE user_id = $1', [userId]);
    
    // 清空卡牌收藏（保留起始卡）
    await client.query(
      `DELETE FROM deck_cards WHERE user_id = $1 AND card_id NOT IN (
        SELECT id FROM cards WHERE is_starter = TRUE
      )`,
      [userId]
    );
    
    // 重置起始卡数量
    await client.query(
      `UPDATE deck_cards SET count = 2 
       WHERE user_id = $1 AND card_id IN (
         SELECT id FROM cards WHERE is_starter = TRUE
       )`,
      [userId]
    );
    
    // 清空地块标志
    await client.query('DELETE FROM tile_markers WHERE user_id = $1', [userId]);
    
    // 清空高亮地块
    await client.query('DELETE FROM highlighted_tiles WHERE user_id = $1', [userId]);
    
    // 清空事件日志
    await client.query('DELETE FROM events_log WHERE user_id = $1', [userId]);
    
    // 清空资源
    await client.query('DELETE FROM resources WHERE user_id = $1', [userId]);
    
    // 重置合成次数
    await client.query('UPDATE users SET synthesis_count = 0 WHERE id = $1', [userId]);
    
    await client.query('COMMIT');
    
    logger.info({ userId, resetBy: adminId }, 'Player progress reset');
    
    res.json({ 
      success: true, 
      message: '玩家游戏进度已重置，账号保留' 
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, userId: req.params.userId }, 'Reset player progress error');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;

