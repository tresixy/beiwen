# 游戏存档系统

## 功能概述

实现了完整的游戏进度保存/不保存退出功能，用户可以选择是否保留当前进度。

---

## 核心功能

### 1. ESC菜单存档对话框

按ESC或点击"返回主页"时，会弹出存档确认对话框：

```
💾 是否保存游戏进度？

保存：下次进入时继续当前进度
不保存：下次进入时重新开始

[💾 保存并退出]  [🚫 不保存退出]  [← 取消]
```

- **保存并退出**: 保存手牌和游戏状态，下次进入继续当前进度
- **不保存退出**: 清空手牌，下次进入重新抽5张卡
- **取消**: 返回游戏，不退出

### 2. 画布卡牌限制

- **最大数量**: 10张卡牌
- **超出处理**: 提示"画布已满，最多可以放置10张卡牌"
- **拖拽验证**: 拖动第11张卡到画布时被拒绝

### 3. 手牌自动补充

- **初始手牌**: 进入游戏时自动发放5张卡
- **手牌为空**: 服务器没有保存手牌时，自动抽5张
- **补牌功能**: 提供`fillHandToMax()`函数可手动补满到5张

### 4. 保存/加载逻辑

#### 保存退出
```javascript
// 1. 用户选择"保存并退出"
await saveHandToServer(); // 保存当前手牌
pushMessage('游戏已保存', 'success');
// 2. 返回大厅
onBackLobby();
```

#### 不保存退出
```javascript
// 1. 用户选择"不保存退出"
await clearHandFromServer(); // 清空手牌（设为空数组）
pushMessage('已退出，下次将重新开始', 'info');
// 2. 返回大厅
onBackLobby();
```

#### 重新进入游戏
```javascript
// 1. 加载游戏状态
const state = await gameStateApi.getGameState(token);

// 2. 检查手牌
if (state.hand && state.hand.length > 0) {
    // 有保存的手牌，加载它们
    setHand(state.hand);
} else {
    // 手牌为空，重新抽5张
    const drawn = await gameStateApi.drawCards(token, 5);
    setHand(drawn.hand);
}
```

---

## 技术实现

### 文件修改

1. **EscMenu.jsx** - ESC菜单组件
   - 添加存档对话框状态
   - 三个按钮：保存/不保存/取消
   - 条件渲染：常规菜单 ↔ 存档对话框

2. **GameShell.jsx** - 游戏主容器
   - 添加`handleSaveAndExit`处理函数
   - 调用`saveHandToServer`或`clearHandFromServer`
   - 传递`onSaveAndExit`回调给EscMenu

3. **useGameSimulation.js** - 游戏逻辑Hook
   - `MAX_STAGED_CARDS = 10` - 画布最大卡牌数
   - `MAX_HAND_SIZE = 5` - 手牌最大数量
   - `stageCard()` - 添加画布数量检查
   - `saveHandToServer()` - 保存手牌到服务器
   - `clearHandFromServer()` - 清空手牌（保存空数组）
   - `fillHandToMax()` - 自动补牌到5张
   - `loadServerState()` - 加载时自动抽卡（如果手牌为空）

4. **app.css** - 样式文件
   - `.save-dialog` - 对话框容器
   - `.save-dialog-hint` - 提示文本
   - `.save-btn` - 保存按钮（绿色）
   - `.danger-btn` - 不保存按钮（红色）
   - `.cancel-btn` - 取消按钮（灰色）

---

## API接口

### 保存手牌
```
POST /api/game/hand
Authorization: Bearer {token}

{
  "hand": [...]  // 卡牌数组，空数组表示清空
}
```

### 获取游戏状态
```
GET /api/game/state
Authorization: Bearer {token}

Response:
{
  "hand": [...],  // 如果为空，客户端自动抽卡
  "resources": {...},
  "era": "生存时代",
  "activeEvent": {...}
}
```

### 抽卡
```
GET /api/deck/draw?count=5
Authorization: Bearer {token}

Response:
{
  "hand": [
    {"id": "card-1", "name": "人", ...},
    {"id": "card-2", "name": "石头", ...},
    ...
  ]
}
```

---

## 使用流程

### 场景1：正常游戏流程

```
1. 用户登录
   ↓
2. 进入游戏（自动加载状态）
   - 如果有保存的手牌 → 加载手牌
   - 如果手牌为空 → 自动抽5张
   ↓
3. 游戏中
   - 手牌最多5张
   - 画布最多10张卡
   ↓
4. 按ESC退出
   - 选择"保存并退出" → 保存当前手牌
   - 选择"不保存退出" → 清空手牌
   ↓
5. 下次进入
   - 如果保存了 → 继续上次的手牌
   - 如果没保存 → 重新抽5张卡
```

### 场景2：多次进出游戏

