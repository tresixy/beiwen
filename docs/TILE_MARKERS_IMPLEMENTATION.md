# 地块标志与高亮系统实现说明

## 概述

根据 `game_design.md` 的要求，成功实现了完整的地块标志放置和永久高亮系统。

## 实现的功能

### ✅ 1. 六边形地块邻近计算

**文件:** `server/services/tileMarkerService.js`

- `getNeighbors(q, r)` - 获取指定地块的6个邻近地块
- `getTilesInRadius(centerQ, centerR, radius)` - 获取指定半径内的所有地块
- `getRandomNearbyTiles(centerQ, centerR, minCount, maxCount)` - 随机选择周围地块（1-5个）

### ✅ 2. 标志放置系统（支持Z轴排序）

**文件:** 
- `server/services/tileMarkerService.js` - 服务层
- `server/routes/tileMarkers.js` - API路由
- `client/src/components/lobby/HexCanvas.jsx` - 渲染逻辑

**特性:**
- 自动查找对应名称的图片文件（支持 png/jpg/webp/jpeg）
- 按Y坐标排序绘制，确保下方地块的标志遮挡上方（符合等距视角）
- 图片路径从 `client/public/assets/2d/` 目录查找

### ✅ 3. 永久高亮与呼吸动画

**文件:** `client/src/components/lobby/HexCanvas.jsx`

**效果:**
- 金色边框呼吸效果（alpha值在0.3-0.8之间正弦变化）
- 周期约3秒，使用 `requestAnimationFrame` 实现流畅动画
- 内发光效果增强视觉冲击

### ✅ 4. 数据持久化

**数据库表:**

#### `tile_markers` - 地块标志表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| user_id | INTEGER | 用户ID |
| q, r | INTEGER | 六边形坐标 |
| marker_type | VARCHAR(50) | 标志类型（如"篝火"、"麦田"） |
| event_name | VARCHAR(100) | 关联事件名称 |
| image_path | VARCHAR(255) | 图片路径 |
| created_at | TIMESTAMP | 创建时间 |

#### `highlighted_tiles` - 高亮地块表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| user_id | INTEGER | 用户ID |
| q, r | INTEGER | 六边形坐标 |
| event_name | VARCHAR(100) | 关联事件名称 |
| created_at | TIMESTAMP | 创建时间 |

### ✅ 5. 事件完成触发标记

**修改文件:**
- `server/services/eventService.js` - 添加地块标记逻辑
- `server/routes/events.js` - 接收选中地块参数
- `client/src/api/eventsApi.js` - 传递选中地块
- `client/src/hooks/useGameSimulation.js` - 从localStorage读取选中地块
- `client/src/components/lobby/Lobby.jsx` - 选择地块时保存到localStorage

**流程:**
1. 玩家在大厅选择地块 → 保存到 localStorage
2. 进入游戏后拖拽钥匙卡完成事件
3. 后端接收到完成请求，包含选中地块坐标
4. 自动在选中地块及随机数量的周围地块（1-5个）放置标志
5. 高亮所有标记的地块
6. 返回Lobby时自动加载并显示标志和高亮

## 文件清单

### 新增文件

**后端:**
- `server/services/tileMarkerService.js` - 地块标记服务
- `server/routes/tileMarkers.js` - API路由
- `server/db/migrations/add_tile_markers.sql` - 数据库迁移
- `apply_tile_markers.sql` - 统一迁移脚本

**前端:**
- `client/src/api/tilesApi.js` - API客户端

### 修改文件

**后端:**
- `server/services/eventService.js` - 添加标记逻辑
- `server/routes/events.js` - 支持选中地块参数
- `server/index.js` - 注册tiles路由

**前端:**
- `client/src/components/lobby/HexCanvas.jsx` - 渲染标志和高亮
- `client/src/components/lobby/Lobby.jsx` - 加载标志数据
- `client/src/api/eventsApi.js` - 传递地块参数
- `client/src/hooks/useGameSimulation.js` - 完成事件时传递地块

## 部署步骤

### 1. 数据库迁移

```bash
psql -U minigame_user -d minigame_db -f apply_tile_markers.sql
```

### 2. 准备美术资源

将标志图片放入 `client/public/assets/2d/` 目录：

```
client/public/assets/2d/
├── 篝火.jpg          # 生存时代-寒冷
├── 麦田.png          # 生存时代-饥饿
├── 石碑.png          # 生存时代-纷争
├── 图书馆.png        # 城邦时代-遗忘
├── 市场.png          # 城邦时代-隔绝
└── 城墙.png          # 城邦时代-入侵
```

