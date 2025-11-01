import jwt from 'jsonwebtoken';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import env from '../config/env.js';

// JWT工具
export function generateToken(userId) {
  return jwt.sign({ userId }, env.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch (err) {
    return null;
  }
}

// 认证中间件
export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.userId = payload.userId;
  next();
}

// 限流器
const loginLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

const synthesizeLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
});

const imageLimiter = new RateLimiterMemory({
  points: 2,
  duration: 60,
});

export function loginRateLimit(req, res, next) {
  const ip = req.ip;
  loginLimiter.consume(ip)
    .then(() => next())
    .catch(() => res.status(429).json({ error: 'Too many login attempts' }));
}

export function synthesizeRateLimit(req, res, next) {
  const userId = req.userId;
  synthesizeLimiter.consume(userId)
    .then(() => next())
    .catch(() => res.status(429).json({ error: 'Too many synthesis requests' }));
}

export function imageRateLimit(req, res, next) {
  const userId = req.userId;
  imageLimiter.consume(userId)
    .then(() => next())
    .catch(() => res.status(429).json({ error: 'Too many image requests' }));
}

