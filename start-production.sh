#!/bin/bash

# 生产环境启动脚本

echo "=== 无限合成游戏 - 生产环境启动 ==="

# 检查环境
if [ ! -f ".env" ]; then
    echo "错误: .env 文件不存在"
    exit 1
fi

# 检查服务
echo "检查必要服务..."

# PostgreSQL
if sudo systemctl is-active --quiet postgresql; then
    echo "✓ PostgreSQL 运行中"
else
    echo "! 启动 PostgreSQL..."
    sudo systemctl start postgresql
fi

# Redis
if sudo systemctl is-active --quiet redis-server; then
    echo "✓ Redis 运行中"
else
    echo "! 启动 Redis..."
    sudo systemctl start redis-server
fi

echo ""
echo "生产环境启动中..."
echo "进程将在后台运行"
echo ""

# 构建前端静态资源
if [ ! -f "client/dist/index.html" ]; then
    echo "检测到前端尚未构建，正在执行 npm run client:build..."
    npm run client:build
    if [ $? -ne 0 ]; then
        echo "前端构建失败，请检查输出日志。"
        exit 1
    fi
fi

# 使用pm2或直接后台运行
if command -v pm2 &> /dev/null; then
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js
        echo "✓ PM2 集群模式启动（2个进程）"
    else
        pm2 start server/index.js --name minigame -i 2
        echo "✓ PM2 集群模式启动（2个进程）"
    fi
    echo "使用 'pm2 logs minigame' 查看日志"
    echo "使用 'pm2 stop minigame' 停止服务"
    echo "使用 'pm2 monit' 监控资源"
else
    nohup npm start > logs/server.log 2>&1 &
    echo $! > minigame.pid
    echo "PID: $(cat minigame.pid)"
    echo "日志: logs/server.log"
    echo "停止服务: kill \$(cat minigame.pid)"
fi

echo ""
echo "服务已启动在 http://localhost:3000"

