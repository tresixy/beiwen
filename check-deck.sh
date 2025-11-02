#!/bin/bash
# 检查用户的牌库状态

# 获取用户ID（默认为2，可以通过参数指定）
USER_ID=${1:-2}

echo "========================================="
echo "检查用户 $USER_ID 的牌库状态"
echo "========================================="

# 连接数据库
PGPASSWORD=postgres psql -U postgres -d minigame -c "
SELECT 
    c.name AS \"卡牌名称\",
    c.type AS \"类型\",
    c.rarity AS \"稀有度\",
    c.era AS \"时代\",
    c.card_type AS \"卡牌类别\",
    dc.discovered AS \"已解锁\",
    dc.count AS \"数量\"
FROM deck_cards dc
JOIN cards c ON dc.card_id = c.id
WHERE dc.user_id = $USER_ID
ORDER BY 
    c.card_type DESC,
    dc.discovered DESC,
    c.rarity,
    c.name;
"

echo ""
echo "========================================="
echo "统计信息"
echo "========================================="

PGPASSWORD=postgres psql -U postgres -d minigame -c "
SELECT 
    c.card_type AS \"卡牌类别\",
    COUNT(*) AS \"种类数\",
    SUM(dc.count) AS \"总数量\",
    COUNT(CASE WHEN dc.discovered THEN 1 END) AS \"已解锁\"
FROM deck_cards dc
JOIN cards c ON dc.card_id = c.id
WHERE dc.user_id = $USER_ID
GROUP BY c.card_type
ORDER BY c.card_type;
"

