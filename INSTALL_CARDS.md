# 卡牌系统安装指南

## 概述

本指南介绍如何安装和配置新的卡牌系统，包括所有7个时代的完整卡牌定义和合成规则。

## 安装步骤

### 1. 数据库迁移

运行数据库迁移脚本，创建新的卡牌数据：

```bash
cd server
node db/run-migration-cards.js
```

这将：
- 为 `cards` 表添加新字段（era, card_type, unlock_condition 等）
- 插入所有时代的卡牌数据（共70+张卡牌）
- 创建必要的索引

### 2. 验证数据

检查卡牌是否正确插入：

```bash
psql -d minigame_db -c "SELECT era, card_type, COUNT(*) FROM cards GROUP BY era, card_type ORDER BY era, card_type;"
```

预期输出应显示每个时代的卡牌数量：

```
      era       | card_type  | count 
----------------+------------+-------
 生存时代       | key        |     3
 生存时代       | inspiration|     8
 生存时代       | reward     |     3
 城邦时代       | key        |     3
 城邦时代       | inspiration|     4
 城邦时代       | reward     |     3
 ...
```

### 3. 测试 API

启动服务器后测试卡牌 API：

```bash
# 获取所有卡牌
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/cards/all

# 获取生存时代卡牌
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/cards/era/生存时代

# 获取起始卡牌
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/cards/starter

# 获取用户已解锁的卡牌
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/cards/unlocked
```

## 新增功能

### 1. 卡牌配置（`server/config/cardConfig.js`）

定义了所有时代的卡牌：
- **钥匙卡**：解决困境的关键卡牌
- **灵感卡**：各时代的基础卡牌池
- **奖励卡**：通关 event 后解锁

### 2. 合成规则（`server/config/synthesisRules.js`）

定义了各时代关键卡牌的合成配方：
- 生存时代：火、农业、律法
- 城邦时代：文字、货币、城防
- 分野时代：官僚体系、宗教
- 帝国时代：道路、史诗、远洋航行
- 理性时代：印刷术、启蒙思想、蒸汽机
- 信仰时代：圣典、艺术、教权
- 启蒙时代：科学方法、人权宣言、电力

### 3. 卡牌服务（`server/services/cardService.js`）

提供卡牌管理功能：
- `getAllCards()` - 获取所有卡牌
- `getCardsByEraFromDB(eraName)` - 获取指定时代的卡牌
- `getUserUnlockedCards(userId)` - 获取用户已解锁的卡牌
- `unlockCard(userId, cardName)` - 解锁卡牌
- `checkAndUnlockRewardCards(userId, eventName)` - 完成 event 后自动解锁奖励卡

### 4. 卡牌路由（`server/routes/cards.js`）

新增 API 端点：
- `GET /api/cards/all` - 获取所有卡牌（图鉴）
- `GET /api/cards/era/:eraName` - 获取指定时代的卡牌
- `GET /api/cards/starter` - 获取起始卡牌
- `GET /api/cards/unlocked` - 获取用户已解锁的卡牌
- `GET /api/cards/:cardName` - 获取卡牌详情

### 5. 合成规则集成

更新了 `server/rules/customRules.js`，现在会：
1. 优先检查时代卡牌合成规则
2. 如果没有匹配，再检查旧的自定义规则

### 6. Event 系统集成

更新了 `server/services/eventService.js`，完成 event 时会自动解锁对应的奖励卡牌。

## 卡牌体系

### 生存时代
- **起始卡**：人、石头
- **初始池**：水、木头、土地、种子、冲突、风（迷惑）
- **钥匙卡**：火、农业、律法
- **奖励卡**：智慧、部落、价值

### 城邦时代
- **初始池**：劳力、矿石、符号、信仰（迷惑）
- **钥匙卡**：文字、货币、城防
- **奖励卡**：知识、财富、权力

### 分野时代（分支）
- **初始池**：秩序、虔诚、仪式、等级、欲望（迷惑）
- **钥匙卡**：官僚体系（秩序路线）、宗教（信仰路线）
- **奖励卡**：统治（→帝国时代）、神权（→信仰时代）

### 帝国时代
- **初始池**：军团、工程、疆域、征服、荣耀、和平（迷惑）
- **钥匙卡**：道路、史诗、远洋航行
- **奖励卡**：秩序、认同、探索

### 理性时代
- **初始池**：技艺、机械、理性、观察、传统（迷惑）
- **钥匙卡**：印刷术、启蒙思想、蒸汽机
- **奖励卡**：传播、平等、效率

### 信仰时代
- **初始池**：经文、圣物、布道、神迹、怀疑（迷惑）
- **钥匙卡**：圣典、艺术、教权
- **奖励卡**：正统、感召、裁决

### 启蒙时代
- **初始池**：实验、逻辑、自然法则、自由、革命、秩序（迷惑）
- **钥匙卡**：科学方法、人权宣言、电力
- **奖励卡**：真理、民主、能量

## 合成示例

### 生存时代
```
木头 + 石头 → 火
种子 + 土地 → 农业
冲突 + 智慧 → 律法
```

### 城邦时代
```
符号 + 知识 → 文字
矿石 + 价值 → 货币
劳力 + 矿石 → 城防
```

### 启蒙时代
```
实验 + 逻辑 → 科学方法
自由 + 平等 → 人权宣言
自然法则 + 实验 → 电力
```

## 数据库结构

### cards 表新增字段

```sql
era VARCHAR(50)                 -- 所属时代
card_type VARCHAR(20)           -- 卡牌类型：key/inspiration/reward
unlock_condition VARCHAR(100)   -- 解锁条件（event名称或分支）
is_starter BOOLEAN              -- 是否为起始卡
is_decoy BOOLEAN                -- 是否为迷惑卡
```

### deck_cards 表

用于记录玩家已解锁的卡牌：
- `discovered` - 是否已发现
- `count` - 获得次数

## 前端集成

前端需要更新以使用新的卡牌 API：

```javascript
// 获取当前时代可用卡牌
const response = await fetch(`/api/cards/era/${currentEra}`, {
  headers: { Authorization: `Bearer ${token}` }
});
const { cards } = await response.json();

// 获取用户已解锁的卡牌
const unlockedResponse = await fetch('/api/cards/unlocked', {
  headers: { Authorization: `Bearer ${token}` }
});
const { cards: unlockedCards } = await unlockedResponse.json();
```

## 注意事项

1. **迷惑卡**：每个时代都有迷惑卡（is_decoy=true），它们不能直接用于合成钥匙卡
2. **分支系统**：分野时代有两个钥匙卡，选择不同的钥匙会进入不同的后续时代
3. **自动解锁**：完成 event 后会自动解锁对应的奖励卡牌
4. **合成优先级**：系统会优先使用时代卡牌合成规则，找不到才使用AI合成

## 故障排除

### 问题：卡牌未正确插入

检查数据库连接和权限：
```bash
psql -d minigame_db -c "\d cards"
```

### 问题：合成规则不工作

确认 `customRules.js` 已导入 `synthesisRules.js`：
```javascript
import { findSynthesisRule } from '../config/synthesisRules.js';
```

### 问题：前端看不到新卡牌

1. 检查服务器日志确认路由已注册
2. 验证 token 有效性
3. 检查浏览器控制台的网络请求

## 下一步

- [ ] 实现前端卡牌图鉴界面
- [ ] 添加卡牌获取动画
- [ ] 实现卡牌提示和教程
- [ ] 添加卡牌成就系统

