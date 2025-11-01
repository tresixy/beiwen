#!/bin/bash
set -e

cd /root/minigame

echo "停止服务..."
pkill -f "node.*server/index.js" 2>/dev/null || true
sleep 2

echo "启动服务..."
nohup npm start > logs/server.log 2>&1 &
NEW_PID=$!
echo $NEW_PID > minigame.pid

echo "服务已启动 (PID: $NEW_PID)"
sleep 3

echo "检查服务状态..."
if ps -p $NEW_PID > /dev/null; then
    echo "✅ 服务运行中"
    
    # 检查端口
    if netstat -tlnp 2>/dev/null | grep -q ":3000"; then
        echo "✅ 端口 3000 监听中"
    else
        echo "⚠️ 端口 3000 未监听"
    fi
else
    echo "❌ 服务启动失败"
    echo "查看日志:"
    tail -20 logs/server.log
fi

