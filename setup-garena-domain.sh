#!/bin/bash

# garena.love 域名配置与诊断脚本

DOMAIN="garena.love"
BACKEND_IP="43.161.234.121"
BACKEND_PORT="3000"

echo "=== garena.love 域名配置与诊断 ==="
echo ""

# 检查函数
check_status() {
    local name=$1
    local cmd=$2
    echo -n "检查 $name ... "
    if eval "$cmd" > /dev/null 2>&1; then
        echo "✓"
        return 0
    else
        echo "✗"
        return 1
    fi
}

# 1. 检查 Nginx 是否安装
if ! command -v nginx &> /dev/null; then
    echo "安装 Nginx..."
    sudo apt update
    sudo apt install -y nginx
else
    echo "✓ Nginx 已安装"
fi

# 2. 检查 Certbot 是否安装
if ! command -v certbot &> /dev/null; then
    echo "安装 Certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
else
    echo "✓ Certbot 已安装"
fi

# 3. 创建必要的目录
echo "创建必要目录..."
sudo mkdir -p /var/www/garena.love/html
sudo chown -R www-data:www-data /var/www/garena.love
echo "✓ 目录已创建"

# 4. 复制并应用 Nginx 配置
echo "应用 Nginx 配置..."
sudo cp /root/minigame/nginx.conf /etc/nginx/sites-available/minigame
sudo ln -sf /etc/nginx/sites-available/minigame /etc/nginx/sites-enabled/minigame

# 移除可能冲突的默认配置
if [ -f /etc/nginx/sites-enabled/default ]; then
    sudo rm /etc/nginx/sites-enabled/default
fi

# 5. 测试 Nginx 配置
echo "测试 Nginx 配置..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "✓ Nginx 配置有效"
else
    echo "❌ Nginx 配置测试失败："
    sudo nginx -t
    exit 1
fi

# 6. 检查 SSL 证书
echo ""
echo "检查 SSL 证书..."
if [ -f /etc/letsencrypt/live/garena.love/fullchain.pem ]; then
    echo "✓ SSL 证书已存在"
    CERT_EXISTS=true
else
    echo "✗ SSL 证书不存在，需要获取"
    CERT_EXISTS=false
fi

# 7. 如果证书不存在，先配置 HTTP 版本用于验证
if [ "$CERT_EXISTS" = false ]; then
    echo ""
    echo "=== 临时配置 HTTP 访问（用于证书验证）==="
    
    # 创建临时配置，允许 HTTP 访问
    sudo tee /etc/nginx/sites-available/minigame-temp > /dev/null <<EOF
upstream minigame_backend {
    server ${BACKEND_IP}:${BACKEND_PORT};
    keepalive 32;
}

