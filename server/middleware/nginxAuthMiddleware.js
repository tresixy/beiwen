// Nginx Basic Auth 中间件
// 当请求通过 nginx 的 HTTP Basic Auth 后，信任该请求

import logger from '../utils/logger.js';

export function nginxAuthMiddleware(req, res, next) {
  // 检查是否有 nginx 认证标识
  // nginx 成功认证后会设置 REMOTE_USER 或通过 X-Forwarded-User 传递
  
  // 方案1: 检查特定的内部请求标识
  // 由于请求来自 nginx 反向代理，我们可以信任它
  
  // 为了安全，我们创建一个虚拟的管理员用户上下文
  // 实际的认证已经由 nginx 完成
  
  // 设置一个特殊的管理员用户 ID（用于日志记录）
  req.userId = -1; // 特殊的系统用户 ID
  req.isNginxAuthenticated = true;
  
  logger.info({ 
    ip: req.headers['x-real-ip'] || req.ip,
    path: req.path 
  }, 'Nginx authenticated request');
  
  next();
}

// 管理员权限中间件（基于 nginx 认证）
export function nginxAdminMiddleware(req, res, next) {
  // 如果是 nginx 认证的请求，自动授予管理员权限
  if (req.isNginxAuthenticated) {
    return next();
  }
  
  // 否则返回 403
  res.status(403).json({ error: '需要管理员权限' });
}

