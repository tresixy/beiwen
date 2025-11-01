// Socket.io 多人游戏支持（预留）
import { Server } from 'socket.io';
import logger from '../utils/logger.js';

let io = null;

export function initSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  
  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Client connected');
    
    // 加入房间
    socket.on('joinRoom', (data) => {
      const { roomId, userId } = data;
      socket.join(`room:${roomId}`);
      socket.userId = userId;
      
      logger.info({ socketId: socket.id, roomId, userId }, 'User joined room');
      
      // 通知房间其他玩家
      socket.to(`room:${roomId}`).emit('playerJoined', { userId });
    });
    
    // 移动
    socket.on('move', (data) => {
      const { roomId, dx, dy } = data;
      
      // 广播移动
      socket.to(`room:${roomId}`).emit('playerMoved', {
        userId: socket.userId,
        dx,
        dy,
      });
    });
    
    // 动作
    socket.on('action', (data) => {
      const { roomId, action } = data;
      
      // 广播动作
      socket.to(`room:${roomId}`).emit('playerAction', {
        userId: socket.userId,
        action,
      });
    });
    
    // 断开连接
    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id, userId: socket.userId }, 'Client disconnected');
      
      // 通知房间其他玩家
      if (socket.userId) {
        socket.rooms.forEach((room) => {
          if (room.startsWith('room:')) {
            socket.to(room).emit('playerLeft', { userId: socket.userId });
          }
        });
      }
    });
  });
  
  logger.info('Socket.IO initialized');
  
  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

