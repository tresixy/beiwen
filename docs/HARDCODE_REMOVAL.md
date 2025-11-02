# 硬编码卡牌数据移除说明

## 概述

完全移除前端硬编码的卡牌数据，所有卡牌相关操作必须通过服务器API进行。

---

## 修改内容

### 1. 移除离线模式逻辑 ✅

**文件:** `client/src/hooks/useGameSimulation.js`

#### 初始化
**修改前:**
```javascript
const [hand, setHand] = useState(() => 
  serverSyncEnabled ? [] : createInitialHand(MAX_HAND_SIZE)
);
```

**修改后:**
```javascript
const [hand, setHand] = useState([]);
```

#### ensureHandSize（合成后补牌）
- 移除离线模式的 `createCard()` 随机生成
- 只保留服务器抽牌逻辑
- 无token时直接返回错误

#### drawCards（抽牌）
- 移除离线模式的随机生成
- 只保留服务器API调用
- 无token时提示登录

### 2. 废弃前端卡牌常量 ✅

**文件:** `client/src/data/cards.js`

**删除的常量:**
- `STARTER_CARDS` - 前端硬编码的起始卡
- `SURVIVAL_ERA_CARDS` - 前端硬编码的生存时代卡池
- `BASIC_ELEMENTS` - 基础元素定义

**废弃的函数:**
- `createInitialHand()` - 返回空数组并打印错误
- `getCardsByEra()` - 返回空数组并打印错误
- `getStarterCards()` - 返回空数组并打印错误

### 3. 强制要求登录 ✅

所有卡牌操作现在都需要：
- 有效的 `token`
- 否则返回错误提示：`请先登录`

---

## 数据流程

### 新用户流程

```
注册账号
    ↓
数据库插入起始卡（人、石头）到 deck_cards
    ↓
登录获取 token
    ↓
进入游戏 → 手牌初始化为 []
    ↓
加载服务器状态
    ├─ state.hand 有数据 → 使用
    └─ state.hand 无数据 → 调用 /api/deck/draw?count=5
                              ↓
                         从 deck_cards 抽取
                              ↓
                         返回并显示手牌
```

### 合成后补牌流程

```
合成成功 → 手牌减少
    ↓
调用 ensureHandSize(newHand)
    ↓
检查是否需要补牌
    ├─ 满手牌 → 直接返回
    └─ 不足5张 → 调用 /api/deck/draw
                     ↓
                从数据库抽牌
                     ↓
                补齐手牌
```

### 主动抽牌流程

```
用户点击抽牌按钮
    ↓
调用 drawCards(count)
    ↓
检查 token
    ├─ 无token → 提示"请先登录"
    └─ 有token → 调用 /api/deck/draw?count=N
                     ↓
                从数据库抽牌
                     ↓
                添加到手牌
```

---

## API依赖

### 必需的API端点

| 端点 | 用途 | 返回 |
|------|------|------|
| `POST /api/auth/register` | 注册并初始化卡牌 | user, token |
| `POST /api/auth/login` | 登录获取token | user, token |
| `GET /api/deck/draw?count=N` | 抽牌 | { hand: [...] } |
| `GET /api/deck/state` | 获取卡册状态 | { cards: [...] } |
| `GET /api/game/state` | 获取游戏状态 | { hand, resources, ... } |

---

## 错误处理

### 无token错误

```javascript
if (!token) {
    console.error('需要登录才能抽牌');
    pushMessage?.('请先登录', 'error');
    return;
}
```

### 抽牌失败错误

```javascript
catch (err) {
    console.error('从服务器抽牌失败:', err);
    pushMessage?.(`抽牌失败: ${err.message}`, 'error');
}
```

### 无卡可抽错误

服务器返回：`没有可用的卡牌，请先解锁一些卡牌`

---

## 测试要点

### 必须测试

- [ ] 未登录状态下无法进入游戏
- [ ] 新用户注册后有2张起始卡（人、石头）
- [ ] 进入游戏后手牌从数据库加载
- [ ] 合成后自动从数据库补牌
- [ ] 手动抽牌从数据库获取
- [ ] 无网络连接时显示错误提示
- [ ] token过期时提示重新登录

### 不应该出现

- [ ] 控制台出现 `createInitialHand` 被调用
- [ ] 控制台出现 `getCardsByEra` 被调用
- [ ] 控制台出现 `getStarterCards` 被调用
- [ ] 前端生成随机卡牌名称（如"哲学·思想碎片"）
- [ ] 离线模式工作

---

## 相关文件

### 修改的文件
- `client/src/hooks/useGameSimulation.js` - 移除离线逻辑
- `client/src/data/cards.js` - 废弃硬编码数据

### 依赖的文件
- `server/services/authService.js` - 注册时初始化卡牌
- `server/gameplay/deckService.js` - 抽牌逻辑
- `server/routes/deck.js` - 抽牌API
- `client/src/services/gameStateApi.js` - API客户端

### 新增文件
- `HARDCODE_REMOVAL.md` - 本文档

---

## 向后兼容性

### ⚠️ 破坏性变更

以下功能不再支持：
- ❌ 离线模式（无token游玩）
- ❌ 前端随机生成卡牌
- ❌ 硬编码的初始手牌

### 迁移指南

如果之前有使用离线模式的代码：
1. 移除所有不带token的调用
2. 确保所有组件都接收 `token` prop
3. 添加登录检查逻辑
4. 处理token过期的情况

---

## 优势

### ✅ 数据一致性
- 所有卡牌数据来自数据库单一数据源
- 前后端数据完全同步
- 不存在前后端不一致的问题

### ✅ 安全性
- 无法通过前端作弊生成卡牌
- 所有卡牌操作都经过服务器验证
- 卡牌数据完全由后端控制

### ✅ 可维护性
- 卡牌数据只需在数据库维护
- 不需要同时更新前后端
- 新增卡牌只需SQL插入

### ✅ 扩展性
- 方便实现跨设备同步
- 支持实时数据更新
- 可以实现服务器事件通知

---

## 总结

✅ 完全移除前端硬编码卡牌数据  
✅ 所有卡牌操作必须通过服务器API  
✅ 强制要求用户登录才能游玩  
✅ 提高了数据一致性和安全性  
✅ 简化了维护和扩展

游戏现在是完全的在线游戏，必须连接服务器才能运行。

