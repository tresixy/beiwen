#!/bin/bash

# Nginx 安装和配置脚本

echo "=== 无限合成游戏 - Nginx 配置 ==="

# 1. 安装 Nginx
if ! command -v nginx &> /dev/null; then
    echo "安装 Nginx..."
    sudo apt update
    sudo apt install -y nginx
else
    echo "✓ Nginx 已安装"
fi

# 2. 停止 Nginx（如果正在运行）
sudo systemctl stop nginx 2>/dev/null || true

# 3. 复制配置文件
echo "配置 Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/minigame

# 4. 创建符号链接
sudo ln -sf /etc/nginx/sites-available/minigame /etc/nginx/sites-enabled/minigame

# 5. 删除默认配置（可选）
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "移除默认配置..."
    sudo rm /etc/nginx/sites-enabled/default
fi

# 6. 测试配置
echo "测试 Nginx 配置..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✓ Nginx 配置有效"
    
    # 7. 启动 Nginx
    echo "启动 Nginx..."
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    echo ""
    echo "=== Nginx 配置完成 ==="
    echo ""
    echo "✓ Nginx 已启动"
    echo "✓ 游戏可通过以下地址访问："
    echo "   http://localhost"
    echo "   http://$(hostname -I | awk '{print $1}')"
    echo ""
    echo "确保游戏服务器正在运行："
    echo "   ./start.sh"
    echo ""
    echo "查看 Nginx 状态："
    echo "   sudo systemctl status nginx"
    echo ""
    echo "查看 Nginx 日志："
    echo "   sudo tail -f /var/log/nginx/minigame_access.log"
    echo "   sudo tail -f /var/log/nginx/minigame_error.log"
    
else
    echo "❌ Nginx 配置测试失败"
    exit 1
fi