支持格式：`.png`, `.jpg`, `.jpeg`, `.webp`

### 3. 重启服务

```bash
./gunicorn_manager.sh restart
```

## API接口

### 获取地块标志

```bash
GET /api/tiles/markers
Authorization: Bearer <token>

Response:
{
  "markers": [
    {
      "q": 0,
      "r": 0,
      "marker_type": "篝火",
      "event_name": "寒冷",
      "image_path": "/assets/2d/篝火.jpg",
      "created_at": "2025-11-01T12:00:00Z"
    }
  ]
}
```

### 获取高亮地块

```bash
GET /api/tiles/highlights
Authorization: Bearer <token>

Response:
{
  "highlights": [
    {
      "q": 0,
      "r": 0,
      "event_name": "寒冷",
      "created_at": "2025-11-01T12:00:00Z"
    },
    {
      "q": 1,
      "r": 0,
      "event_name": "寒冷",
      "created_at": "2025-11-01T12:00:00Z"
    }
  ]
}
```

### 清除所有标志（重置游戏用）

```bash
DELETE /api/tiles/clear
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "已清除所有地块标志"
}
```

### 完成事件（自动标记地块）

```bash
POST /api/events/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "eventId": 1,
  "key": "火",
  "selectedHex": {
    "q": 5,
    "r": -3
  }
}

Response:
{
  "success": true,
  "message": "成功完成【寒冷】",
  "reward": "篝火",
  "newEra": "生存时代",
  "nextEventId": 2,
  "tileMarkers": {
    "markerPlaced": {
      "q": 5,
      "r": -3,
      "type": "篝火",
      "imagePath": "/assets/2d/篝火.jpg"
    },
    "highlightedTiles": [
      { "q": 5, "r": -3 },
      { "q": 6, "r": -3 },
      { "q": 5, "r": -2 }
    ]
  }
}
```

## 技术细节

### 六边形坐标系统

使用轴坐标系（Axial Coordinates）：
- `q` - 水平坐标
- `r` - 垂直坐标
- 第三个坐标 `s = -q - r` 可由前两个推导

### 邻近地块计算

六个方向向量：
```javascript
[
  { q: 1, r: 0 },   // 右
  { q: 1, r: -1 },  // 右上
  { q: 0, r: -1 },  // 左上
  { q: -1, r: 0 },  // 左
  { q: -1, r: 1 },  // 左下
  { q: 0, r: 1 },   // 右下
]
```

### 半径内地块计算

使用立方体坐标系统的距离公式：
```javascript
distance = (|q| + |r| + |q + r|) / 2
```

### Z轴排序（2D等距视角）

标志按Y坐标从小到大绘制，确保视觉上下方遮挡上方：
```javascript
markers.sort((a, b) => a.py - b.py)
```

## 已知限制

1. **标志图片:** 当前使用占位符绘制，需要实现图片加载器来显示实际图片
2. **性能优化:** 大量高亮地块时可能需要优化渲染（可考虑使用离屏Canvas）
3. **标志层级:** 暂未实现标志的交互（点击、悬停等）

## 后续优化建议

1. **图片加载:** 实现图片预加载和缓存机制
2. **动画效果:** 添加标志出现的动画（淡入、弹出等）
3. **标志交互:** 点击标志显示事件详情
4. **多标志支持:** 同一地块可能有多个标志时的堆叠显示
5. **性能优化:** 使用WebGL或OffscreenCanvas优化大量地块渲染

## 测试清单

- [x] 数据库表创建成功
- [x] 完成事件后自动放置标志
- [x] 标志按Y坐标正确排序
- [x] 高亮地块显示呼吸动画
- [x] 返回Lobby后标志和高亮正确加载
- [x] 清除标志功能正常
- [ ] 实际图片资源加载（需要准备图片）

## 符合设计文档要点

✅ **地块选择与标记:** 完成事件后在选中地块及周围随机地块放置标志  
✅ **Z轴遮挡:** 下方地块的标志遮挡上方地块  
✅ **永久高亮:** 带呼吸效果的金色边缘高亮  
✅ **图片资源:** 从 `assets/2d/` 目录查找对应名称的图片  
✅ **音效接口:** 已在之前实现（参见 `GAME_DESIGN_UPDATE.md`）

