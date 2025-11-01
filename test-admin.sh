#!/bin/bash

# 管理员功能测试脚本

echo "=== 管理员功能测试 ==="
echo ""

# 1. 管理员登录
echo "1. 管理员登录..."
ADMIN_LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aita@admin.com","password":"aita"}')

echo $ADMIN_LOGIN
TOKEN=$(echo $ADMIN_LOGIN | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ 管理员登录失败"
    exit 1
fi

echo "✅ 管理员登录成功"
echo "Token: ${TOKEN:0:20}..."
echo ""

# 2. 获取仪表板
echo "2. 获取管理员仪表板..."
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/dashboard
echo -e "\n"

# 3. 获取用户列表
echo "3. 获取用户列表..."
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/users?limit=5
echo -e "\n"

# 4. 查看物品
echo "4. 查看所有物品..."
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/items?limit=5
echo -e "\n"

# 5. 测试普通用户无权限访问
echo "5. 测试普通用户权限（应该失败）..."
NORMAL_LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"normal@test.com","username":"normaluser","password":"test123456"}')

NORMAL_TOKEN=$(echo $NORMAL_LOGIN | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$NORMAL_TOKEN" ]; then
    echo "普通用户尝试访问管理员API..."
    curl -s -H "Authorization: Bearer $NORMAL_TOKEN" \
      http://localhost:3000/api/admin/dashboard
    echo ""
fi

echo ""
echo "=== 测试完成 ==="

