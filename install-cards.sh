#!/bin/bash

# 卡牌系统安装脚本
# 自动执行数据库迁移和验证

set -e  # 遇到错误立即退出

echo "======================================"
echo "  卡牌系统安装脚本"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 数据库连接信息（从环境变量读取，或使用默认值）
DB_NAME="${DB_NAME:-minigame_db}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo "数据库连接信息："
echo "  主机: $DB_HOST:$DB_PORT"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"
echo ""

# 检查PostgreSQL是否可访问
echo -n "检查数据库连接... "
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo -e "${RED}错误: 无法连接到数据库${NC}"
    echo "请检查数据库是否运行，以及连接信息是否正确"
    exit 1
fi

# 步骤1: 添加用户生成卡牌支持字段
echo ""
echo "步骤 1/3: 添加用户生成卡牌支持字段..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f server/db/migrations/add_user_generated_cards.sql > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 字段添加成功${NC}"
else
    echo -e "${YELLOW}⚠ 字段可能已存在，继续...${NC}"
fi

# 步骤2: 执行完整卡牌数据初始化
echo ""
echo "步骤 2/3: 初始化卡牌数据..."
echo "  - 清理并重新插入基础卡牌..."
cd server
if node db/run-migration-cards.js; then
    echo -e "${GREEN}✓ 卡牌数据初始化成功${NC}"
else
    echo -e "${RED}✗ 卡牌数据初始化失败${NC}"
    exit 1
fi
cd ..

# 步骤3: 验证安装
echo ""
echo "步骤 3/3: 验证安装..."

# 检查卡牌数量
echo ""
echo "卡牌统计："
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
  era AS \"时代\",
  card_type AS \"类型\",
  COUNT(*) AS \"数量\"
FROM cards 
WHERE is_base_card = TRUE
GROUP BY era, card_type 
ORDER BY era, card_type;
"

# 检查字段
echo ""
echo "表结构验证："
EXPECTED_COLUMNS="era card_type unlock_condition is_starter is_decoy is_base_card created_by_user_id source_type"
for col in $EXPECTED_COLUMNS; do
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT column_name FROM information_schema.columns 
        WHERE table_name='cards' AND column_name='$col';
    " | grep -q "$col"; then
        echo -e "  ${GREEN}✓${NC} $col"
    else
        echo -e "  ${RED}✗${NC} $col ${RED}(缺失)${NC}"
    fi
done

# 检查索引
echo ""
echo "索引验证："
EXPECTED_INDEXES="idx_cards_era idx_cards_type idx_cards_base idx_cards_creator idx_cards_source"
for idx in $EXPECTED_INDEXES; do
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT indexname FROM pg_indexes 
        WHERE tablename='cards' AND indexname='$idx';
    " | grep -q "$idx"; then
        echo -e "  ${GREEN}✓${NC} $idx"
    else
        echo -e "  ${YELLOW}⚠${NC} $idx ${YELLOW}(未创建)${NC}"
    fi
done

# 完成
echo ""
echo "======================================"
echo -e "${GREEN}✓ 卡牌系统安装完成！${NC}"
echo "======================================"
echo ""
echo "下一步："
echo "  1. 启动服务器: npm start"
echo "  2. 测试API: curl -H \"Authorization: Bearer TOKEN\" http://localhost:3000/api/cards/all"
echo "  3. 查看文档: cat INSTALL_CARDS.md"
echo ""

