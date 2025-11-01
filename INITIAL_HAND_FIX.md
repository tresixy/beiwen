# 初始手牌加载修复说明

## 问题描述

游戏进入时，初始手牌没有从数据库加载，而是使用前端硬编码的卡牌。

## 根本原因

在 `useGameSimulation.js` 中：
1. 初始化时使用 `createInitialHand()` 创建前端硬编码的手牌
2. 从服务器加载状态时，只有当 `state.hand` 存在且长度>0时才覆盖
3. 新用户的 `state.hand` 为空，导致使用了前端硬编码的卡牌

## 修复方案

### 1. 修改初始化逻辑 ✅

**文件:** `client/src/hooks/useGameSimulation.js`

**修改前:**
```javascript
const [hand, setHand] = useState(() => createInitialHand(MAX_HAND_SIZE));
```

**修改后:**
```javascript
// 使用空手牌初始化，等待从服务器加载
const [hand, setHand] = useState(() => serverSyncEnabled ? [] : createInitialHand(MAX_HAND_SIZE));
```

### 2. 添加抽牌逻辑 ✅

**文件:** `client/src/hooks/useGameSimulation.js`

在加载服务器状态时，如果手牌为空，主动从服务器抽牌：

```javascript
// 加载手牌
if (state.hand && state.hand.length > 0) {
    setHand(state.hand);
    // ... 添加到卡册
} else {
    // 手牌为空，从服务器抽取初始手牌
    try {
        const drawn = await gameStateApi.drawCards(token, MAX_HAND_SIZE);
        if (drawn.hand && drawn.hand.length > 0) {
            setHand(drawn.hand);
            // ... 添加到卡册
        }
    } catch (drawErr) {
        console.error('抽取初始手牌失败:', drawErr);
        pushMessage?.('抽牌失败，使用默认手牌', 'warning');
    }
}
```

### 3. 完善抽牌API ✅

**文件:** `server/gameplay/deckService.js`

**改进:**
- 查询时包含更多字段（`era`, `card_type`）
- 格式化返回数据，确保包含前端需要的所有字段
- 添加 `ruby` 稀有度的权重
- 改进错误提示

**返回格式:**
```javascript
{
  id: 'card-1-1234567890-0',
  name: '人',
  type: 'inspiration',
  rarity: 'common',
  era: '生存时代',
  cardType: 'inspiration',
  tier: 1,
  attrs: {},
}
```

## 数据流程

```
用户进入游戏
    ↓
检测到有 token（在线模式）
    ↓
初始化空手牌 []
    ↓
从服务器加载游戏状态
    ↓
检查 state.hand
    ├─ 有数据 → 使用服务器手牌
    └─ 无数据 → 调用 /api/deck/draw
                   ↓
              从 deck_cards 表抽牌
                   ↓
              返回已解锁的卡牌
                   ↓
              设置为初始手牌
```

## 测试步骤

### 新用户测试
1. 创建新账号（自动解锁"人"和"石头"）
2. 进入游戏
3. 检查手牌是否包含"人"和"石头"
4. 查看浏览器控制台确认日志：`Cards drawn: 人, 石头, ...`

### 现有用户测试
1. 使用已有账号登录
2. 进入游戏
3. 如果之前有保存的手牌，应该加载保存的手牌
4. 如果手牌为空，从已解锁卡牌中抽取

### 离线模式测试
1. 不提供 token
2. 进入游戏
3. 应该使用前端硬编码的初始手牌（兼容性）

## API端点

### 抽牌

```bash
GET /api/deck/draw?count=5
Authorization: Bearer <token>

Response:
{
  "hand": [
    {
      "id": "card-64-1234567890-0",
      "name": "人",
      "type": "inspiration",
      "rarity": "common",
      "era": "生存时代",
      "cardType": "inspiration",
      "tier": 1,
      "attrs": {
        "description": "文明的主体，一切创造行为的发起者。"
      }
    },
    {
      "id": "card-65-1234567890-1",
      "name": "石头",
      "type": "inspiration",
      "rarity": "common",
      "era": "生存时代",
      "cardType": "inspiration",
      "tier": 1,
      "attrs": {
        "description": "最原始的工具材料，代表坚硬与改造。"
      }
    }
  ]
}
```

## 相关问题排查

### 问题1: "No cards available"

**原因:** 用户的 `deck_cards` 表中没有已解锁的卡牌

**解决:**
```sql
-- 检查用户的卡牌
SELECT dc.*, c.name 
FROM deck_cards dc 
JOIN cards c ON dc.card_id = c.id 
WHERE dc.user_id = <USER_ID>;

-- 如果为空，重新初始化
INSERT INTO deck_cards (user_id, card_id, discovered, count)
SELECT <USER_ID>, id, TRUE, 1
FROM cards
WHERE is_starter = TRUE AND era = '生存时代';
```

### 问题2: 手牌一直是空的

**检查:**
1. 浏览器控制台是否有错误
2. Network标签检查 `/api/deck/draw` 请求
3. 检查 token 是否有效
4. 检查 `serverSyncEnabled` 是否为 true

### 问题3: 使用了前端硬编码的卡牌

**原因:** 服务器抽牌失败，回退到离线模式

**检查:**
1. 服务器日志中是否有抽牌错误
2. 数据库连接是否正常
3. `deck_cards` 表数据是否正确

## 文件清单

### 修改的文件
- `client/src/hooks/useGameSimulation.js` - 初始化和抽牌逻辑
- `server/gameplay/deckService.js` - 抽牌API改进

### 相关文件
- `server/routes/deck.js` - 抽牌路由
- `client/src/services/gameStateApi.js` - API客户端
- `server/services/authService.js` - 用户注册初始化

### 新增文件
- `INITIAL_HAND_FIX.md` - 本文档

## 总结

✅ 修复了初始手牌不从数据库加载的问题  
✅ 新用户进入游戏会从已解锁卡牌中抽取手牌  
✅ 改进了抽牌API的数据格式  
✅ 保留了离线模式的兼容性  

现在游戏会正确使用数据库中的卡牌，而不是前端硬编码的卡牌。

