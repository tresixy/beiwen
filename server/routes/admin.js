import express from 'express';
import { authMiddleware } from '../utils/security.js';
import { adminMiddleware } from '../utils/adminMiddleware.js';
import pool from '../db/connection.js';
import logger from '../utils/logger.js';

const router = express.Router();

// 管理员仪表板
router.get('/dashboard', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // 统计数据
    const stats = {};
    
    // 用户总数
    const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
    stats.totalUsers = parseInt(usersCount.rows[0].count);
    
    // 物品总数
    const itemsCount = await pool.query('SELECT COUNT(*) as count FROM items');
    stats.totalItems = parseInt(itemsCount.rows[0].count);
    
    // 合成记录
    const recipesCount = await pool.query('SELECT COUNT(*) as count FROM ai_recipes');
    stats.totalRecipes = parseInt(recipesCount.rows[0].count);
    
    // 活跃用户（最近24小时）
    const activeUsers = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as count 
       FROM events_log 
       WHERE created_at > NOW() - INTERVAL '24 hours'`
    );
    stats.activeUsers24h = parseInt(activeUsers.rows[0].count);
    
    res.json({ stats });
  } catch (err) {
    logger.error({ err }, 'Dashboard error');
    res.status(500).json({ error: err.message });
  }
});

// 获取所有用户列表
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const result = await pool.query(
      `SELECT id, user_id, email, username, role, created_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    const total = await pool.query('SELECT COUNT(*) as count FROM users');
    
    res.json({
      users: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(total.rows[0].count),
        pages: Math.ceil(parseInt(total.rows[0].count) / limit),
      },
    });
  } catch (err) {
    logger.error({ err }, 'Get users error');
    res.status(500).json({ error: err.message });
  }
});

// 修改用户角色
router.put('/users/:userId/role', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      [role, userId]
    );
    
    logger.info({ userId, role, adminId: req.userId }, 'User role updated');
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Update role error');
    res.status(500).json({ error: err.message });
  }
});

// 赠送资源
router.post('/users/:userId/resources', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { food, production, research } = req.body;
    
    await pool.query(
      `UPDATE resources 
       SET food = food + $2, 
           production = production + $3, 
           research = research + $4,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId, food || 0, production || 0, research || 0]
    );
    
    logger.info({ userId, food, production, research, adminId: req.userId }, 'Resources granted');
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Grant resources error');
    res.status(500).json({ error: err.message });
  }
});

// 查看所有物品
router.get('/items', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    const result = await pool.query(
      `SELECT i.*, u.username as creator 
       FROM items i 
       LEFT JOIN users u ON i.created_by = u.id 
       ORDER BY i.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    res.json({ items: result.rows });
  } catch (err) {
    logger.error({ err }, 'Get items error');
    res.status(500).json({ error: err.message });
  }
});

// 清理测试数据
router.delete('/cleanup/test', authMiddleware, adminMiddleware, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 删除测试用户（保留管理员）
    await client.query(
      `DELETE FROM users WHERE role != 'admin' AND email LIKE '%test%'`
    );
    
    await client.query('COMMIT');
    
    logger.info({ adminId: req.userId }, 'Test data cleaned');
    res.json({ success: true, message: 'Test data cleaned' });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Cleanup error');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;

