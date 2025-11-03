# 管理员密码管理功能

## 功能说明

管理员可以在玩家档案管理页面重置任何玩家的密码。

**注意**: 密码在数据库中以 bcrypt 哈希方式存储，无法查看原始密码，只能重置。

## 使用方法

### 1. 访问玩家档案管理页面

- 使用管理员账号登录
- 进入大厅，点击设置按钮
- 点击"玩家存档管理"

或直接访问: `http://localhost/playerarchives/`

### 2. 重置玩家密码

1. 在左侧玩家列表中点击要管理的玩家
2. 查看右侧玩家详情
3. 点击"重置密码"按钮（蓝色）
4. 输入新密码（至少6位）
5. 确认后密码立即生效

### 3. 显示的信息

#### 玩家列表
- 用户名
- 邮箱
- 当前时代
- 合成次数 ⭐新增
- 卡牌数量

#### 玩家详情 - 基本信息
- 用户名
- 邮箱
- 角色
- 注册时间
- 合成次数 ⭐新增

#### 玩家详情 - 统计数据
- 合成次数 ⭐新增
- 总卡牌数
- 灵感卡/钥匙卡/奖励卡数量
- 地块标志数量
- 高亮地块数量

## 后端API

### 重置密码
```
POST /api/player-archives/:userId/reset-password
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "newPassword": "新密码"
}
```

**响应**:
```json
{
  "success": true,
  "message": "已重置玩家 xxx 的密码"
}
```

**权限**: 仅管理员可用

**限制**: 新密码长度至少6位

## 安全说明

1. 密码使用 bcrypt 算法哈希存储
2. 原始密码无法查看
3. 只有管理员可以重置密码
4. 所有操作都会记录日志

## 测试步骤

### 1. 先运行数据库迁移
```bash
node server/db/run-migration-synthesis-count.js
```

### 2. 测试密码重置

1. 登录管理员账号 (aita@admin.com / admin123)
2. 进入玩家档案管理页面
3. 选择一个测试用户
4. 点击"重置密码"
5. 输入新密码: `test123`
6. 确认提示
7. 退出登录
8. 使用该测试用户账号和新密码登录
9. 验证是否成功

### 3. 测试合成次数统计

1. 登录测试用户
2. 进行几次卡牌合成
3. 登录管理员账号
4. 查看该用户档案
5. 验证合成次数是否正确显示

## 代码修改

### 后端
- `server/routes/playerArchives.js` - 添加密码重置接口
- `server/services/synthService.js` - 添加合成计数函数
- `server/routes/synthesize.js` - 合成后自动计数
- `server/db/schema.sql` - 添加 synthesis_count 字段
- `server/db/migrations/add_synthesis_count.sql` - 迁移脚本

### 前端
- `client/src/components/admin/PlayerArchivesPanel.jsx` - 添加密码重置按钮和合成次数显示
- `client/src/styles/playerArchivesPanel.css` - 添加按钮样式

