#!/bin/bash

# 服务器健康检查和自动修复脚本

echo "=== 服务器状态检查 ==="
echo ""

# 1. 检查Node.js进程
if pgrep -f "node.*server/index.js" > /dev/null; then
    echo "✅ 服务器进程运行中"
    PID=$(pgrep -f "node.*server/index.js" | head -1)
    echo "   PID: $PID"
else
    echo "❌ 服务器未运行"
    echo "   正在启动服务器..."
    cd /root/minigame
    npm start > /dev/null 2>&1 &
    sleep 3
    if pgrep -f "node.*server/index.js" > /dev/null; then
        echo "✅ 服务器启动成功"
    else
        echo "❌ 服务器启动失败"
        exit 1
    fi
fi

echo ""

# 2. 检查端口
if lsof -i :3000 > /dev/null 2>&1; then
    echo "✅ 端口 3000 已监听"
else
    echo "❌ 端口 3000 未监听"
    exit 1
fi

echo ""

# 3. 检查PostgreSQL
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL 运行中"
else
    echo "⚠️  PostgreSQL 未运行，正在启动..."
    sudo systemctl start postgresql
fi

echo ""

# 4. 检查Redis
if systemctl is-active --quiet redis-server; then
    echo "✅ Redis 运行中"
else
    echo "⚠️  Redis 未运行，正在启动..."
    sudo systemctl start redis-server
fi

echo ""

# 5. 测试API健康检查
echo "测试 API 健康检查..."
HEALTH=$(curl -s http://localhost:3000/health)
if [ "$HEALTH" = '{"status":"ok"}' ]; then
    echo "✅ API 健康检查通过"
else
    echo "❌ API 健康检查失败: $HEALTH"
    exit 1
fi

echo ""

# 6. 测试登录API
echo "测试登录 API..."
LOGIN_RESULT=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"aita","password":"aita"}')

if echo "$LOGIN_RESULT" | grep -q "token"; then
    echo "✅ 登录 API 正常"
else
    echo "⚠️  登录 API 响应异常"
    echo "   响应: $LOGIN_RESULT"
fi

echo ""
echo "=== 检查完成 ==="
echo ""
echo "访问地址："
echo "  http://localhost:3000"
echo "  http://localhost (Nginx)"
echo ""
echo "管理员账户："
echo "  用户名: aita"
echo "  密码: aitaita"

