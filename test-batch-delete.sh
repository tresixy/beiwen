#!/bin/bash

echo "================================"
echo "测试批量删除功能"
echo "================================"
echo ""

# 创建测试用户
echo "1. 创建测试用户..."
PGPASSWORD=postgres psql -h localhost -U postgres -d minigame -c "
INSERT INTO users (username, email, password_hash, role) 
VALUES 
    ('test_delete_1', 'test1@delete.com', '\$argon2id\$v=19\$m=65536,t=3,p=4\$test\$test', 'user'),
    ('test_delete_2', 'test2@delete.com', '\$argon2id\$v=19\$m=65536,t=3,p=4\$test\$test', 'user')
ON CONFLICT (email) DO NOTHING
RETURNING id, username;
" 2>&1 | tail -5

echo ""

# 为测试用户添加一些数据
echo "2. 为测试用户添加关联数据..."
PGPASSWORD=postgres psql -h localhost -U postgres -d minigame -c "
DO \$\$
DECLARE
    test_user_id INTEGER;
BEGIN
    SELECT id INTO test_user_id FROM users WHERE email = 'test1@delete.com';
    
    IF test_user_id IS NOT NULL THEN
        -- 添加游戏状态
        INSERT INTO user_game_state (user_id, era, hand, completed_events) 
        VALUES (test_user_id, '生存时代', '[]'::jsonb, '[]'::jsonb)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- 添加卡牌
        INSERT INTO deck_cards (user_id, card_id, quantity) 
        VALUES (test_user_id, 1, 2)
        ON CONFLICT DO NOTHING;
        
        -- 添加地块标志
        INSERT INTO tile_markers (user_id, q, r, marker_type) 
        VALUES (test_user_id, 1, 1, 'resource')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '已为用户 % 添加测试数据', test_user_id;
    END IF;
END \$\$;
" 2>&1 | grep -E "(NOTICE|INSERT)"

echo ""

# 获取管理员token
echo "3. 获取管理员Token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aita@admin.com","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "   ❌ 登录失败"
    exit 1
fi

echo "   ✅ 登录成功"
echo ""

# 获取测试用户ID
echo "4. 获取测试用户ID..."
USER_ID_1=$(PGPASSWORD=postgres psql -h localhost -U postgres -d minigame -t -c "SELECT id FROM users WHERE email = 'test1@delete.com';" | tr -d ' ')
USER_ID_2=$(PGPASSWORD=postgres psql -h localhost -U postgres -d minigame -t -c "SELECT id FROM users WHERE email = 'test2@delete.com';" | tr -d ' ')

echo "   测试用户ID: $USER_ID_1, $USER_ID_2"
echo ""

# 执行批量删除
echo "5. 执行批量删除..."
DELETE_RESPONSE=$(curl -s -X POST http://localhost/api/player-archives/batch-delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"userIds\": [$USER_ID_1, $USER_ID_2]}")

echo "   响应: $DELETE_RESPONSE"
echo ""

# 验证删除结果
echo "6. 验证删除结果..."
REMAINING=$(PGPASSWORD=postgres psql -h localhost -U postgres -d minigame -t -c "
SELECT COUNT(*) FROM users WHERE email IN ('test1@delete.com', 'test2@delete.com');
" | tr -d ' ')

if [ "$REMAINING" = "0" ]; then
    echo "   ✅ 批量删除成功，用户已清除"
else
    echo "   ❌ 批量删除失败，仍有 $REMAINING 个用户"
fi

echo ""
echo "================================"
echo "测试完成"
echo "================================"

