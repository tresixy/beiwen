#!/bin/bash

# 代码更新后重新构建和重启脚本

echo "=== 无限合成游戏 - 重新构建 ==="

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
    echo "错误: 请在项目根目录执行此脚本"
    exit 1
fi

# 1. 停止现有服务
echo ""
echo "1. 停止现有服务..."
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "minigame"; then
        pm2 stop minigame
        pm2 delete minigame
        echo "✓ PM2 服务已停止"
    fi
else
    if [ -f "minigame.pid" ]; then
        PID=$(cat minigame.pid)
        if ps -p $PID > /dev/null 2>&1; then
            kill $PID
            echo "✓ 进程 $PID 已停止"
        fi
        rm -f minigame.pid
    fi
fi

# 等待进程完全退出
sleep 2

# 2. 构建前端
echo ""
echo "2. 构建前端静态资源..."
npm run client:build
if [ $? -ne 0 ]; then
    echo "❌ 前端构建失败"
    exit 1
fi
echo "✓ 前端构建完成"

# 3. 检查依赖（可选，如果需要安装新依赖）
if [ "$1" = "--install" ]; then
    echo ""
    echo "3. 安装依赖..."
    npm install
    npm --prefix client install
    echo "✓ 依赖安装完成"
fi

# 4. 重启服务
echo ""
echo "4. 启动服务..."

# 检查服务
if sudo systemctl is-active --quiet postgresql; then
    echo "✓ PostgreSQL 运行中"
else
    echo "! 启动 PostgreSQL..."
    sudo systemctl start postgresql
fi

if sudo systemctl is-active --quiet redis-server; then
    echo "✓ Redis 运行中"
else
    echo "! 启动 Redis..."
    sudo systemctl start redis-server
fi

# 使用pm2或直接后台运行
if command -v pm2 &> /dev/null; then
    pm2 start server/index.js --name minigame
    echo "✓ 服务已启动 (PM2)"
    echo ""
    echo "查看日志: pm2 logs minigame"
    echo "查看状态: pm2 status"
else
    nohup npm start > logs/server.log 2>&1 &
    echo $! > minigame.pid
    echo "✓ 服务已启动 (后台进程)"
    echo "  PID: $(cat minigame.pid)"
    echo "  日志: logs/server.log"
fi

echo ""
echo "=== 重新构建完成 ==="
echo "访问地址: http://localhost:3000"

