#!/bin/bash

echo "================================"
echo "测试游戏初始化"
echo "================================"
echo ""

# 创建新测试用户
TEST_EMAIL="test_game_init_$(date +%s)@test.com"
TEST_PASS="test123"

echo "1. 创建新测试用户..."
echo "   邮箱: $TEST_EMAIL"

LOGIN_RESPONSE=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
USERNAME=$(echo $LOGIN_RESPONSE | grep -o '"username":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "   ❌ 用户创建失败"
    echo "   响应: $LOGIN_RESPONSE"
    exit 1
fi

echo "   ✅ 用户创建成功: $USERNAME"
echo ""

# 等待一秒让初始化完成
sleep 1

# 检查游戏状态
echo "2. 检查游戏状态..."
GAME_STATE=$(curl -s http://localhost/api/game/state \
  -H "Authorization: Bearer $TOKEN")

# 提取关键信息
ERA=$(echo $GAME_STATE | python3 -c "import sys, json; print(json.load(sys.stdin).get('era', 'N/A'))" 2>/dev/null)
ACTIVE_EVENT=$(echo $GAME_STATE | python3 -c "import sys, json; print(json.load(sys.stdin).get('activeEvent', {}).get('name', 'None'))" 2>/dev/null)
HAND_SIZE=$(echo $GAME_STATE | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('hand', [])))" 2>/dev/null)
DECK_CARDS=$(echo $GAME_STATE | python3 -c "import sys, json; print(json.load(sys.stdin).get('deck', {}).get('totalCards', 0))" 2>/dev/null)
EVENT_TOTAL=$(echo $GAME_STATE | python3 -c "import sys, json; print(json.load(sys.stdin).get('eventProgress', {}).get('total', 0))" 2>/dev/null)

echo "   时代: $ERA"
echo "   当前Event: $ACTIVE_EVENT"
echo "   手牌数量: $HAND_SIZE"
echo "   卡组卡牌: $DECK_CARDS"
echo "   Event总数: $EVENT_TOTAL"
echo ""

# 验证结果
ISSUES=0

if [ "$ERA" != "生存时代" ]; then
    echo "   ❌ 时代错误（应该是'生存时代'）"
    ISSUES=$((ISSUES + 1))
fi

if [ "$ACTIVE_EVENT" = "None" ] || [ "$ACTIVE_EVENT" = "null" ]; then
    echo "   ❌ 没有激活的Event"
    ISSUES=$((ISSUES + 1))
fi

if [ "$DECK_CARDS" != "2" ]; then
    echo "   ❌ 起始卡牌数量错误（应该是2：人、石头）"
    ISSUES=$((ISSUES + 1))
fi

if [ "$EVENT_TOTAL" = "0" ]; then
    echo "   ❌ Event序列为空"
    ISSUES=$((ISSUES + 1))
fi

# 如果没有手牌，尝试抽卡
if [ "$HAND_SIZE" = "0" ]; then
    echo ""
    echo "3. 手牌为空，尝试抽卡..."
    DRAW_RESPONSE=$(curl -s "http://localhost/api/deck/draw?count=3" \
      -H "Authorization: Bearer $TOKEN")
    
    DRAW_HAND=$(echo $DRAW_RESPONSE | grep -o '"hand"')
    
    if [ -n "$DRAW_HAND" ]; then
        echo "   ✅ 抽卡成功"
        
        # 保存手牌
        curl -s -X POST http://localhost/api/game/hand \
          -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          -d "$DRAW_RESPONSE" > /dev/null
        
        echo "   ✅ 手牌已保存"
    else
        echo "   ❌ 抽卡失败"
        ISSUES=$((ISSUES + 1))
    fi
fi

echo ""
echo "================================"
if [ $ISSUES -eq 0 ]; then
    echo "✅ 测试通过！游戏初始化正常"
else
    echo "❌ 测试失败：发现 $ISSUES 个问题"
fi
echo "================================"
echo ""

# 清理测试用户
echo "清理测试用户..."
USER_ID=$(PGPASSWORD=postgres psql -h localhost -U postgres -d minigame -t -c \
  "SELECT id FROM users WHERE email = '$TEST_EMAIL';" | tr -d ' ')

if [ -n "$USER_ID" ]; then
    PGPASSWORD=postgres psql -h localhost -U postgres -d minigame -c \
      "DELETE FROM users WHERE id = $USER_ID;" > /dev/null 2>&1
    echo "测试用户已删除 (ID: $USER_ID)"
fi

exit $ISSUES

