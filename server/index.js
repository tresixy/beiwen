import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import env from './config/env.js';
import logger, { httpLogger } from './utils/logger.js';

// 导入路由
import authRoutes from './routes/auth.js';
import inventoryRoutes from './routes/inventory.js';
import synthesizeRoutes from './routes/synthesize.js';
import deckRoutes from './routes/deck.js';
import turnRoutes from './routes/turn.js';
import worldRoutes from './routes/world.js';
import contractRoutes from './routes/contract.js';
import blueprintRoutes from './routes/blueprint.js';
import imageRoutes from './routes/image.js';
import adminRoutes from './routes/admin.js';
import professionRoutes from './routes/profession.js';
import gameStateRoutes from './routes/gameState.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../client/dist');
const clientDistExists = fs.existsSync(clientDistPath);

if (clientDistExists) {
  logger.info({ clientDistPath }, 'Serving static assets from client/dist');
}

// 中间件
app.use(helmet({
  contentSecurityPolicy: false, // 开发时禁用CSP
  crossOriginOpenerPolicy: false, // HTTP环境下禁用COOP
  crossOriginResourcePolicy: false, // HTTP环境下禁用CORP
  originAgentCluster: false, // HTTP环境下禁用Origin-Agent-Cluster
}));
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(httpLogger);

// 静态文件
if (clientDistExists) {
  app.use(express.static(clientDistPath));
} else {
  logger.warn('client/dist 未构建，建议运行 npm run client:build');
}

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/synthesize', synthesizeRoutes);
app.use('/api/deck', deckRoutes);
app.use('/api/turn', turnRoutes);
app.use('/api/world', worldRoutes);
app.use('/api/contract', contractRoutes);
app.use('/api/blueprint', blueprintRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profession', professionRoutes);
app.use('/api/game', gameStateRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

if (clientDistExists) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    const indexPath = path.join(clientDistPath, 'index.html');
    res.sendFile(indexPath);
  });
}

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 错误处理
app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// 启动服务器
app.listen(env.port, () => {
  logger.info({ port: env.port, env: env.nodeEnv }, 'Server started');
});

