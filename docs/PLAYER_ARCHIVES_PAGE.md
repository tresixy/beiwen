# 玩家存档管理 - 独立页面版本

## 更新说明

已将玩家存档管理从弹窗面板改为独立的全屏页面，与卡牌数据库管理页面平级。

---

## 访问方式

### 方式1：通过大厅设置面板

1. 使用管理员账号登录
   - 邮箱: `aita@admin.com`
   - 密码: `aitaita`

2. 进入游戏大厅

3. 点击右下角 ⚙️ **设置** 按钮

4. 在设置面板中点击 📁 **玩家存档管理** 按钮

5. 自动跳转到独立管理页面

### 方式2：直接访问URL

```
http://localhost/playerarchives/
```

**注意**: 需要先登录管理员账号，否则API会返回403错误

---

## 界面布局

### 全屏展示
- 顶部：深紫色渐变导航栏
  - 左侧：← 返回 按钮（返回大厅）
  - 中间：玩家存档管理 标题
  - 右侧：（预留）
  
- 主体：左右分栏布局
  - 左侧 (400px)：玩家列表
    - 搜索栏
    - 批量操作（全选、批量删除）
    - 玩家卡片列表（可滚动）
    - 分页控制
  
  - 右侧 (flex-1)：玩家详情
    - 基本信息
    - 游戏状态
    - 卡牌收藏（前50张）
    - 地块标志（前20个）
    - 操作按钮（重置进度、删除存档）

---

## 功能特性

### 1. 玩家列表
- ✅ 显示所有玩家
- ✅ 显示基本信息（用户名、邮箱、时代、卡牌数、标志数、注册时间）
- ✅ 管理员标识（👑 图标）
- ✅ 搜索功能（按用户名/邮箱）
- ✅ 分页浏览（每页20条）

### 2. 批量操作
- ✅ 单选/全选玩家
- ✅ 批量删除（自动过滤管理员账号）
- ✅ 删除前确认对话框

### 3. 玩家详情
- ✅ 查看完整玩家信息
- ✅ 游戏进度统计
- ✅ 卡牌收藏列表
- ✅ 地块标志列表

### 4. 管理操作
- ✅ 重置玩家进度（保留账号）
- ✅ 删除玩家存档（完全删除）
- ✅ 管理员账号保护（不可删除）

---

## 技术实现

### 前端组件

**文件**: `client/src/components/admin/PlayerArchivesPanel.jsx`

**改动**:
1. 添加 `onBack` prop（返回大厅回调）
2. 头部添加返回按钮
3. 关闭按钮变为可选（弹窗模式才显示）

**样式**: `client/src/styles/playerArchivesPanel.css`

**改动**:
1. 从模态窗口改为全屏布局
2. 移除半透明遮罩背景
3. 调整为 flexbox 垂直布局
4. 内容区自适应高度

### 路由配置

**文件**: `client/src/App.jsx`

**改动**:
1. 添加 `playerarchives` 视图状态
2. `handleOpenPlayerArchives` 跳转到独立页面而非打开弹窗
3. 添加浏览器历史记录支持（前进/后退）
4. 移除弹窗式渲染逻辑

### URL路径

- 卡牌数据库: `/cardsdatabase/`
- 玩家存档: `/playerarchives/`

### 浏览器历史

使用 `window.history.pushState` 和 `popstate` 事件：
- 点击按钮 → 切换视图 + 更新URL
- 浏览器后退 → 自动切换回对应视图

---

## API端点

所有API端点保持不变：

```
GET  /api/player-archives/list               - 获取玩家列表
GET  /api/player-archives/:userId/detail     - 获取玩家详情
DELETE /api/player-archives/:userId          - 删除玩家
POST /api/player-archives/batch-delete       - 批量删除
POST /api/player-archives/:userId/reset      - 重置进度
```

**权限**: 所有接口需要管理员权限（`role = 'admin'`）

---

## 安全机制

### 1. 管理员保护
- 数据库层面禁止删除 `role = 'admin'` 的用户
- 前端自动过滤管理员账号

### 2. 权限验证
- JWT Token验证
- 管理员角色检查
- 403错误自动提示

