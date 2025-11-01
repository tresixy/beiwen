#!/bin/bash

# API测试脚本

BASE_URL="http://localhost:3000"

echo "======================================"
echo "无限合成游戏 API 测试"
echo "======================================"
echo ""

# 1. 健康检查
echo "1. 健康检查..."
curl -s ${BASE_URL}/health | jq '.' 2>/dev/null || curl -s ${BASE_URL}/health
echo -e "\n"

# 2. 注册账号
echo "2. 注册测试账号..."
REGISTER_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "test123456"
  }')

echo $REGISTER_RESPONSE | jq '.' 2>/dev/null || echo $REGISTER_RESPONSE

# 提取token
TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token' 2>/dev/null)

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo "✓ 注册成功，获得token"
else
    echo "! 注册失败或账号已存在，尝试登录..."
    
    # 尝试登录
    LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{
        "email": "test@example.com",
        "password": "test123456"
      }')
    
    TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token' 2>/dev/null)
    echo $LOGIN_RESPONSE | jq '.' 2>/dev/null || echo $LOGIN_RESPONSE
fi

echo -e "\n"

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ 无法获取token，停止测试"
    exit 1
fi

# 3. 获取当前用户信息
echo "3. 获取用户信息..."
curl -s ${BASE_URL}/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || curl -s ${BASE_URL}/api/auth/me -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# 4. 抽牌
echo "4. 抽牌..."
curl -s "${BASE_URL}/api/deck/draw?count=3" \
  -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/api/deck/draw?count=3" -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# 5. 获取资源
echo "5. 获取资源..."
curl -s ${BASE_URL}/api/turn/resources \
  -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || curl -s ${BASE_URL}/api/turn/resources -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# 6. 获取世界状态
echo "6. 获取世界状态..."
curl -s ${BASE_URL}/api/world/state \
  -H "Authorization: Bearer $TOKEN" | jq '.tiles | length' 2>/dev/null || curl -s ${BASE_URL}/api/world/state -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# 7. 合成测试
echo "7. 合成测试（火焰+水流=蒸汽）..."
curl -s -X POST ${BASE_URL}/api/synthesize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [1, 2],
    "name": "蒸汽",
    "mode": "auto"
  }' | jq '.' 2>/dev/null || curl -s -X POST ${BASE_URL}/api/synthesize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inputs": [1, 2], "name": "蒸汽", "mode": "auto"}'
echo -e "\n"

# 8. 结束回合
echo "8. 结束回合..."
curl -s -X POST ${BASE_URL}/api/turn/end \
  -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || curl -s -X POST ${BASE_URL}/api/turn/end -H "Authorization: Bearer $TOKEN"
echo -e "\n"

echo "======================================"
echo "测试完成！"
echo "======================================"
echo ""
echo "访问游戏: ${BASE_URL}"
echo "测试账号: test@example.com / test123456"

