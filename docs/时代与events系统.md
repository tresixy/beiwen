# 时代与Events系统

## 概述

为游戏新增了时代系统和events挑战系统，每个玩家在每局游戏中将经历不同的events序列，通过解决events来推进文明发展，同时限制了玩家在不同时代可以合成的科技物品。

## 功能特性

### 1. 时代系统

玩家的文明发展分为7个时代：

1. **生存时代** - 人类文明的萌芽期，为生存而奋斗
2. **城邦时代** - 建立稳定的定居点和社会组织
3. **分野时代** - 文明面临方向性的选择
4. **帝国时代** - 文明扩张至广袤的疆域
5. **理性时代** - 理性与科学的兴起
6. **信仰时代** - 精神信仰的体系化
7. **启蒙时代** - 人类文明的觉醒与突破

### 2. Events挑战

每个时代都有对应的挑战events，例如：

- **生存时代**：寒冷、饥饿、纷争
- **城邦时代**：遗忘、隔绝、入侵
- **启蒙时代**：蒙昧的阴影、神权的枷锁、自然的伟力

**特点**：
- 每局游戏从每个时代的events池中随机选择一个，确保每局游戏体验不同
- 玩家需要合成对应的"钥匙"（科技/物品）来完成event
- 完成event后获得沙盘奖励（建筑/资源）
- 解锁下一个event，并可能进入新时代

### 3. 科技限制系统

根据时代限制玩家可以合成的物品：

**生存时代限制**：
- 最高等级：2
- 允许概念：火、工具、食物、庇护所、简单工具、采集、狩猎
- 禁止概念：电力、机器、核能、火药、钢铁、引擎等

**启蒙时代限制**：
- 最高等级：10
- 允许概念：科学方法、人权、电力、现代科技、化学、生物学、物理学
- 禁止概念：核能、太空旅行、量子计算

这有效防止了玩家在生存时代合成出核弹等不合理的高科技物品。

## API接口

### 获取events进度

```http
GET /api/events/progress
Authorization: Bearer <token>
```

响应：
```json
{
  "era": "生存时代",
  "unlockedKeys": ["火"],
  "completedCount": 1,
  "totalCount": 7,
  "activeEvent": {
    "id": 2,
    "name": "【饥饿】",
    "description": "人口渐增，林间的野果与奔跑的野兽已不足以果腹。",
    "reward": "麦田",
    "required_key": "农业"
  },
  "allEvents": [...]
}
```

### 获取当前激活的event

```http
GET /api/events/active
Authorization: Bearer <token>
```

### 完成event

```http
POST /api/events/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "eventId": 1,
  "key": "火"
}
```

### 重新生成events序列

```http
POST /api/events/regenerate
Authorization: Bearer <token>
```

用于开始新游戏时重置events序列。

## 合成系统集成

合成系统已自动集成时代限制：

1. **AI合成**：提示词中会自动加入当前时代的科技限制
2. **规则合成**：会在结果中标记时代信息
3. **时代检查**：合成完成前会验证结果是否符合时代限制

如果尝试合成超出时代限制的物品，会返回403错误：

```json
{
  "error": "时代限制",
  "message": "\"电力\"在生存时代还未出现",
  "currentEra": "生存时代",
  "suggestedTier": 5
}
```

## 数据库结构

### user_game_state表扩展

新增字段：
- `era` - 当前时代（默认：生存时代）
- `unlocked_keys` - 已解锁的钥匙列表（JSONB）
- `completed_events` - 已完成的event ID列表（JSONB）
- `active_event_id` - 当前激活的event ID
- `event_sequence` - 本局的events序列（JSONB）

### events表

存储events定义：
- `event_number` - 编号
- `era` - 所属时代
- `name` - 名称
- `description` - 描述
- `reward` - 沙盘奖励
- `required_key` - 解锁所需的钥匙

## 使用示例

### 1. 新玩家开始游戏

```javascript
// 加载游戏状态
const state = await fetch('/api/game/state', {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());

console.log(state.era); // "生存时代"
console.log(state.activeEvent); // { name: "【寒冷】", ... }
```

### 2. 查看events进度

```javascript
const progress = await fetch('/api/events/progress', {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());

console.log(`进度: ${progress.completedCount}/${progress.totalCount}`);
console.log(`当前时代: ${progress.era}`);
console.log(`已解锁钥匙: ${progress.unlockedKeys.join(', ')}`);
```

### 3. 完成event

```javascript
// 玩家合成出"火"
const synthResult = await fetch('/api/synthesize', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    inputs: [fireCardId, woodCardId],
    name: '火',
    mode: 'ai'
  })
}).then(r => r.json());

// 提交钥匙完成event
const result = await fetch('/api/events/complete', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    eventId: activeEvent.id,
    key: '火'
  })
}).then(r => r.json());

console.log(result.message); // "成功完成【寒冷】"
console.log(result.reward); // "篝火"
```

### 4. 时代限制提示

```javascript
try {
  const result = await fetch('/api/synthesize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: [uraniumId, plutoniumId],
      name: '核弹',
      mode: 'ai'
    })
  }).then(r => r.json());
  
  if (r.status === 403) {
    console.error(result.message); 
    // "\"核能\"在生存时代还未出现"
  }
} catch (err) {
  // 处理错误
}
```

## 配置文件

### eraConfig.js

定义时代顺序、科技限制等配置：

```javascript
export const ERAS = [
  { name: '生存时代', order: 1, description: '...' },
  // ...
];

export const TECH_TIERS = {
  '生存时代': {
    maxTier: 2,
    allowedConcepts: ['火', '工具', ...],
    forbiddenConcepts: ['电力', '机器', ...],
  },
  // ...
};
```

## 数据库迁移

运行迁移脚本创建必要的表和数据：

```bash
# 连接数据库并运行迁移
psql -U your_user -d your_database -f server/db/migrations/add_era_and_events.sql
```

或使用数据库管理工具执行 `add_era_and_events.sql` 文件。

## 开发建议

1. **自定义events**：在`events`表中添加新的events定义
2. **调整科技限制**：修改`eraConfig.js`中的`TECH_TIERS`配置
3. **前端集成**：在游戏UI中显示当前时代、进度条、event详情
4. **合成反馈**：在合成失败时向玩家展示时代限制原因

## 注意事项

1. 每个玩家的events序列是随机生成的，确保游戏重玩性
2. 时代推进是自动的，完成当前时代最后一个event后自动进入下一时代
3. AI合成时会考虑时代限制，但仍需后端验证
4. 钥匙名称必须与events定义中的`required_key`完全匹配

## 未来扩展

- 添加事件分支选择（不同选择影响后续events）
- 时代特殊能力（不同时代解锁不同合成加成）
- 多人模式中的时代竞赛
- 时代相关的视觉主题和音效





