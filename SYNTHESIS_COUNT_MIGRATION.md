# 玩家合成次数统计功能

## 功能说明

后台会自动记录每个玩家的累计合成次数。

## 数据库字段

在 `users` 表新增字段：
- `synthesis_count INTEGER DEFAULT 0` - 玩家累计合成次数

## 迁移步骤

执行数据库迁移：

```bash
cd /root/minigame
node server/db/run-migration-synthesis-count.js
```

## 功能位置

### 1. 自动计数
- 位置：`server/routes/synthesize.js`
- 触发：每次成功合成后自动增加计数（不含预览模式）

### 2. 统计接口
- 玩家列表：`GET /api/player-archives/list` 返回 `synthesisCount` 字段
- 玩家详情：`GET /api/player-archives/:userId/detail` 返回 `user.synthesisCount` 和 `statistics.synthesisCount`

### 3. 重置功能
- 重置玩家进度时会同时重置合成次数为 0

## 代码修改

1. `server/db/schema.sql` - 添加字段定义
2. `server/db/migrations/add_synthesis_count.sql` - 迁移脚本
3. `server/services/synthService.js` - 添加 `incrementSynthesisCount()` 函数
4. `server/routes/synthesize.js` - 合成成功后调用计数函数
5. `server/routes/playerArchives.js` - API返回合成次数统计

