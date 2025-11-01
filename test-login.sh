#!/bin/bash

# 测试登录功能

echo "=== 测试登录 API ==="

# 测试服务器健康
echo "1. 检查服务器健康..."
curl -s http://localhost:3000/health | jq '.' 2>/dev/null || curl -s http://localhost:3000/health
echo ""

# 测试注册
echo "2. 测试注册..."
REGISTER_RESULT=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "username": "testuser2",
    "password": "test123456"
  }')

echo $REGISTER_RESULT | jq '.' 2>/dev/null || echo $REGISTER_RESULT
echo ""

# 测试登录（正确）
echo "3. 测试登录（正确密码）..."
LOGIN_RESULT=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "password": "test123456"
  }')

echo $LOGIN_RESULT | jq '.' 2>/dev/null || echo $LOGIN_RESULT
echo ""

# 测试登录（错误）
echo "4. 测试登录（错误密码）..."
FAIL_RESULT=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "password": "wrongpassword"
  }')

echo $FAIL_RESULT | jq '.' 2>/dev/null || echo $FAIL_RESULT
echo ""

# 测试无效邮箱
echo "5. 测试登录（无效邮箱格式）..."
INVALID_RESULT=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "notanemail",
    "password": "test123456"
  }')

echo $INVALID_RESULT | jq '.' 2>/dev/null || echo $INVALID_RESULT
echo ""

# 测试缺少字段
echo "6. 测试登录（缺少密码）..."
MISSING_RESULT=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com"
  }')

echo $MISSING_RESULT | jq '.' 2>/dev/null || echo $MISSING_RESULT

echo ""
echo "=== 测试完成 ==="
