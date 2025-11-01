# 时代与Events系统安装指南

## 快速安装

### 1. 运行数据库迁移

执行以下命令之一：

```bash
# 方式一：使用Node.js脚本（推荐）
cd /root/minigame
node server/db/run-migration.js
```

或

```bash
# 方式二：直接执行SQL
sudo -u postgres psql -d minigame < /root/minigame/server/db/migrations/add_era_and_events.sql
```

**预期输出**：
```
✅ 时代与events系统数据库迁移完成
   - 已添加 user_game_state 扩展字段
   - 已创建 events 表
   - 已插入20个events定义
```

### 2. 重启服务器

如果服务器正在运行，需要重启以加载新代码：

```bash
# 使用gunicorn管理脚本
./gunicorn_manager.sh restart

# 或手动重启
pkill -f "node server/index.js"
npm start
```

### 3. 测试功能（可选）

```bash
# 测试events系统
node server/test-events.js
```

## 功能验证

### 检查数据库

```bash
sudo -u postgres psql -d minigame
```

在psql中执行：

```sql
-- 查看events表
SELECT event_number, era, name FROM events ORDER BY event_number;

-- 查看扩展的字段
\d user_game_state
```

### 测试API端点

使用已登录的token测试：

```bash
# 获取当前激活的event
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/events/active

# 获取events进度
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/events/progress

# 测试合成（会自动应用时代限制）
curl -X POST http://localhost:3000/api/synthesize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [1, 2],
    "name": "测试物品",
    "mode": "rule"
  }'
```

## 已创建/修改的文件

### 新增文件

**数据库相关**：
- `server/db/migrations/add_era_and_events.sql` - 数据库迁移脚本
- `server/db/run-migration.js` - 迁移执行脚本

**配置文件**：
- `server/config/eraConfig.js` - 时代配置和科技限制

**服务层**：
- `server/services/eventService.js` - Events业务逻辑

**路由层**：
- `server/routes/events.js` - Events API路由

**客户端API**：
- `client/src/api/eventsApi.js` - 前端API封装

**文档**：
- `docs/时代与events系统.md` - 详细功能文档
- `INSTALL_ERA_EVENTS.md` - 本安装指南

**测试**：
- `server/test-events.js` - Events系统测试脚本

### 修改的文件

**服务层**：
- `server/services/aiService.js` - 添加时代限制到AI提示词
- `server/services/synthService.js` - 添加时代参数到规则合成
- `server/services/gameStateService.js` - 加载events状态

**路由层**：
- `server/routes/synthesize.js` - 集成时代检查
- `server/index.js` - 注册events路由

**文档**：
- `README.md` - 更新功能说明

## API端点

新增以下API端点：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/events/progress` | 获取进度概览 |
| GET | `/api/events/active` | 获取当前激活的event |
| POST | `/api/events/complete` | 完成event |
| POST | `/api/events/regenerate` | 重新生成序列 |

所有端点都需要JWT认证。

## 游戏状态扩展

`GET /api/game/state` 响应新增字段：

```json
{
  "era": "生存时代",
  "activeEvent": {
    "id": 1,
    "name": "【寒冷】",
    "description": "夜幕降临，体温与希望一同流逝。",
    "required_key": "火",
    "reward": "篝火"
  },
  "eventProgress": {
    "completed": 0,
    "total": 7
  }
}
```

## 合成系统变化

### 时代限制

合成时会自动检查时代限制：

```javascript
// 生存时代尝试合成高科技物品会被拒绝
POST /api/synthesize
{
  "inputs": [energyId, metalId],
  "name": "核反应堆",
  "mode": "ai"
}

// 响应 403
{
  "error": "时代限制",
  "message": "\"核能\"在生存时代还未出现",
  "currentEra": "生存时代"
}
```

### AI提示词更新

AI合成时会自动在提示词中加入时代限制，例如：

```
当前时代：生存时代
科技限制：最高等级2，允许的概念包括：火、工具、食物、庇护所等
禁止概念：电力、机器、核能、火药等
```

## 前端集成建议

### 显示时代信息

```javascript
import { getEventsProgress } from './api/eventsApi';

// 获取并显示时代
const progress = await getEventsProgress(token);
console.log(`当前时代: ${progress.era}`);
console.log(`进度: ${progress.completedCount}/${progress.totalCount}`);
```

### 显示当前event

```javascript
import { getActiveEvent } from './api/eventsApi';

const { event } = await getActiveEvent(token);
if (event) {
  // 显示event卡片
  showEventCard({
    name: event.name,
    description: event.description,
    requiredKey: event.required_key,
    reward: event.reward
  });
}
```

### 完成event

```javascript
import { completeEvent } from './api/eventsApi';

// 玩家合成出钥匙后
try {
  const result = await completeEvent(token, eventId, '火');
  showSuccessMessage(result.message);
  showReward(result.reward);
  
  if (result.newEra !== currentEra) {
    showEraTransition(result.newEra);
  }
} catch (err) {
  showError(err.message);
}
```

## 故障排除

### 迁移失败

**症状**：运行迁移脚本时出错

**解决**：
```bash
# 检查PostgreSQL是否运行
sudo systemctl status postgresql

# 检查数据库连接
sudo -u postgres psql -d minigame -c "SELECT 1;"

# 查看详细错误
node server/db/run-migration.js 2>&1 | tee migration.log
```

### API返回错误

**症状**：调用 `/api/events/*` 返回404或500

**解决**：
```bash
# 确认路由已注册
grep "eventsRoutes" server/index.js

# 查看服务器日志
./gunicorn_manager.sh logs

# 重启服务器
./gunicorn_manager.sh restart
```

### 时代限制不生效

**症状**：可以在生存时代合成高科技物品

**解决**：
1. 检查 `eraConfig.js` 配置是否正确
2. 检查 `synthesize.js` 路由是否调用了 `isTechAllowed`
3. 清除Redis缓存：
```bash
redis-cli FLUSHALL
```

## 注意事项

1. **首次运行迁移**：对于新玩家，会自动初始化时代状态
2. **现有玩家**：迁移后，现有玩家默认处于"生存时代"，需要手动调整或重新生成序列
3. **缓存问题**：时代限制会影响AI合成缓存，建议清除旧缓存
4. **前端更新**：需要更新前端UI以显示时代和events信息

## 下一步

1. 在游戏UI中添加时代指示器
2. 添加events进度条
3. 实现event详情弹窗
4. 添加时代切换动画
5. 完善钥匙合成引导

详细功能文档：[docs/时代与events系统.md](docs/时代与events系统.md)

