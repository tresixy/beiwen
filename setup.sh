#!/bin/bash

# 无限合成游戏 - 环境设置脚本

echo "=== 无限合成游戏 - 环境设置 ==="

# 检查PostgreSQL
echo "检查PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL 未安装，正在安装..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
else
    echo "PostgreSQL 已安装"
fi

# 检查Redis
echo "检查Redis..."
if ! command -v redis-cli &> /dev/null; then
    echo "Redis 未安装，正在安装..."
    sudo apt update
    sudo apt install -y redis-server
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
else
    echo "Redis 已安装"
fi

# 创建数据库
echo "创建数据库..."
sudo -u postgres psql -c "CREATE DATABASE minigame;" 2>/dev/null || echo "数据库已存在"

# 初始化数据库表
echo "初始化数据库表..."
sudo -u postgres psql -d minigame -f server/db/schema.sql

echo ""
echo "=== 设置完成 ==="
echo "请确保 .env 文件中的配置正确"
echo "然后运行: npm run dev 启动开发服务器"
echo "或运行: npm start 启动生产服务器"

