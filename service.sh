#!/bin/bash

# 服务管理脚本

CMD=$1
cd /root/minigame

case "$CMD" in
  start)
    echo "启动服务..."
    # 优先使用PM2集群模式
    if command -v pm2 &> /dev/null; then
      if pm2 list | grep -q "minigame"; then
        echo "PM2服务已在运行"
        pm2 list
        exit 0
      fi
      if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js
        echo "✅ PM2集群模式启动（2个进程）"
      else
        pm2 start server/index.js --name minigame -i 2
        echo "✅ PM2集群模式启动（2个进程）"
      fi
    elif pgrep -f "node.*server/index.js" > /dev/null; then
      echo "服务已在运行"
      exit 0
    else
      nohup npm start > logs/server.log 2>&1 &
      echo $! > minigame.pid
      echo "✅ 服务已启动，PID: $(cat minigame.pid)"
    fi
    ;;
    
  stop)
    echo "停止服务..."
    if command -v pm2 &> /dev/null; then
      if pm2 list | grep -q "minigame"; then
        pm2 stop minigame
        pm2 delete minigame
        echo "✅ PM2服务已停止"
      fi
    fi
    pkill -f "node.*server/index.js"
    if [ -f "minigame.pid" ]; then
      kill $(cat minigame.pid) 2>/dev/null
      rm -f minigame.pid
    fi
    echo "✅ 服务已停止"
    ;;
    
  restart)
    echo "重启服务..."
    $0 stop
    sleep 2
    $0 start
    ;;
    
  status)
    echo "=== 服务状态 ==="
    if command -v pm2 &> /dev/null && pm2 list | grep -q "minigame"; then
      echo "✅ PM2集群模式运行中"
      pm2 list
      pm2 describe minigame | grep -E "status|uptime|memory|cpu"
    elif pgrep -f "node.*server/index.js" > /dev/null; then
      PID=$(pgrep -f "node.*server/index.js")
      echo "✅ 服务运行中"
      echo "   PID: $PID"
      
      if lsof -i :3000 > /dev/null 2>&1; then
        echo "✅ 端口 3000 正常监听"
      fi
      
      HEALTH=$(curl -s http://localhost:3000/health 2>/dev/null)
      if [ "$HEALTH" = '{"status":"ok"}' ]; then
        echo "✅ 健康检查通过"
      else
        echo "⚠️  健康检查失败"
      fi
    else
      echo "❌ 服务未运行"
    fi
    ;;
    
  logs)
    tail -f logs/server.log
    ;;
    
  fix)
    ./fix-502.sh
    ;;
    
  *)
    echo "用法: $0 {start|stop|restart|status|logs|fix}"
    echo ""
    echo "命令说明："
    echo "  start    - 启动服务"
    echo "  stop     - 停止服务"
    echo "  restart  - 重启服务"
    echo "  status   - 查看状态"
    echo "  logs     - 查看日志"
    echo "  fix      - 诊断并修复问题"
    exit 1
    ;;
esac





