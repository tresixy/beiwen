# 抽牌规则修复说明

## 问题

之前的抽牌逻辑从所有已解锁卡牌中抽取，包括钥匙卡。

这违反了 `game_design.md` 的核心规则。

---

## game_design.md 的规则

### 手牌组成
> "玩家可以通过合成手牌来解决events"

**含义:** 
- 手牌用于合成
- 手牌应该是灵感卡（inspiration）

### 卡牌分类

1. **灵感卡 (inspiration)** - 白色 common
   - 用于合成的基础材料
   - 例如：人、石头、水、木头、土地、种子、冲突、风
   
2. **钥匙卡 (key)** - 红色 ruby
   - 通过合成灵感卡获得
   - 用于解决events
   - 例如：火、农业、律法、文字、货币、城防
   
3. **生成卡** - 蓝色 rare
   - AI合成生成的卡
   - 中间产物或副产品

### 游戏流程

```
抽取灵感卡（手牌）
    ↓
合成灵感卡
    ↓
获得钥匙卡或生成卡
    ↓
使用钥匙卡解决event
```

---

## 修复内容

### 1. 修改抽牌逻辑 ✅

**文件:** `server/gameplay/deckService.js`

**修改前:**
```sql
SELECT ... FROM deck_cards dc
WHERE dc.user_id = $1 
  AND dc.discovered = true 
  AND dc.count > 0
```

**修改后:**
```sql
SELECT ... FROM deck_cards dc
WHERE dc.user_id = $1 
  AND dc.discovered = true 
  AND dc.count > 0
  AND c.card_type = 'inspiration'  -- 只抽取灵感卡
```

### 2. 更新错误提示 ✅

**修改前:** "没有可用的卡牌"
**修改后:** "没有可用的灵感卡"

### 3. 更新日志 ✅

```javascript
logger.warn({ userId }, 'No inspiration cards available for drawing');
```

---

## 卡牌获取途径

### 灵感卡
- ✅ 注册时获得：人、石头
- ✅ 时代升级解锁：该时代的灵感卡池
- ✅ 抽牌获得：从已解锁的灵感卡中随机抽取

### 钥匙卡
- ❌ **不能通过抽牌获得**
- ✅ 通过合成灵感卡获得
- ✅ 需要特定的合成配方
- 例如：人 + 石头 + 木头 → 火

### 生成卡
- ❌ **不能通过抽牌获得**
- ✅ 通过AI合成生成
- ✅ 自动加入卡册

---

## 数据库检查

### 检查灵感卡

```sql
SELECT name, rarity, card_type, is_starter, era
FROM cards
WHERE card_type = 'inspiration'
ORDER BY era, name;
```

**应该包括:**
- 生存时代：人、石头、水、木头、土地、种子、冲突、风
- 城邦时代：劳力、矿石、符号、信仰（迷惑卡）
- 等等...

### 检查钥匙卡

```sql
SELECT name, rarity, card_type, unlock_condition
FROM cards
WHERE card_type = 'key'
ORDER BY era, name;
```

**应该包括:**
- 生存时代：火、农业、律法
- 城邦时代：文字、货币、城防
- 等等...

### 检查用户初始卡牌

```sql
SELECT c.name, c.card_type, c.rarity, dc.count
FROM deck_cards dc
JOIN cards c ON dc.card_id = c.id
WHERE dc.user_id = <USER_ID>
  AND dc.discovered = TRUE;
```

**新用户应该只有:**
- 人 (inspiration, common)
- 石头 (inspiration, common)

---

## 游戏流程示例

### 生存时代 - 寒冷事件

1. **进入游戏**
   - 手牌：人、石头、水、木头、土地
   - Event：【寒冷】需要【火】

2. **合成获得钥匙卡**
   - 拖入：人 + 石头 到熔炉
   - AI合成：尝试各种组合
   - 获得：【火】（钥匙卡，红色）

3. **解决事件**
   - 拖入：【火】到【寒冷】
   - 完成事件
   - 奖励：篝火标志 + 地块高亮

4. **继续游戏**
   - 手牌自动补充灵感卡
   - 进入下一个事件

---

## API行为

### GET /api/deck/draw?count=5

**返回:**
```json
{
  "hand": [
    {
      "id": "card-64-1234567890-0",
      "name": "人",
      "type": "inspiration",
      "rarity": "common",
      "cardType": "inspiration",
      "era": "生存时代"
    },
    {
      "id": "card-65-1234567890-1",
      "name": "石头",
      "type": "inspiration",
      "rarity": "common",
      "cardType": "inspiration",
      "era": "生存时代"
    }
  ]
}
```

**不会返回:**
- ❌ 钥匙卡（火、农业、律法...）
- ❌ 奖励卡（智慧、部落、价值...）

---

## 测试清单

### 抽牌测试
- [ ] 新用户抽牌只得到灵感卡
- [ ] 抽牌结果不包含钥匙卡
- [ ] 抽牌结果不包含奖励卡
- [ ] 解锁新时代后抽到该时代的灵感卡

### 合成测试
- [ ] 合成灵感卡可以得到钥匙卡
- [ ] 钥匙卡显示为红色
- [ ] 钥匙卡不会被抽到手牌中

### 卡册测试
- [ ] 卡册显示所有已获得的卡
- [ ] 包括灵感卡、钥匙卡、生成卡
- [ ] 按类型和稀有度正确分类

---

## 总结

✅ 抽牌只获取灵感卡（card_type = 'inspiration'）  
✅ 钥匙卡通过合成获得  
✅ 符合游戏设计文档的核心玩法  
✅ 手牌用于合成，钥匙卡用于解决events  

现在游戏流程正确：抽灵感卡 → 合成获得钥匙卡 → 使用钥匙卡解决events

