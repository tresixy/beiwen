# 卡册系统更新说明

## 修改概述

根据用户需求，对卡册（背包）系统进行了以下调整：

1. **初始状态调整**: 新用户背包初始只有生存时代的起始卡（人、石头）
2. **分页布局优化**: 每页显示9张卡（3x3布局），符合书本样式
3. **服务器同步**: 从服务器加载真实的卡册数据

---

## 修改内容

### 1. 用户注册初始化 ✅

**文件:** `server/services/authService.js`

**修改前:**
- 注册时解锁前7张卡牌

**修改后:**
- 只解锁生存时代的起始卡（`is_starter = TRUE` 且 `era = '生存时代'`）
- 即：人、石头

```javascript
// 初始化生存时代的起始卡（人、石头）
const starterCards = await pool.query(
  `SELECT id, name FROM cards 
   WHERE is_starter = TRUE AND era = '生存时代' 
   ORDER BY id`
);
```

### 2. 卡册分页调整 ✅

**文件:** `client/src/components/game/CardBookPanel.jsx`

**修改:**
- `CARDS_PER_PAGE`: 6 → 9

### 3. CSS布局优化 ✅

**文件:** `client/src/styles/app.css`

**修改:**
```css
.book-card-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);  /* 原来是 2列，现在是 3列 */
    gap: 12px;
}
```

**效果:**
- 3x3 布局，每页正好9张卡
- 左右翻页查看更多卡牌
- 更符合书本样式

### 4. 服务器同步 ✅

**新增文件:** `client/src/api/deckApi.js`

**功能:**
- `getDeckState(token)` - 获取用户已解锁的卡牌
- `drawCards(token, count)` - 抽牌

**修改文件:** `client/src/components/lobby/Lobby.jsx`

**实现:**
- 登录后自动从服务器加载卡册
- 转换为前端cardBook格式
- 保存到localStorage以便离线访问

```javascript
// 从服务器同步卡册
getDeckState(token)
  .then((deckData) => {
    const serverCardBook = {
      cards: deckData.cards
        .filter(card => card.discovered && card.count > 0)
        .map(card => ({
          name: card.name,
          type: card.type,
          rarity: card.rarity,
          count: card.count,
        })),
      totalCollected: cards.reduce((sum, card) => sum + card.count, 0),
    };
    persistCardBook(serverCardBook);
  });
```

---

## 卡牌解锁机制

### 初始卡牌
新用户注册时获得：
- 人（灵感卡，起始卡）
- 石头（灵感卡，起始卡）

### 解锁途径

1. **合成解锁**: 通过AI合成创造新卡牌
2. **事件奖励**: 完成events解锁奖励卡
   - 完成【寒冷】→ 解锁【智慧】
   - 完成【饥饿】→ 解锁【部落】
   - 完成【纷争】→ 解锁【价值】
3. **时代升级**: 进入新时代解锁该时代的灵感卡
   - 进入城邦时代 → 解锁劳力、矿石、符号等

---

## 数据流程

```
用户注册
    ↓
数据库初始化: 插入起始卡到 deck_cards
    ↓
登录进入Lobby
    ↓
调用 /api/deck/state
    ↓
获取 deck_cards 数据
    ↓
转换为 cardBook 格式
    ↓
保存到 localStorage + 更新状态
    ↓
打开卡册看到起始卡（人、石头）
```

---

## 测试要点

### 新用户测试
- [ ] 注册新账号
- [ ] 进入Lobby打开背包
- [ ] 确认只有2张卡：人、石头
- [ ] 确认卡册显示 "收藏种类: 2"

### 卡牌解锁测试
- [ ] 合成新卡后背包增加
- [ ] 完成event后解锁奖励卡
- [ ] 进入新时代后解锁时代卡
- [ ] 刷新页面后卡牌数据保持

### 分页测试
- [ ] 解锁9张卡时显示满页（3x3）
- [ ] 解锁10张卡时出现第2页
- [ ] 翻页功能正常
- [ ] 每页正好9张卡

### 布局测试
- [ ] 卡册左页显示统计和筛选
- [ ] 卡册右页显示3x3卡牌网格
- [ ] 卡牌大小和间距合理
- [ ] 移动端显示正常

---

## API端点

### 获取卡册状态

```bash
GET /api/deck/state
Authorization: Bearer <token>

Response:
{
  "cards": [
    {
      "id": 1,
      "name": "人",
      "type": "inspiration",
      "rarity": "common",
      "discovered": true,
      "count": 1
    },
    {
      "id": 2,
      "name": "石头",
      "type": "inspiration",
      "rarity": "common",
      "discovered": true,
      "count": 1
    }
  ],
  "totalDiscovered": 2,
  "totalCards": 2
}
```

---

## 数据库要求

确保数据库中的卡牌已正确标记：

```sql
-- 检查起始卡
SELECT id, name, era, is_starter 
FROM cards 
WHERE is_starter = TRUE AND era = '生存时代';

-- 应该返回：
-- | id | name | era      | is_starter |
-- |----|------|----------|------------|
-- | 64 | 人   | 生存时代  | TRUE       |
-- | 65 | 石头 | 生存时代  | TRUE       |
```

如果数据不正确，运行：

```sql
-- 确保起始卡正确标记
UPDATE cards 
SET is_starter = TRUE 
WHERE name IN ('人', '石头') AND era = '生存时代';
```

---

## 兼容性说明

### 现有用户
已注册用户的卡册不受影响，保持现有的解锁状态。

### 离线模式
不使用token的离线模式仍然会创建初始手牌，但不会影响在线用户。

---

## 文件清单

### 修改的文件
- `server/services/authService.js` - 用户注册初始化
- `client/src/components/game/CardBookPanel.jsx` - 分页数量
- `client/src/styles/app.css` - 3x3布局
- `client/src/components/lobby/Lobby.jsx` - 服务器同步

### 新增的文件
- `client/src/api/deckApi.js` - 卡册API客户端
- `CARDBOOK_UPDATE.md` - 本文档

---

## 后续优化建议

1. **实时同步**: 合成新卡后立即同步到卡册
2. **卡牌详情**: 点击卡牌显示详细信息（描述、获得时间等）
3. **搜索功能**: 按名称或类型搜索卡牌
4. **排序选项**: 按获得时间、稀有度、名称排序
5. **统计数据**: 显示各时代、各类型的卡牌数量
6. **成就系统**: 收集全部某个时代的卡牌获得成就

---

## 总结

✅ 新用户背包初始只有2张起始卡（人、石头）  
✅ 卡册布局改为3x3，每页9张卡  
✅ 与服务器真实数据同步  
✅ 随合成和时代升级逐渐解锁新卡  
✅ 符合书本翻页样式

系统已具备完整的卡牌收集和展示功能，随着游戏进程自然扩展卡册内容。