#### 第一次进入（新账号）
```
1. 登录 → 手牌为空
2. 自动抽5张：[人, 人, 石头, 木头, 水]
3. 玩家合成了一些卡
4. 不保存退出 → 手牌清空
```

#### 第二次进入
```
1. 登录 → 手牌为空
2. 自动抽5张：[石头, 石头, 水, 土地, 种子]
3. 全新的开始
```

#### 第三次进入（保存了）
```
1. 玩家有手牌：[人, 木头, 火]
2. 保存并退出
3. 下次登录 → 继续这3张卡
4. 可以补牌到5张
```

---

## 常量配置

```javascript
// useGameSimulation.js
const MAX_HAND_SIZE = 5;          // 手牌最大数量
const MAX_STAGED_CARDS = 10;       // 画布最大卡牌数量
const SAVE_HAND_DEBOUNCE_MS = 3000; // 自动保存延迟
```

---

## 状态管理

### 本地状态
- `hand` - 当前手牌数组
- `selectedIds` - 画布上的卡牌ID数组
- `stagedPositions` - 画布卡牌位置

### 服务器状态
- `user_game_state.hand_json` - 保存的手牌（JSON数组）
- 清空时设为 `[]`

---

## 测试要点

### 功能测试

1. **ESC菜单测试**
   - [ ] 按ESC显示菜单
   - [ ] 点击"返回主页"显示存档对话框
   - [ ] 三个按钮都能正常工作
   - [ ] 点击外部区域关闭菜单

2. **保存退出测试**
   - [ ] 选择"保存并退出"
   - [ ] 显示"游戏已保存"提示
   - [ ] 返回大厅
   - [ ] 重新进入，手牌保留

3. **不保存退出测试**
   - [ ] 选择"不保存退出"
   - [ ] 显示"已退出，下次将重新开始"
   - [ ] 返回大厅
   - [ ] 重新进入，手牌重新抽取（5张新卡）

4. **画布限制测试**
   - [ ] 拖动10张卡到画布
   - [ ] 第11张卡被拒绝
   - [ ] 显示"画布已满"提示

5. **自动抽卡测试**
   - [ ] 新账号进入自动抽5张
   - [ ] 不保存退出后重新抽5张
   - [ ] 手牌不足5张可以补牌

### 边界测试

- [ ] 手牌为空时加载
- [ ] 手牌5张时不能继续抽卡
- [ ] 画布10张时不能继续放卡
- [ ] 连续多次"不保存退出"
- [ ] 网络错误时的降级处理

### UI测试

- [ ] 存档对话框样式正确
- [ ] 按钮颜色区分明显（绿/红/灰）
- [ ] 提示文本清晰易读
- [ ] 移动端适配正常

---

## 常见问题

### Q1: 为什么退出后手牌还在？
**原因**: 可能选择了"保存并退出"
**解决**: 重新进入，选择"不保存退出"

### Q2: 画布放不下第11张卡？
**原因**: 这是设计限制，画布最多10张卡
**解决**: 先合成或移除一些卡，再放新卡

### Q3: 手牌为什么只有3张？
**原因**: 可能是上次保存时只有3张
**解决**: 使用抽卡功能补充到5张

### Q4: 不保存退出后，下次手牌和上次一样？
**原因**: 服务器可能没有正确清空
**检查**: 
```sql
SELECT hand_json FROM user_game_state WHERE user_id = ?;
-- 应该是 []
```

---

## 数据库查询

### 查看用户手牌
```sql
SELECT 
    user_id,
    jsonb_array_length(hand_json) as hand_size,
    hand_json
FROM user_game_state
WHERE user_id = 2;
```

### 清空所有手牌（调试用）
```sql
UPDATE user_game_state 
SET hand_json = '[]'::jsonb
WHERE user_id = 2;
```

### 查看用户卡组
```sql
SELECT 
    c.name,
    dc.count,
    c.card_type
FROM deck_cards dc
JOIN cards c ON dc.card_id = c.id
WHERE dc.user_id = 2 
  AND dc.discovered = true
ORDER BY c.name;
```

---

## 总结

### 已实现功能

✅ ESC菜单存档对话框  
✅ 保存/不保存退出逻辑  
✅ 画布最多10张卡限制  
✅ 手牌自动补充到5张  
✅ 手牌为空时自动抽卡  
✅ 服务器状态同步  

### 用户体验

- **清晰的选择**: 明确告知保存/不保存的后果
- **友好的提示**: 操作后显示成功/失败消息
- **合理的限制**: 画布10张、手牌5张
- **自动化处理**: 手牌为空自动抽卡

### 技术亮点

- **状态管理**: 前端+服务器双层状态
- **错误处理**: 网络失败时的降级逻辑
- **防抖处理**: 避免频繁保存请求
- **异步流程**: async/await清晰的异步逻辑

**功能已全部实现并可用！**

