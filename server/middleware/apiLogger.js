import pool from '../db/connection.js';
import logger from '../utils/logger.js';

// API调用日志中间件
export function apiLoggerMiddleware(req, res, next) {
  const startTime = Date.now();
  const originalJson = res.json.bind(res);
  
  // 记录请求体（仅限POST/PUT）
  let requestBody = null;
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    try {
      requestBody = req.body ? JSON.parse(JSON.stringify(req.body)) : null;
      // 敏感信息脱敏
      if (requestBody && requestBody.password) {
        requestBody.password = '***';
      }
      if (requestBody && requestBody.token) {
        requestBody.token = '***';
      }
    } catch (err) {
      // 忽略解析错误
    }
  }
  
  // 拦截响应
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    // 异步记录日志，不阻塞响应
    logApiCall({
      endpoint: req.path,
      method: req.method,
      userId: req.userId || null,
      requestBody,
      responseBody: truncateResponse(data),
      statusCode: res.statusCode,
      durationMs: duration,
      ipAddress: req.headers['x-real-ip'] || req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(err => {
      logger.error({ err }, 'Failed to log API call');
    });
    
    return originalJson(data);
  };
  
  next();
}

// 记录API调用
async function logApiCall({
  endpoint,
  method,
  userId,
  requestBody,
  responseBody,
  statusCode,
  durationMs,
  ipAddress,
  userAgent,
}) {
  try {
    await pool.query(
      `INSERT INTO api_logs (
        endpoint, method, user_id, request_body, response_body,
        status_code, duration_ms, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        endpoint,
        method,
        userId,
        requestBody ? JSON.stringify(requestBody) : null,
        responseBody ? JSON.stringify(responseBody) : null,
        statusCode,
        durationMs,
        ipAddress,
        userAgent,
      ]
    );
  } catch (err) {
    // 日志记录失败不应该影响API响应
    logger.error({ err, endpoint }, 'Failed to insert API log');
  }
}

// 截断响应体（避免存储过大）
function truncateResponse(data) {
  if (!data) return null;
  
  const str = JSON.stringify(data);
  const maxLength = 10000; // 最大10KB
  
  if (str.length <= maxLength) {
    return data;
  }
  
  // 截断并添加标记
  return {
    _truncated: true,
    _originalLength: str.length,
    ...JSON.parse(str.substring(0, maxLength)),
  };
}


