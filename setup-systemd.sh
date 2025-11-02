#!/bin/bash

# 设置 systemd 服务脚本

echo "=== 设置 Minigame Systemd 服务 ==="
echo ""

# 检查权限
if [ "$EUID" -ne 0 ]; then 
    echo "请使用 sudo 运行此脚本"
    exit 1
fi

# 停止现有进程
echo "1. 停止现有进程..."
pkill -f "node.*server/index.js"
if [ -f "/root/minigame/minigame.pid" ]; then
    kill $(cat /root/minigame/minigame.pid) 2>/dev/null
    rm -f /root/minigame/minigame.pid
fi

# 复制服务文件
echo "2. 安装 systemd 服务..."
cp /root/minigame/minigame.service /etc/systemd/system/

# 重新加载 systemd
echo "3. 重新加载 systemd..."
systemctl daemon-reload

# 启用服务（开机自启）
echo "4. 启用服务（开机自启）..."
systemctl enable minigame

# 启动服务
echo "5. 启动服务..."
systemctl start minigame

# 等待服务启动
sleep 3

# 检查状态
echo ""
echo "=== 服务状态 ==="
systemctl status minigame --no-pager -l

echo ""
echo "=== 常用命令 ==="
echo "  查看状态: sudo systemctl status minigame"
echo "  启动服务: sudo systemctl start minigame"
echo "  停止服务: sudo systemctl stop minigame"
echo "  重启服务: sudo systemctl restart minigame"
echo "  查看日志: sudo journalctl -u minigame -f"
echo "  查看应用日志: tail -f /root/minigame/logs/server.log"
echo ""





