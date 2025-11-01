#!/bin/bash

# 测试 nginx 配置
echo "=== 检查 nginx 配置 ==="
sudo nginx -t

# 重新加载 nginx
echo ""
echo "=== 重新加载 nginx ==="
sudo systemctl reload nginx

# 等待一秒
sleep 1

# 测试不带认证
echo ""
echo "=== 测试 1: 不带认证（预期 401） ==="
curl -s -I "http://localhost/cardsdatabase/" 2>&1 | head -3

# 测试带认证
echo ""
echo "=== 测试 2: 带认证（预期返回数据） ==="
curl -s -u "aita:aita" "http://localhost/cardsdatabase/" 2>&1 | head -30

echo ""
echo "=== 完成 ==="

