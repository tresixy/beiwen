# 数据库结构 - 玩家相关数据

## 核心玩家数据表

### 1. users - 用户基础信息表
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    profession_json JSONB DEFAULT '{}',
    current_era VARCHAR(50) DEFAULT '生存时代',
    completed_events JSONB DEFAULT '[]',
    active_event_id INTEGER DEFAULT NULL,
    event_sequence JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);
```

**存储内容:**
- ✅ 用户账号信息（email, username, password）
- ✅ 当前时代（current_era）- 生存时代 → 城邦时代 → ...
- ✅ 已完成的events ID列表（completed_events）
- ✅ 当前激活的event ID（active_event_id）
- ✅ 本局events序列（event_sequence）
- ✅ 职业/属性JSON（profession_json）

---

### 2. deck_cards - 用户卡牌收藏表
```sql
CREATE TABLE deck_cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    card_id INTEGER REFERENCES cards(id),
    discovered BOOLEAN DEFAULT FALSE,
    count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, card_id)
);
```

**存储内容:**
- ✅ 玩家已解锁的卡牌（discovered = true）
- ✅ 每张卡的数量（count）
- ✅ 灵感卡、钥匙卡、生成卡的收藏

**初始状态:**
- 新用户：人（2张）、石头（2张）

---

### 3. user_game_state - 游戏临时状态表
```sql
CREATE TABLE user_game_state (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    hand_json JSONB DEFAULT '[]',
    contract_json JSONB DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**存储内容:**
- ✅ 玩家当前手牌（hand_json）
- ✅ 激活的契约（contract_json）- 暂未使用
- ⚠️ 注意：手牌是临时状态，退出游戏可能清空

---

### 4. tile_markers - 地块标志表
```sql
CREATE TABLE tile_markers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    q INTEGER NOT NULL,
    r INTEGER NOT NULL,
    marker_type VARCHAR(50) NOT NULL,
    event_name VARCHAR(100),
    image_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, q, r)
);
```

**存储内容:**
- ✅ 玩家沙盘地图上的标志
- ✅ 标志坐标（q, r - 六边形坐标）
- ✅ 标志类型（marker_type）- 对应event奖励
- ✅ 关联的event名称（event_name）
- ✅ 图片路径（image_path）

**标志类型示例:**
- 篝火（完成【寒冷】）
- 麦田（完成【饥饿】）
- 石碑（完成【纷争】）
- 图书馆（完成【遗忘】）
- 市场（完成【隔绝】）
- 城墙（完成【入侵】）

---

### 5. highlighted_tiles - 高亮地块表
```sql
CREATE TABLE highlighted_tiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    q INTEGER NOT NULL,
    r INTEGER NOT NULL,
    event_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, q, r)
);
```

**存储内容:**
- ✅ 玩家沙盘上永久高亮的地块
- ✅ 高亮坐标（q, r）
- ✅ 关联的event名称
- ✅ 呼吸高亮效果（前端渲染）

**规则:**
- 完成event后，选中的地块 + 1-5个随机邻近地块永久高亮

---

### 6. resources - 资源表
```sql
CREATE TABLE resources (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    food INTEGER DEFAULT 0,
    production INTEGER DEFAULT 0,
    research INTEGER DEFAULT 0,
    turn INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**存储内容:**
- ✅ 食物（food）
- ✅ 生产力（production）
- ✅ 科研（research）
- ✅ 回合数（turn）
- ⚠️ 暂未使用，为未来扩展预留

---

### 7. events_log - 事件日志表
```sql
CREATE TABLE events_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    payload_json JSONB DEFAULT '{}',
    turn INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**存储内容:**
- ✅ 玩家游戏行为日志
- ✅ 事件类型（type）
- ✅ 事件数据（payload_json）
- ✅ 发生时间和回合数

---

## 辅助数据表（系统级）

### 8. cards - 卡牌定义表
```sql
CREATE TABLE cards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    rarity VARCHAR(20) DEFAULT 'common',
    era VARCHAR(50),
    card_type VARCHAR(20) DEFAULT 'inspiration',
    is_starter BOOLEAN DEFAULT FALSE,
    is_base_card BOOLEAN DEFAULT TRUE,
    source_type VARCHAR(50),
    unlock_condition VARCHAR(100),
    attrs_json JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

**存储内容:**
- ✅ 所有卡牌定义（系统卡 + 用户生成卡）
- ✅ 卡牌类型（card_type）: inspiration, key, reward
- ✅ 稀有度（rarity）: common(白), ruby(红), rare(蓝), epic, legendary
- ✅ 所属时代（era）
- ✅ 是否起始卡（is_starter）
- ✅ 解锁条件（unlock_condition）

---

### 9. events - Events定义表
```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_number INTEGER UNIQUE NOT NULL,
    era VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    reward VARCHAR(100),
    required_key VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**存储内容:**
- ✅ 所有events定义
- ✅ event编号（event_number）
- ✅ 所属时代（era）
- ✅ event名称（name）- 如【寒冷】【饥饿】
- ✅ 描述/提示语（description）
- ✅ 沙盘奖励（reward）- 如篝火、麦田
- ✅ 所需钥匙卡（required_key）- 如【火】【农业】

**已录入events:**
1. 生存时代：寒冷、饥饿、纷争
2. 城邦时代：遗忘、隔绝、入侵

---

### 10. ai_recipes - AI合成配方表
```sql
CREATE TABLE ai_recipes (
    id SERIAL PRIMARY KEY,
    recipe_hash VARCHAR(64) UNIQUE NOT NULL,
    inputs_json JSONB NOT NULL,
    output_item_id INTEGER REFERENCES items(id),
    prompt TEXT,
    model VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**存储内容:**
- ✅ AI合成的配方缓存
- ✅ 输入卡牌哈希（recipe_hash）
- ✅ 输入卡牌JSON（inputs_json）
- ✅ 输出物品ID（output_item_id）
- ✅ AI提示词和模型
- ✅ 避免重复调用AI API

---

## 未使用/预留表

### 11. items - 物品表
```sql
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    tier INTEGER DEFAULT 1,
    attrs_json JSONB DEFAULT '{}',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```
⚠️ **状态:** 预留，暂未使用

---

### 12. inventories - 背包表
```sql
CREATE TABLE inventories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id),
    slots_json JSONB DEFAULT '[]',
    updated_at TIMESTAMP DEFAULT NOW()
);
```
⚠️ **状态:** 预留，暂未使用（卡牌收藏使用 deck_cards）

---

### 13. world_tiles - 世界地块表
```sql
CREATE TABLE world_tiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    biome VARCHAR(50) DEFAULT 'plains',
    data_json JSONB DEFAULT '{}',
    UNIQUE(user_id, x, y)
);
```
⚠️ **状态:** 预留，暂未使用（地块标志使用 tile_markers）

---

### 14. entities - 实体表
```sql
CREATE TABLE entities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    kind VARCHAR(20) NOT NULL,
    card_id INTEGER REFERENCES cards(id),
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    attrs_json JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```
⚠️ **状态:** 预留，暂未使用

---

### 15. projects - 项目表
```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    progress INTEGER DEFAULT 0,
    required_production INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```
⚠️ **状态:** 预留，暂未使用

---

### 16. blueprints - 蓝图表
```sql
CREATE TABLE blueprints (
    id SERIAL PRIMARY KEY,
    formula_json JSONB NOT NULL,
    hint TEXT,
    reward_card_id INTEGER REFERENCES cards(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```
⚠️ **状态:** 预留，暂未使用

---

### 17. images - 图片表
```sql
CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES items(id),
    provider VARCHAR(50),
    prompt TEXT,
    image_url TEXT,
    seed VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);
```
⚠️ **状态:** 预留，暂未使用

---

## 玩家数据流程

### 注册流程
```
注册用户
    ↓
INSERT users (email, username, password_hash)
    ↓
INSERT deck_cards (user_id, card_id)
    - 人 x2
    - 石头 x2
    ↓
初始化完成
```

### 游戏进程流程
```
进入游戏
    ↓
SELECT user_game_state (加载手牌)
    ↓
SELECT events WHERE era = current_era (加载可用events)
    ↓
玩家选择地块 → localStorage (selectedHex)
    ↓
加载event → 显示在UI
    ↓
合成卡牌 → AI生成结果
    ↓
获得钥匙卡 → INSERT/UPDATE deck_cards
    ↓
使用钥匙卡解决event
    ↓
UPDATE users (completed_events, active_event_id)
INSERT tile_markers (q, r, marker_type)
INSERT highlighted_tiles (q, r)
    ↓
完成该时代所有events → 升级时代
    ↓
UPDATE users (current_era)
解锁新时代的灵感卡 → UPDATE deck_cards
```

### 抽牌流程
```
GET /api/deck/draw?count=5
    ↓
SELECT deck_cards 
WHERE user_id = ? 
  AND discovered = true 
  AND count > 0
  AND card_type = 'inspiration'
    ↓
权重随机抽取（稀有度影响）
    ↓
返回手牌JSON
    ↓
UPDATE user_game_state (hand_json)
```

---

## 数据统计

### 当前实现的表（15个）
✅ 正在使用（9个）:
1. users - 用户
2. deck_cards - 卡牌收藏
3. user_game_state - 游戏状态
4. tile_markers - 地块标志
5. highlighted_tiles - 高亮地块
6. cards - 卡牌定义
7. events - Events定义
8. ai_recipes - AI配方缓存
9. events_log - 事件日志

⚠️ 预留未使用（6个）:
10. items
11. inventories
12. world_tiles
13. entities
14. projects
15. blueprints
16. images
17. resources

---

## 数据持久化

### 永久数据
- ✅ 用户账号信息
- ✅ 时代进度
- ✅ 已完成的events
- ✅ 卡牌收藏（deck_cards）
- ✅ 地块标志和高亮
- ✅ AI合成配方

### 临时数据
- ⚠️ 当前手牌（user_game_state.hand_json）
- ⚠️ 激活的event（users.active_event_id）
- ⚠️ 事件序列（users.event_sequence）

### 客户端数据
- ⚠️ 选中的地块（localStorage.selectedHex）
- ⚠️ 卡册（localStorage.cardBook）- 从服务器同步

---

## 数据安全

### 用户隔离
所有玩家数据表都有 `user_id` 外键，确保数据隔离：
- deck_cards(user_id)
- user_game_state(user_id)
- tile_markers(user_id)
- highlighted_tiles(user_id)
- events_log(user_id)

### 级联删除
删除用户时自动清理关联数据：
- ON DELETE CASCADE

### 唯一约束
防止重复数据：
- deck_cards: UNIQUE(user_id, card_id)
- tile_markers: UNIQUE(user_id, q, r)
- highlighted_tiles: UNIQUE(user_id, q, r)

---

## 数据库索引

优化查询性能：
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_deck_cards_user ON deck_cards(user_id, card_id);
CREATE INDEX idx_user_game_state_user ON user_game_state(user_id);
CREATE INDEX idx_tile_markers_user ON tile_markers(user_id);
CREATE INDEX idx_tile_markers_coords ON tile_markers(user_id, q, r);
CREATE INDEX idx_highlighted_tiles_user ON highlighted_tiles(user_id);
CREATE INDEX idx_highlighted_tiles_coords ON highlighted_tiles(user_id, q, r);
CREATE INDEX idx_ai_recipes_hash ON ai_recipes(recipe_hash);
CREATE INDEX idx_events_era ON events(era);
CREATE INDEX idx_events_number ON events(event_number);
```

---

## 总结

### 核心玩家数据
1. **账号数据** - users表
2. **时代进度** - users.current_era, completed_events
3. **卡牌收藏** - deck_cards表
4. **游戏状态** - user_game_state表
5. **沙盘地图** - tile_markers + highlighted_tiles表
6. **事件日志** - events_log表

### 数据完整性
✅ 所有玩家相关数据都正确关联到 user_id  
✅ 级联删除确保数据清理  
✅ 唯一约束防止重复  
✅ 索引优化查询性能  

### 扩展性
预留了多个表用于未来功能：
- 物品系统（items, inventories）
- 世界地图（world_tiles, entities）
- 宏伟工程（projects）
- 合成蓝图（blueprints）
- 图片生成（images）

