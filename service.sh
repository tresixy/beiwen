#!/bin/bash

# 服务管理脚本

CMD=$1
cd /root/minigame

case "$CMD" in
  start)
    echo "启动服务..."
    if pgrep -f "node.*server/index.js" > /dev/null; then
      echo "服务已在运行"
      exit 0
    fi
    nohup npm start > logs/server.log 2>&1 &
    echo $! > minigame.pid
    echo "✅ 服务已启动，PID: $(cat minigame.pid)"
    ;;
    
  stop)
    echo "停止服务..."
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
    if pgrep -f "node.*server/index.js" > /dev/null; then
      PID=$(pgrep -f "node.*server/index.js")
      echo "✅ 服务运行中"
      echo "   PID: $PID"
      
      if lsof -i :3000 > /dev/null 2>&1; then
        echo "✅ 端口 3000 正常监听"
      fi
      
      HEALTH=$(curl -s http://localhost:3000/health)
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


