import express from 'express';
import { nginxAuthMiddleware, nginxAdminMiddleware } from '../middleware/nginxAuthMiddleware.js';
import pool from '../db/connection.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.use(nginxAuthMiddleware);
router.use(nginxAdminMiddleware);

// 获取API调用统计
router.get('/stats', async (req, res) => {
  try {
    const { endpoint, days = 7, limit = 100 } = req.query;
    
    let query = `
      SELECT 
        endpoint,
        method,
        COUNT(*) as call_count,
        AVG(duration_ms)::INTEGER as avg_duration_ms,
        MIN(duration_ms) as min_duration_ms,
        MAX(duration_ms) as max_duration_ms,
        COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) as success_count,
        COUNT(*) FILTER (WHERE status_code >= 400) as error_count,
        MAX(created_at) as last_called
      FROM api_logs
      WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
    `;
    
    const params = [];
    if (endpoint) {
      query += ` AND endpoint = $1`;
      params.push(endpoint);
    }
    
    query += `
      GROUP BY endpoint, method
      ORDER BY call_count DESC
      LIMIT $${params.length + 1}
    `;
    params.push(parseInt(limit));
    
    const result = await pool.query(query, params);
    
    res.json({
      stats: result.rows,
      period: `${days} days`,
    });
  } catch (err) {
    logger.error({ err }, 'GET /api-stats/stats failed');
    res.status(500).json({ error: '获取统计失败' });
  }
});

// 获取特定端点的详细调用记录
router.get('/logs', async (req, res) => {
  try {
    const { endpoint, method, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT 
        id,
        endpoint,
        method,
        user_id,
        request_body,
        response_body,
        status_code,
        duration_ms,
        ip_address,
        created_at
      FROM api_logs
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (endpoint) {
      query += ` AND endpoint = $${paramIndex}`;
      params.push(endpoint);
      paramIndex++;
    }
    
    if (method) {
      query += ` AND method = $${paramIndex}`;
      params.push(method);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);
    
    const result = await pool.query(query, params);
    
    // 获取总数
    let countQuery = 'SELECT COUNT(*) as count FROM api_logs WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;
    
    if (endpoint) {
      countQuery += ` AND endpoint = $${countParamIndex}`;
      countParams.push(endpoint);
      countParamIndex++;
    }
    
    if (method) {
      countQuery += ` AND method = $${countParamIndex}`;
      countParams.push(method);
      countParamIndex++;
    }
    
    const total = await pool.query(countQuery, countParams);
    
    res.json({
      logs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total.rows[0].count),
        pages: Math.ceil(parseInt(total.rows[0].count) / parseInt(limit)),
      },
    });
  } catch (err) {
    logger.error({ err }, 'GET /api-stats/logs failed');
    res.status(500).json({ error: '获取日志失败' });
  }
});

export default router;


