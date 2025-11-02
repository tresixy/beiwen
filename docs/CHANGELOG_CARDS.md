# 卡牌系统更新日志

## 版本 v2.0.0 - 2025-11-01

### 🎯 新功能概述

完整实现了7个时代的卡牌系统，包含70+张卡牌，覆盖所有时代的困境解决方案。

### 📦 新增文件

**后端配置**
- `server/config/cardConfig.js` - 完整卡牌定义配置（70+张卡牌）
- `server/config/synthesisRules.js` - 时代卡牌合成规则（50+条规则）
- `server/services/cardService.js` - 卡牌业务逻辑服务
- `server/routes/cards.js` - 卡牌 API 路由

**数据库**
- `server/db/init-cards-v2.sql` - 完整卡牌数据库初始化脚本
- `server/db/run-migration-cards.js` - 数据库迁移执行脚本

**文档**
- `INSTALL_CARDS.md` - 详细安装和使用指南
- `CHANGELOG_CARDS.md` - 本更新日志
- `cards.md` - 更新为完整卡牌设定文档

### 🔧 修改的文件

**后端**
- `server/rules/customRules.js` - 集成时代卡牌合成规则
- `server/services/eventService.js` - 添加完成 event 时自动解锁奖励卡
- `server/index.js` - 注册卡牌路由

**前端**
- `client/src/data/cards.js` - 更新为使用新的卡牌配置

### 🗄️ 数据库变更

#### cards 表新增字段
```sql
era VARCHAR(50)                 -- 卡牌所属时代
card_type VARCHAR(20)           -- 卡牌类型：key/inspiration/reward
unlock_condition VARCHAR(100)   -- 解锁条件
is_starter BOOLEAN              -- 是否为起始卡
is_decoy BOOLEAN                -- 是否为迷惑卡
```

#### 新增索引
```sql
CREATE INDEX idx_cards_era ON cards(era);
CREATE INDEX idx_cards_type ON cards(card_type);
CREATE INDEX idx_cards_starter ON cards(is_starter);
```

### 📊 卡牌统计

#### 按时代分布
| 时代 | 钥匙卡 | 灵感卡 | 奖励卡 | 总计 |
|------|--------|--------|--------|------|
| 生存时代 | 3 | 8 | 3 | 14 |
| 城邦时代 | 3 | 4 | 3 | 10 |
| 分野时代 | 2 | 5 | 2 | 9 |
| 帝国时代 | 3 | 6 | 3 | 12 |
| 理性时代 | 3 | 5 | 3 | 11 |
| 信仰时代 | 3 | 5 | 3 | 11 |
| 启蒙时代 | 3 | 6 | 3 | 12 |
| **总计** | **20** | **39** | **20** | **79** |

#### 卡牌类型说明
- **钥匙卡（20张）**：解决时代困境的核心卡牌，通过合成获得
- **灵感卡（39张）**：各时代的基础卡牌池，用于合成钥匙卡
- **奖励卡（20张）**：通关 event 后自动解锁的高级卡牌
- **起始卡（2张）**：游戏开始时持有（人、石头）
- **迷惑卡（7张）**：每个时代都有，增加解谜难度

### 🔑 核心卡牌示例

#### 生存时代
```
木头 + 石头 → 火（解决【寒冷】）
种子 + 土地 → 农业（解决【饥饿】）
冲突 + 智慧 → 律法（解决【纷争】）
```

#### 城邦时代
```
符号 + 知识 → 文字（解决【遗忘】）
矿石 + 价值 → 货币（解决【隔绝】）
劳力 + 矿石 → 城防（解决【入侵】）
```

#### 启蒙时代
```
实验 + 逻辑 → 科学方法（解决【蒙昧的阴影】）
自由 + 平等 → 人权宣言（解决【神权的枷锁】）
自然法则 + 实验 → 电力（解决【自然的伟力】）
```

### 🌟 特色功能

#### 1. 分支系统
分野时代提供两条发展路线：
- **秩序路线**：官僚体系 → 统治 → 帝国时代
- **信仰路线**：宗教 → 神权 → 信仰时代

#### 2. 自动解锁
完成 event 后自动解锁对应的奖励卡牌：
- 完成【寒冷】→ 解锁【智慧】
- 完成【饥饿】→ 解锁【部落】
- 完成【纷争】→ 解锁【价值】

#### 3. 承上启下
前一时代的奖励卡会成为下一时代的关键合成材料：
- 生存时代：智慧、部落、价值
- 城邦时代：知识、财富、权力
- 继续传递...

#### 4. 迷惑卡机制
每个时代都有迷惑卡（标记为 is_decoy=true）：
- 生存时代：风
- 城邦时代：信仰
- 分野时代：欲望
- 帝国时代：和平
- 理性时代：传统
- 信仰时代：怀疑
- 启蒙时代：秩序

### 🔌 API 端点

#### 卡牌查询
```
GET /api/cards/all              - 获取所有卡牌（图鉴）
GET /api/cards/era/:eraName     - 获取指定时代的卡牌
GET /api/cards/starter          - 获取起始卡牌
GET /api/cards/unlocked         - 获取用户已解锁的卡牌
GET /api/cards/:cardName        - 获取卡牌详情
```

#### 响应示例
```json
{
  "cards": [
    {
      "id": 1,
      "name": "火",
      "type": "key",
      "rarity": "uncommon",
      "era": "生存时代",
      "card_type": "key",
      "attrs_json": {
        "description": "解决【寒冷】的关键",
        "event": "寒冷"
      }
    }
  ]
}
```

### 🎮 游戏流程集成

#### 1. 游戏开始
- 玩家获得2张起始卡：人、石头
- 从生存时代卡牌池抽取3张：水、木头、土地、种子、冲突、风

#### 2. 合成阶段
- 优先检查时代卡牌合成规则
- 找不到匹配则使用 AI 合成
- 检查时代限制（tier、禁止概念）

#### 3. 完成 Event
- 提交钥匙卡解决困境
- 自动解锁奖励卡
- 进入下一时代（或分支）

#### 4. 时代推进
- 解锁新时代的初始灵感卡
- 可以使用前一时代的奖励卡
- 继承部分卡牌到手牌

### 📈 后续计划

- [ ] 前端卡牌图鉴界面
- [ ] 卡牌获取动画效果
- [ ] 卡牌提示和教程系统
- [ ] 卡牌成就和收集进度
- [ ] 卡牌稀有度和特效
- [ ] 多人卡牌交换系统

### 🐛 已知问题

- [ ] 前端需要更新以显示新卡牌
- [ ] 需要实现卡牌图片资源
- [ ] 合成提示需要优化

### 📝 使用方法

#### 安装
```bash
cd server
node db/run-migration-cards.js
```

#### 验证
```bash
psql -d minigame_db -c "SELECT era, card_type, COUNT(*) FROM cards GROUP BY era, card_type ORDER BY era;"
```

#### 测试
```bash
# 获取所有卡牌
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/cards/all

# 获取生存时代卡牌
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/cards/era/生存时代
```

详细说明请查看 `INSTALL_CARDS.md`。

---

**版本**：v2.0.0  
**日期**：2025-11-01  
**作者**：AI Assistant  
**状态**：✅ 已完成并测试

