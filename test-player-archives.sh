#!/bin/bash

echo "================================"
echo "玩家存档管理系统测试"
echo "================================"
echo ""

# 测试页面访问
echo "1. 测试页面访问..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/playerarchives/)
if [ "$STATUS" = "200" ]; then
    echo "   ✅ 页面访问正常 (HTTP $STATUS)"
else
    echo "   ❌ 页面访问失败 (HTTP $STATUS)"
fi
echo ""

# 测试API端点
echo "2. 测试API端点..."
echo ""

# 获取管理员token (需要先登录)
echo "   正在登录管理员账号..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aita@admin.com","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "   ❌ 登录失败，请确认管理员账号和密码"
    echo "   响应: $LOGIN_RESPONSE"
    exit 1
fi

echo "   ✅ 登录成功"
echo ""

# 测试玩家列表API
echo "3. 测试玩家列表API..."
PLAYERS=$(curl -s "http://localhost/api/player-archives/list?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN")

PLAYER_COUNT=$(echo $PLAYERS | grep -o '"players":\[' | wc -l)
if [ "$PLAYER_COUNT" -gt 0 ]; then
    echo "   ✅ 玩家列表API正常"
    echo "   响应: $(echo $PLAYERS | cut -c1-200)..."
else
    echo "   ❌ 玩家列表API异常"
    echo "   响应: $PLAYERS"
fi
echo ""

echo "================================"
echo "测试完成"
echo "================================"
echo ""
echo "📖 访问方式："
echo "   1. 使用管理员账号登录 (aita@admin.com)"
echo "   2. 点击右下角 ⚙️ 设置按钮"
echo "   3. 点击 📁 玩家存档管理"
echo ""
echo "🌐 直接访问："
echo "   http://localhost/playerarchives/"
echo ""

