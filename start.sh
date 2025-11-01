#!/bin/bash

# 无限合成游戏 - 启动脚本

echo "=== 无限合成游戏 - 启动服务 ==="

# 检查服务
echo "检查必要服务..."

# 检查PostgreSQL
if sudo systemctl is-active --quiet postgresql; then
    echo "✓ PostgreSQL 运行中"
else
    echo "! PostgreSQL 未运行，正在启动..."
    sudo systemctl start postgresql
fi

# 检查Redis
if sudo systemctl is-active --quiet redis-server; then
    echo "✓ Redis 运行中"
else
    echo "! Redis 未运行，正在启动..."
    sudo systemctl start redis-server
fi

echo ""
echo "启动游戏服务器..."
echo "访问 http://localhost:3000"
echo ""
echo "提示：前端 React + Phaser 需要在另一个终端运行 'npm run client:dev'"
echo ""

npm run dev

