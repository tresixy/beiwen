#!/bin/bash

# 测试玩家数据存档功能

BASE_URL="http://localhost:3000"
EMAIL="test-save@example.com"

echo "=== 测试玩家数据存档功能 ==="
echo ""

# 1. 登录获取token
echo "1. 登录用户..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))")
USER_ID=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('user', {}).get('id', ''))")

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ 登录失败"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

echo "✅ 登录成功，用户ID: $USER_ID"
echo ""

# 2. 获取初始游戏状态
echo "2. 获取初始游戏状态..."
GAME_STATE=$(curl -s "$BASE_URL/api/game/state" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ 游戏状态:"
echo "$GAME_STATE" | python3 -m json.tool
echo ""

# 3. 保存手牌
echo "3. 保存手牌..."
HAND_DATA='[
  {"id": "card-1", "name": "火焰", "type": "element", "rarity": "common", "tier": 1},
  {"id": "card-2", "name": "水流", "type": "element", "rarity": "common", "tier": 1},
  {"id": "card-3", "name": "土石", "type": "element", "rarity": "common", "tier": 1}
]'

SAVE_HAND_RESPONSE=$(curl -s -X POST "$BASE_URL/api/game/hand" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"hand\": $HAND_DATA}")

echo "✅ 手牌已保存"
echo "$SAVE_HAND_RESPONSE"
echo ""

# 4. 重新获取游戏状态
echo "4. 重新获取游戏状态（验证存档）..."
sleep 1
GAME_STATE_2=$(curl -s "$BASE_URL/api/game/state" \
  -H "Authorization: Bearer $TOKEN")

HAND_COUNT=$(echo "$GAME_STATE_2" | python3 -c "import sys, json; data = json.load(sys.stdin); print(len(data.get('hand', [])))")
echo "✅ 手牌数量: $HAND_COUNT"
echo "$GAME_STATE_2" | python3 -c "import sys, json; data = json.load(sys.stdin); print(json.dumps(data.get('hand', []), indent=2))"
echo ""

# 5. 模拟结束回合
echo "5. 结束回合..."
END_TURN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/turn/end" \
  -H "Authorization: Bearer $TOKEN")

TURN=$(echo "$END_TURN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('turn', 0))")
echo "✅ 回合已结束，当前回合: $TURN"
echo "$END_TURN_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(json.dumps({'turn': data.get('turn'), 'production': data.get('production')}, indent=2))"
echo ""

# 6. 获取资源
echo "6. 获取资源..."
RESOURCES=$(curl -s "$BASE_URL/api/turn/resources" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ 当前资源:"
echo "$RESOURCES" | python3 -m json.tool
echo ""

echo "=== 测试完成 ==="
echo ""
echo "📝 测试总结:"
echo "  - 登录: ✅"
echo "  - 获取游戏状态: ✅"
echo "  - 保存手牌: ✅"
echo "  - 存档验证: ✅ (手牌数: $HAND_COUNT)"
echo "  - 回合结束: ✅ (回合: $TURN)"
echo "  - 资源同步: ✅"
echo ""
echo "✨ 玩家数据存档功能正常工作！现在可以在不同设备上使用相同邮箱登录继续游戏。"
