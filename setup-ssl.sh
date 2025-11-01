#!/bin/bash

# SSL 证书配置脚本（使用 Let's Encrypt）

if [ -z "$1" ]; then
    echo "用法: ./setup-ssl.sh yourdomain.com"
    exit 1
fi

DOMAIN=$1

echo "=== 为 $DOMAIN 配置 SSL 证书 ==="

# 1. 安装 Certbot
if ! command -v certbot &> /dev/null; then
    echo "安装 Certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
else
    echo "✓ Certbot 已安装"
fi

# 2. 更新 Nginx 配置中的域名
echo "更新 Nginx 配置..."
sudo sed -i "s/server_name localhost;/server_name $DOMAIN;/" /etc/nginx/sites-available/minigame

# 3. 重载 Nginx
sudo nginx -t && sudo systemctl reload nginx

# 4. 获取 SSL 证书
echo "获取 SSL 证书..."
sudo certbot --nginx -d $DOMAIN

if [ $? -eq 0 ]; then
    echo ""
    echo "=== SSL 配置完成 ==="
    echo ""
    echo "✓ HTTPS 已启用"
    echo "✓ 游戏可通过以下地址访问："
    echo "   https://$DOMAIN"
    echo ""
    echo "证书自动续期："
    echo "   sudo certbot renew --dry-run"
    echo ""
    echo "查看证书信息："
    echo "   sudo certbot certificates"
else
    echo "❌ SSL 证书获取失败"
    echo "请检查："
    echo "  1. 域名 DNS 是否正确解析到服务器 IP"
    echo "  2. 防火墙是否开放 80 和 443 端口"
    echo "  3. Nginx 是否正常运行"
    exit 1
fi

