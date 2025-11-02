import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import env from './config/env.js';
import logger, { httpLogger } from './utils/logger.js';
import { apiLoggerMiddleware } from './middleware/apiLogger.js';

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
import eventsRoutes from './routes/events.js';
import cardsRoutes from './routes/cards.js';
import cardsDatabaseRoutes from './routes/cardsDatabase.js';
import cardsDatabasePublicRoutes from './routes/cardsDatabasePublic.js';
import tileMarkersRoutes from './routes/tileMarkers.js';
import playerArchivesRoutes from './routes/playerArchives.js';
import apiStatsRoutes from './routes/apiStats.js';

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

// API日志中间件（仅记录特定端点）
app.use('/api/synthesize', apiLoggerMiddleware);

// 静态文件
if (clientDistExists) {
  // 为静态资源设置缓存策略
  app.use(express.static(clientDistPath, {
    setHeaders: (res, path) => {
      // HTML 文件不缓存，确保每次都获取最新版本
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } 
      // CSS、JS 等带哈希的资源可以长期缓存
      else if (path.match(/\.(css|js|jpg|jpeg|png|gif|webp|svg|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
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
app.use('/api/events', eventsRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/cards-database', cardsDatabaseRoutes);
app.use('/api/cards-database-public', cardsDatabasePublicRoutes);
app.use('/api/tiles', tileMarkersRoutes);
app.use('/api/player-archives', playerArchivesRoutes);
app.use('/api-stats', apiStatsRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 卡牌数据库管理页面（优先处理，避免被其他路由拦截）
if (clientDistExists) {
  app.get(['/cardsdatabase', '/cardsdatabase/'], (req, res) => {
    const htmlPath = path.join(clientDistPath, 'cardsdatabase.html');
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      res.status(404).json({ error: 'Cards database page not found' });
    }
  });
}

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