server {
    listen 80;
    server_name garena.love www.garena.love;

    root /var/www/garena.love/html;

    location /.well-known/acme-challenge/ {
        allow all;
        default_type "text/plain";
    }

    location /api/ {
        proxy_pass http://minigame_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /socket.io/ {
        proxy_pass http://minigame_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /health {
        proxy_pass http://minigame_backend;
        access_log off;
    }

    location / {
        proxy_pass http://minigame_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    sudo cp /etc/nginx/sites-available/minigame-temp /etc/nginx/sites-available/minigame
    sudo nginx -t && sudo systemctl reload nginx
    echo "✓ 临时 HTTP 配置已应用"
fi

# 8. 获取或更新 SSL 证书
echo ""
if [ "$CERT_EXISTS" = false ]; then
    echo "=== 获取 SSL 证书 ==="
    echo "确保域名 garena.love 已正确解析到服务器 IP"
    echo ""
    read -p "按 Enter 继续获取 SSL 证书，或 Ctrl+C 取消..."
    
    sudo certbot --nginx -d garena.love -d www.garena.love --non-interactive --agree-tos --email admin@garena.love || {
        echo ""
        echo "❌ SSL 证书获取失败"
        echo ""
        echo "可能的原因："
        echo "  1. 域名 DNS 未正确解析到服务器 IP"
        echo "  2. 防火墙未开放 80 和 443 端口"
        echo "  3. 域名验证失败"
        echo ""
        echo "请检查 DNS 配置："
        echo "  dig garena.love"
        echo "  nslookup garena.love"
        echo ""
        echo "检查防火墙："
        echo "  sudo ufw status"
        echo "  sudo ufw allow 80/tcp"
        echo "  sudo ufw allow 443/tcp"
        exit 1
    }
    
    # 应用完整配置
    sudo cp /root/minigame/nginx.conf /etc/nginx/sites-available/minigame
    sudo nginx -t && sudo systemctl reload nginx
else
    echo "更新 SSL 证书（如果需要）..."
    sudo certbot renew --quiet
fi

# 9. 配置自动续期
echo ""
echo "配置 SSL 证书自动续期..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
echo "✓ 自动续期已配置"

# 10. 确保 Nginx 运行
echo ""
echo "确保 Nginx 运行..."
sudo systemctl enable nginx
sudo systemctl restart nginx
echo "✓ Nginx 已启动"

# 11. 诊断信息
echo ""
echo "=== 诊断信息 ==="
echo ""

# 检查 Nginx 状态
echo "Nginx 状态："
sudo systemctl is-active nginx && echo "  ✓ Nginx 正在运行" || echo "  ✗ Nginx 未运行"

# 检查端口监听
echo ""
echo "端口监听状态："
netstat -tlnp 2>/dev/null | grep -E ':80 |:443 ' || ss -tlnp | grep -E ':80 |:443 '

# 检查 DNS 解析
echo ""
echo "DNS 解析检查："
DNS_IP=$(dig +short garena.love @8.8.8.8 | tail -n1)
if [ -n "$DNS_IP" ]; then
    echo "  garena.love 解析到: $DNS_IP"
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}')
    echo "  服务器 IP: $SERVER_IP"
    if [ "$DNS_IP" = "$SERVER_IP" ]; then
        echo "  ✓ DNS 解析正确"
    else
        echo "  ⚠ DNS 解析可能不正确（域名应解析到服务器 IP）"
    fi
else
    echo "  ✗ 无法解析 garena.love"
fi

# 检查后端连接
echo ""
echo "后端连接检查："
if timeout 2 bash -c "echo > /dev/tcp/${BACKEND_IP}/${BACKEND_PORT}" 2>/dev/null; then
    echo "  ✓ 可以连接到后端 ${BACKEND_IP}:${BACKEND_PORT}"
else
    echo "  ✗ 无法连接到后端 ${BACKEND_IP}:${BACKEND_PORT}"
    echo "    请确保后端服务正在运行"
fi

# 检查防火墙
echo ""
echo "防火墙状态："
if command -v ufw &> /dev/null; then
    sudo ufw status | head -5
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --list-all 2>/dev/null | head -10
else
    echo "  未检测到常用防火墙工具"
fi

# 检查 SSL 证书
echo ""
echo "SSL 证书信息："
if [ -f /etc/letsencrypt/live/garena.love/fullchain.pem ]; then
    sudo certbot certificates 2>/dev/null | grep -A 5 "garena.love" || echo "  证书文件存在"
else
    echo "  ✗ SSL 证书不存在"
fi

echo ""
echo "=== 配置完成 ==="
echo ""
echo "访问地址："
echo "  http://garena.love  (将重定向到 HTTPS)"
echo "  https://garena.love"
echo ""
echo "查看日志："
echo "  sudo tail -f /var/log/nginx/garena_access.log"
echo "  sudo tail -f /var/log/nginx/garena_error.log"
echo ""
echo "如果仍然无法访问，请检查："
echo "  1. DNS 是否正确解析：dig garena.love"
echo "  2. 防火墙是否开放端口：sudo ufw allow 80/tcp && sudo ufw allow 443/tcp"
echo "  3. 后端服务是否运行：curl http://${BACKEND_IP}:${BACKEND_PORT}/health"
echo "  4. Nginx 错误日志：sudo tail -50 /var/log/nginx/garena_error.log"

