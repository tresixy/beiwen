import express from 'express';
import { validateRequest } from '../utils/validators.js';
import { registerSchema, loginSchema } from '../utils/validators.js';
import { loginRateLimit, authMiddleware } from '../utils/security.js';
import * as authService from '../services/authService.js';

const router = express.Router();

// 注册
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  try {
    const result = await authService.register(req.validated);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 登录
router.post('/login', loginRateLimit, validateRequest(loginSchema), async (req, res) => {
  try {
    const result = await authService.login(req.validated);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// 获取当前用户
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await authService.getMe(req.userId);
    res.json({ user });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

export default router;

