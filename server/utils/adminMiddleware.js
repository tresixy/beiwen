import pool from '../db/connection.js';
import logger from './logger.js';

// 管理员权限中间件
export async function adminMiddleware(req, res, next) {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // 查询用户角色
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const role = result.rows[0].role;
    
    if (role !== 'admin') {
      logger.warn({ userId, role }, 'Unauthorized admin access attempt');
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.isAdmin = true;
    next();
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Admin middleware error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

// 检查是否是管理员（不阻止请求，只是标记）
export async function checkAdmin(req, res, next) {
  try {
    const userId = req.userId;
    
    if (!userId) {
      req.isAdmin = false;
      return next();
    }
    
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );
    
    req.isAdmin = result.rows.length > 0 && result.rows[0].role === 'admin';
    next();
  } catch (err) {
    logger.error({ err }, 'Check admin error');
    req.isAdmin = false;
    next();
  }
}

