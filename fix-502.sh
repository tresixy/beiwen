#!/bin/bash

# 502 错误快速修复脚本

echo "=== 502 错误诊断与修复 ==="
echo ""

# 切换到项目目录
cd /root/minigame

# 1. 检查 Node.js 进程
echo "1. 检查 Node.js 服务..."
if pgrep -f "node.*server/index.js" > /dev/null; then
    echo "   ✅ Node.js 进程存在"
    PID=$(pgrep -f "node.*server/index.js")
    echo "   PID: $PID"
else
    echo "   ❌ Node.js 服务未运行"
fi

# 2. 检查端口占用
echo ""
echo "2. 检查端口 3000..."
if lsof -i :3000 > /dev/null 2>&1; then
    echo "   ✅ 端口 3000 有进程监听"
    lsof -i :3000 | grep LISTEN
else
    echo "   ❌ 端口 3000 无进程监听"
fi

# 3. 检查 Nginx
echo ""
echo "3. 检查 Nginx..."
if systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx 运行中"
else
    echo "   ❌ Nginx 未运行"
fi

# 4. 检查数据库
echo ""
echo "4. 检查 PostgreSQL..."
if systemctl is-active --quiet postgresql; then
    echo "   ✅ PostgreSQL 运行中"
else
    echo "   ⚠️  PostgreSQL 未运行，正在启动..."
    sudo systemctl start postgresql
fi

# 5. 检查 Redis
echo ""
echo "5. 检查 Redis..."
if systemctl is-active --quiet redis-server; then
    echo "   ✅ Redis 运行中"
else
    echo "   ⚠️  Redis 未运行，正在启动..."
    sudo systemctl start redis-server
fi

# 6. 检查前端构建
echo ""
echo "6. 检查前端构建..."
if [ -f "client/dist/index.html" ]; then
    echo "   ✅ 前端已构建"
else
    echo "   ❌ 前端未构建"
fi

# 7. 查看最近的错误日志
echo ""
echo "7. 最近的错误日志..."
if [ -f "logs/server.log" ]; then
    echo "   最后 10 行日志："
    tail -n 10 logs/server.log
fi

echo ""
echo "=== 开始修复 ==="
echo ""

# 停止旧进程
echo "停止旧进程..."
pkill -f "node.*server/index.js"
if [ -f "minigame.pid" ]; then
    kill $(cat minigame.pid) 2>/dev/null
fi
sleep 2

# 清理旧PID文件
rm -f minigame.pid

# 检查前端是否构建
if [ ! -f "client/dist/index.html" ]; then
    echo "构建前端..."
    npm run client:build
    if [ $? -ne 0 ]; then
        echo "❌ 前端构建失败"
        exit 1
    fi
fi

# 启动服务
echo "启动 Node.js 服务..."
nohup npm start > logs/server.log 2>&1 &
NEW_PID=$!
echo $NEW_PID > minigame.pid
echo "   新 PID: $NEW_PID"

# 等待服务启动
echo "等待服务启动..."
for i in {1..10}; do
    sleep 1
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "   ✅ 服务启动成功"
        break
    fi
    echo "   等待... ($i/10)"
done

# 最终测试
echo ""
echo "=== 最终测试 ==="
echo ""

# 测试健康检查
HEALTH=$(curl -s http://localhost:3000/health)
if [ "$HEALTH" = '{"status":"ok"}' ]; then
    echo "✅ API 健康检查通过"
else
    echo "❌ API 健康检查失败: $HEALTH"
    echo ""
    echo "请查看日志："
    echo "  tail -f logs/server.log"
    exit 1
fi

# 测试根路径
ROOT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)
echo "✅ 根路径状态码: $ROOT_STATUS"

echo ""
echo "=== 修复完成 ==="
echo ""
echo "服务信息："
echo "  内网地址: http://localhost:3000"
echo "  外网地址: http://43.161.234.121"
echo "  进程 PID: $(cat minigame.pid)"
echo ""
echo "查看日志："
echo "  tail -f logs/server.log"
echo ""
echo "停止服务："
echo "  kill \$(cat minigame.pid)"