### 3. 操作确认
- 删除前弹出确认对话框
- 批量操作显示影响数量
- 不可逆操作明确提示

---

## 测试

### 自动化测试脚本

**文件**: `test-player-archives.sh`

**功能**:
1. 测试页面访问（HTTP 200）
2. 测试管理员登录
3. 测试玩家列表API

**运行**:
```bash
./test-player-archives.sh
```

**预期输出**:
```
✅ 页面访问正常 (HTTP 200)
✅ 登录成功
✅ 玩家列表API正常
```

### 手动测试检查表

#### 基础功能
- [ ] 使用管理员账号登录
- [ ] 从大厅设置进入玩家存档管理
- [ ] 直接访问 `/playerarchives/` URL
- [ ] 点击返回按钮回到大厅
- [ ] 浏览器后退/前进功能正常

#### 玩家列表
- [ ] 显示所有玩家
- [ ] 搜索功能正常
- [ ] 分页功能正常
- [ ] 管理员显示👑标识

#### 批量操作
- [ ] 单选玩家
- [ ] 全选玩家
- [ ] 批量删除（自动排除管理员）
- [ ] 删除后列表刷新

#### 玩家详情
- [ ] 点击玩家显示详情
- [ ] 查看基本信息
- [ ] 查看卡牌列表
- [ ] 查看地块标志

#### 管理操作
- [ ] 重置玩家进度
- [ ] 删除玩家存档
- [ ] 无法删除管理员账号

---

## 数据库迁移

### 必需的表

如果遇到 `relation does not exist` 错误，执行以下迁移：

```bash
# 创建 tile_markers 和 highlighted_tiles 表
PGPASSWORD=postgres psql -h localhost -U postgres -d minigame \
  -f server/db/migrations/add_tile_markers.sql
```

**涉及的表**:
- `tile_markers` - 地块标志
- `highlighted_tiles` - 高亮地块

---

## 与卡牌数据库的对比

| 特性 | 卡牌数据库 | 玩家存档管理 |
|------|-----------|-------------|
| URL路径 | `/cardsdatabase/` | `/playerarchives/` |
| 访问权限 | 管理员 | 管理员 |
| 布局方式 | 全屏独立页面 | 全屏独立页面 |
| 返回方式 | 点击返回按钮 | 点击返回按钮 |
| 数据操作 | 增删改查卡牌 | 查看/删除玩家 |
| 批量操作 | ❌ | ✅ |
| 搜索功能 | ✅ | ✅ |

---

## 故障排查

### 问题1: 看不到"玩家存档管理"按钮

**检查**:
```sql
SELECT role FROM users WHERE email = 'your-email@example.com';
```

**解决**:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 问题2: API返回403错误

**原因**: Token过期或权限不足

**解决**: 
1. 退出登录
2. 重新使用管理员账号登录
3. 确认账号 `role = 'admin'`

### 问题3: 页面显示错误

**原因**: 前端代码未构建

**解决**:
```bash
npm run client:build
bash restart-service.sh
```

### 问题4: 数据库表不存在

**错误**: `relation "tile_markers" does not exist`

**解决**:
```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d minigame \
  -f server/db/migrations/add_tile_markers.sql
```

---

## 未来优化

### 短期
- [ ] 添加数据导出功能（CSV/JSON）
- [ ] 玩家数据统计图表
- [ ] 更细粒度的操作日志

### 中期
- [ ] 玩家活动时间线
- [ ] 批量操作撤销功能
- [ ] 玩家标签/分组

### 长期
- [ ] 实时在线玩家监控
- [ ] 玩家行为分析
- [ ] 自动化封禁/解禁系统

---

## 总结

✅ **独立页面**: 从弹窗改为全屏独立页面  
✅ **统一体验**: 与卡牌数据库管理风格一致  
✅ **URL路由**: 支持浏览器前进/后退  
✅ **完整功能**: 所有管理功能正常运行  
✅ **安全可靠**: 管理员保护 + 权限验证  

**访问地址**: http://localhost/playerarchives/

**管理员账号**: 
- 邮箱: `aita@admin.com`
- 密码: `aitaita`

