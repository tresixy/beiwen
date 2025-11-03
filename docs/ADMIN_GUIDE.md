# 管理员使用指南

> 最新版本 - 包含所有管理员功能

## 📋 目录

1. [快速开始](#快速开始)
2. [登录与权限](#登录与权限)
3. [卡牌数据库管理](#卡牌数据库管理)
4. [玩家档案管理](#玩家档案管理)
5. [API接口文档](#api接口文档)
6. [安全机制](#安全机制)
7. [故障排查](#故障排查)

---

## 快速开始

### 默认管理员账号

- **邮箱**: `aita@admin.com`
- **密码**: `admin123`

⚠️ **强烈建议首次登录后立即修改密码！**

### 创建新管理员账号

```bash
# 编辑 server/db/create-admin.js，修改用户名和密码
node server/db/create-admin.js
```

### 访问管理界面

1. 使用管理员账号登录游戏
2. 进入游戏大厅
3. 点击右下角 ⚙️ **设置** 按钮
4. 看到两个管理入口：
   - 🎴 **卡牌数据库** - 管理所有卡牌
   - 📁 **玩家存档管理** - 管理玩家账号和数据

---

## 登录与权限

### 权限验证

管理员权限通过以下方式验证：

1. **JWT Token验证** - 确保用户已登录
2. **角色检查** - 确保 `users.role = 'admin'`

### 如何成为管理员

#### 方法1: 通过数据库直接设置

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

#### 方法2: 使用创建脚本

```bash
node server/db/create-admin.js
```

### 验证管理员身份

#### 方法1: 查看设置面板

登录后，管理员能看到：
- 🎴 卡牌数据库 按钮
- 📁 玩家存档管理 按钮

普通用户看不到这些按钮。

#### 方法2: 查询数据库

```sql
SELECT id, username, email, role 
FROM users 
WHERE role = 'admin';
```

#### 方法3: 调用管理员API

```bash
curl -X GET http://localhost:3000/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

如果返回403错误，说明不是管理员账号。

---

## 卡牌数据库管理

### 访问路径

**方式1**: 大厅 → ⚙️ 设置 → 🎴 卡牌数据库  
**方式2**: 直接访问 `http://localhost/cardsdatabase/`

### 功能概览

- ✅ 查看所有卡牌（基础卡牌 + 用户生成卡牌）
- ✅ 按来源、时代、类型筛选
- ✅ 创建新的基础卡牌
- ✅ 编辑卡牌属性
- ✅ 删除卡牌（用户生成卡牌受保护）
- ✅ 实时统计：基础卡牌数、用户生成卡牌数

### 界面说明

#### 统计卡片（顶部）

- **基础卡牌**: 预设的初始卡牌数量（绿色标记）
- **用户生成**: 玩家合成创建的卡牌数量（蓝色标记）
- **总计**: 所有卡牌总数

#### 筛选器

- **全部来源 / 基础卡牌 / 用户生成**: 按卡牌来源筛选
- **全部时代 / 生存时代 / 城邦时代 / ...**: 按时代筛选
- **全部类型 / 钥匙卡 / 灵感卡 / 奖励卡**: 按卡牌类型筛选

#### 卡牌列表表格

| 列名 | 说明 |
|------|------|
| ID | 卡牌唯一编号 |
| 名称 | 卡牌名称（唯一） |
| 来源 | 基础/用户（带颜色标记） |
| 创建者 | 用户生成卡牌的创建者用户名 |
| 类型 | 卡牌类型（如 element, material） |
| 稀有度 | common, uncommon, rare, epic, legendary |
| 时代 | 所属时代 |
| 卡牌类型 | key(钥匙卡), inspiration(灵感卡), reward(奖励卡) |
| 解锁条件 | 解锁该卡牌的条件 |
| 初始卡 | 是否为起始手牌 |
| 迷惑卡 | 是否为迷惑卡 |
| 描述 | 卡牌描述信息 |
| 操作 | 编辑 / 删除按钮 |

**行颜色标识**:
- 浅绿色背景 = 基础卡牌
- 浅蓝色背景 = 用户生成卡牌

### 操作指南

#### 创建新卡牌

1. 点击「+ 创建新卡牌」按钮
2. 填写表单：
   - **名称** * （必填）：卡牌名称，必须唯一
   - **类型** * （必填）：如 element, material, concept
   - **稀有度** * （必填）：common ~ legendary
   - **时代**：所属时代（可选）
   - **卡牌类型**：key / inspiration / reward
   - **解锁条件**：如「寒冷」或「branch:order」
   - **初始手牌**：勾选则为起始卡牌
   - **迷惑卡**：勾选则为迷惑卡
   - **描述**：卡牌的描述信息
3. 点击「创建」

**注意**: 创建的卡牌会标记为基础卡牌（`is_base_card = TRUE`）

#### 编辑卡牌

1. 点击卡牌行的「编辑」按钮
2. 修改需要更改的字段
3. 点击「保存」

**提示**: 可以编辑任何卡牌（包括用户生成的），修改会立即生效

#### 删除卡牌

1. 点击卡牌行的「删除」按钮
2. 确认删除操作

**保护机制**:
- 用户生成卡牌的删除按钮会被禁用
- 删除基础卡牌会影响所有拥有该卡牌的用户
- 如果卡牌被其他表引用，会提示"无法删除：该卡牌已被使用"

### 详细文档

更多信息请参考：[卡牌管理使用指南](./卡牌管理使用指南.md)

---

## 玩家档案管理

### 访问路径

**方式1**: 大厅 → ⚙️ 设置 → 📁 玩家存档管理  
**方式2**: 直接访问 `http://localhost/playerarchives/`

### 功能概览

- ✅ 查看所有玩家列表
- ✅ 搜索玩家（用户名/邮箱）
- ✅ 查看玩家详细数据
- ✅ **重置玩家密码** ⭐新增
- ✅ 删除玩家存档
- ✅ 批量删除
- ✅ 重置玩家进度
- ✅ **查看合成次数统计** ⭐新增

### 界面说明

#### 左侧面板 - 玩家列表

显示信息：
- 用户名
- 邮箱地址
- 当前时代
- **合成次数** ⭐新增
- 卡牌数量
- 注册时间
- 管理员标识（👑 图标）

#### 搜索功能

- 输入用户名或邮箱进行搜索
- 支持模糊匹配
- 按 Enter 或点击搜索按钮执行搜索
- 搜索结果支持分页（每页20条）

#### 批量操作

- **全选**: 点击列表顶部的"全选"复选框
- **单选**: 点击玩家前的复选框
- **批量删除**: 选中多个玩家后点击"批量删除 (N)" 按钮

**保护机制**:
- ❌ 不能删除管理员账号
- ⚠️ 删除前会有确认对话框
- ⚠️ 删除操作不可恢复

#### 右侧面板 - 玩家详情

点击玩家查看详细信息：

##### 基本信息
- 用户名
- 邮箱
- 角色（user/admin）
- 注册时间
- **合成次数** ⭐新增

##### 游戏状态
- 当前时代
- 已完成的Events数量
- 激活的Event ID
- 手牌数量
- 最后游玩时间

##### 统计数据
- **合成次数** ⭐新增
- 总卡牌数量
- 灵感卡数量
- 钥匙卡数量
- 奖励卡数量
- 地块标志数量
- 高亮地块数量

##### 卡牌收藏
- 显示前50张卡牌
- 显示卡牌名称、数量、类型
- 按稀有度分颜色显示

##### 地块标志
- 显示前20个地块标志
- 显示坐标、标志类型、关联事件

### 操作指南

#### 重置玩家密码 ⭐新增

1. 在左侧玩家列表中点击要管理的玩家
2. 查看右侧玩家详情
3. 点击**"重置密码"**按钮（蓝色）
4. 输入新密码（至少6位）
5. 确认后密码立即生效

**注意**: 
- 密码使用 bcrypt 哈希存储，无法查看原始密码
- 只能重置，不能查看
- 所有操作都会记录日志

#### 重置玩家进度

**功能**: 清空玩家的游戏进度，但保留账号

**删除内容**:
- 游戏状态
- 卡牌收藏（保留起始卡：人、石头）
- 地块标志
- 高亮地块
- 事件日志
- 资源数据
- **合成次数重置为0** ⭐新增

**保留内容**:
- 账号信息（用户名、邮箱、密码）
- 角色（admin/user）

**操作步骤**:
1. 选择玩家
2. 点击"重置进度"按钮（橙色）
3. 确认操作

#### 删除玩家存档

**功能**: 完全删除玩家账号和所有数据

**删除内容**:
- 用户账号
- 游戏状态
- 卡牌收藏
- 地块标志
- 高亮地块
- 事件日志
- 资源数据
- 所有关联数据（级联删除）

**保护机制**:
- ❌ 不能删除管理员账号
- ⚠️ 删除前有确认对话框
- ⚠️ 操作不可恢复

**操作步骤**:
1. 选择玩家
2. 点击"删除存档"按钮（红色）
3. 确认操作

### 使用场景

#### 清理测试账号

```
1. 搜索 "test"
2. 全选所有测试账号
3. 批量删除
```

#### 处理问题账号

```
1. 找到出问题的玩家
2. 查看详细数据，定位问题
3. 选择：
   - 重置密码（忘记密码）
   - 重置进度（数据损坏）
   - 删除存档（严重违规）
```

#### 用户支持

```
玩家请求：
  - "我忘记密码了" → 重置密码
  - "我想重新开始" → 重置进度
  - "删除我的账号" → 删除存档
```

### 详细文档

更多信息请参考：[玩家存档管理面板](./PLAYER_ARCHIVES_ADMIN.md)

---

## API接口文档

### 管理员仪表板

```http
GET /api/admin/dashboard
Authorization: Bearer {token}
```

**响应示例**:
```json
{
  "stats": {
    "totalUsers": 150,
    "totalItems": 1234,
    "totalRecipes": 567,
    "activeUsers24h": 45
  }
}
```

### 玩家档案管理API

#### 1. 获取玩家列表

```http
GET /api/player-archives/list?page=1&limit=20&search=keyword
Authorization: Bearer {token}
```

**响应示例**:
```json
{
  "players": [
    {
      "id": 1,
      "username": "player1",
      "email": "player1@example.com",
      "role": "user",
      "synthesisCount": 15,
      "era": "生存时代",
      "totalCards": 8,
      "totalMarkers": 3,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### 2. 获取玩家详情

```http
GET /api/player-archives/{userId}/detail
Authorization: Bearer {token}
```

**响应示例**:
```json
{
  "user": {
    "id": 1,
    "username": "player1",
    "email": "player1@example.com",
    "role": "user",
    "synthesisCount": 15,
    "createdAt": "2025-01-01T00:00:00.000Z"
  },
  "gameState": {
    "era": "生存时代",
    "completedEvents": [1, 2],
    "activeEventId": 3,
    "hand": [...],
    "lastPlayed": "2025-11-01T12:00:00.000Z"
  },
  "statistics": {
    "synthesisCount": 15,
    "totalCards": 8,
    "cardsByType": {
      "inspiration": 6,
      "key": 2,
      "reward": 0
    }
  },
  "cards": [...],
  "markers": [...]
}
```

#### 3. 重置玩家密码 ⭐新增

```http
POST /api/player-archives/{userId}/reset-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "newPassword": "新密码"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "已重置玩家 player1 的密码"
}
```

**限制**: 新密码长度至少6位

#### 4. 重置玩家进度

```http
POST /api/player-archives/{userId}/reset
Authorization: Bearer {token}
```

**响应示例**:
```json
{
  "success": true,
  "message": "玩家游戏进度已重置，账号保留"
}
```

#### 5. 删除玩家存档

```http
DELETE /api/player-archives/{userId}
Authorization: Bearer {token}
```

**响应示例**:
```json
{
  "success": true,
  "message": "已删除玩家 player1 的所有存档数据"
}
```

#### 6. 批量删除

```http
POST /api/player-archives/batch-delete
Authorization: Bearer {token}
Content-Type: application/json

{
  "userIds": [1, 2, 3]
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "已删除 3 个玩家的存档数据",
  "deletedUsers": [...]
}
```

### 卡牌数据库API

#### 1. 获取卡牌列表

```http
GET /api/cards-database?page=1&limit=50&era=生存时代&type=inspiration&source=base
Authorization: Bearer {token}
```

#### 2. 创建卡牌

```http
POST /api/cards-database
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "新卡牌",
  "type": "element",
  "rarity": "common",
  "era": "生存时代",
  "card_type": "inspiration",
  "attrs_json": {"description": "描述"}
}
```

#### 3. 更新卡牌

```http
PUT /api/cards-database/{cardId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "更新后的名称",
  ...
}
```

#### 4. 删除卡牌

```http
DELETE /api/cards-database/{cardId}
Authorization: Bearer {token}
```

---

## 安全机制

### 权限验证

**中间件链**:
```
authMiddleware → adminMiddleware
```

- `authMiddleware`: 验证 JWT token
- `adminMiddleware`: 检查 `role = 'admin'`

### 管理员保护

**不能删除管理员账号**:
- 删除单个玩家时自动检查
- 批量删除时自动过滤管理员
- 数据库层面也可添加约束

### 密码安全

- 密码使用 **bcrypt** 算法哈希存储
- 原始密码无法查看
- 只有管理员可以重置密码
- 所有操作都会记录日志

### 操作日志

所有管理员操作都会记录：

```javascript
logger.info({ 
  userId, 
  username, 
  operation: 'password_reset',
  adminId 
}, 'Admin operation');
```

### 级联删除

删除玩家时自动清理关联数据：

```sql
-- users 表的外键都设置了 ON DELETE CASCADE
deck_cards (user_id) → CASCADE
user_game_state (user_id) → CASCADE
tile_markers (user_id) → CASCADE
highlighted_tiles (user_id) → CASCADE
events_log (user_id) → CASCADE
resources (user_id) → CASCADE
```

---

## 故障排查

### 问题1: 看不到管理按钮

**症状**: 登录后看不到"卡牌数据库"和"玩家存档管理"按钮

**检查步骤**:
```sql
-- 确认用户是管理员
SELECT role FROM users WHERE email = 'your@email.com';
-- 应该返回 'admin'
```

**解决方法**:
```sql
-- 将用户设置为管理员
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

### 问题2: API返回403错误

**原因**: 
- Token过期或无效
- 用户不是管理员

**解决方法**:
- 重新登录获取新token
- 检查用户role字段

### 问题3: 密码重置失败

**可能原因**:
- 新密码长度不足6位
- 用户不存在
- 数据库连接问题

**检查日志**:
```bash
tail -f server/logs/app.log
```

### 问题4: 合成次数显示为0

**可能原因**:
- 数据库迁移未执行
- `users.synthesis_count` 字段不存在

**解决方法**:
```bash
# 运行数据库迁移
node server/db/run-migration-synthesis-count.js
```

### 问题5: 删除玩家失败

**可能原因**:
- 尝试删除管理员账号
- 数据库连接问题
- 外键约束冲突

**检查日志**:
```bash
tail -f server/logs/app.log
```

---

## 数据库迁移

### 首次使用前

需要运行以下迁移脚本：

#### 1. 合成次数统计

```bash
node server/db/run-migration-synthesis-count.js
```

**添加内容**:
- `users.synthesis_count` 字段（默认0）
- 索引优化

#### 2. 用户生成卡牌系统

```bash
node server/db/run-migration-user-cards.js
```

**添加内容**:
- `cards.is_base_card` 字段
- `cards.created_by_user_id` 字段
- `cards.source_type` 字段

---

## 更新日志

### 2025-01-XX 最新更新

- ✅ **新增**: 玩家密码重置功能
- ✅ **新增**: 合成次数统计显示
- ✅ **改进**: 玩家列表显示合成次数
- ✅ **改进**: 玩家详情显示合成次数统计

### 历史版本

- **v1.0**: 基础管理员功能
  - 卡牌数据库管理
  - 玩家档案管理
  
- **v1.1**: 密码管理
  - 密码重置功能
  
- **v1.2**: 合成统计
  - 合成次数记录和显示

---

## 相关文档

- [卡牌管理使用指南](./卡牌管理使用指南.md)
- [玩家存档管理面板](./PLAYER_ARCHIVES_ADMIN.md)
- [管理员密码管理](./ADMIN_PASSWORD_MANAGEMENT.md)
- [合成次数迁移说明](../SYNTHESIS_COUNT_MIGRATION.md)
- [数据库结构](./DATABASE_STRUCTURE.md)

---

## 技术支持

如有问题，请：
1. 查看日志文件: `server/logs/app.log`
2. 检查数据库连接
3. 验证权限设置
4. 参考相关文档

---

**最后更新**: 2025-01-XX  
**版本**: 1.2

