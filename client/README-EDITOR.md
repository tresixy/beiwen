# 地图编辑器使用说明

## 访问编辑器

在浏览器中访问：`http://localhost:5173/editor`

## 使用方法

### 基本操作
- **左键点击**：在网格上放置选中的地块类型，再次点击已有地块可删除
- **右键拖动**：移动视图位置
- **鼠标滚轮**：缩放视图

### 地块类型
编辑器支持以下地块类型：
- 海洋 (ocean)
- 草原 (grassland)
- 森林 (forest)
- 山脉 (mountain)
- 沙漠 (desert)
- 雪地 (snow)

### 导出/导入配置

#### 导出配置
1. 点击"导出配置"按钮
2. 保存 `map-config.json` 文件到 `/root/minigame/client/public/` 目录

#### 导入配置
1. 点击"导入配置"按钮
2. 选择之前导出的 `.json` 文件
3. 编辑器会加载该配置并显示所有地块

### 在游戏中使用配置

将导出的 `map-config.json` 文件放到 `/root/minigame/client/public/` 目录下，然后修改 `HexCanvas.jsx` 组件以加载此配置：

```javascript
// 在 HexCanvas.jsx 中添加
useEffect(() => {
    fetch('/map-config.json')
        .then(res => res.json())
        .then(data => {
            // 将配置应用到地图
            const map = new Map();
            Object.entries(data).forEach(([key, value]) => {
                map.set(key, value);
            });
            // 更新 terrainMap
        })
        .catch(err => console.warn('加载地图配置失败:', err));
}, []);
```

## 配置文件格式

```json
{
  "q,r": { "terrain": "grassland" },
  "0,0": { "terrain": "ocean" },
  "1,0": { "terrain": "forest" }
}
```

- `q,r`：地块的 axial 坐标
- `terrain`：地块类型（ocean, grassland, forest, mountain, desert, snow）

## 坐标系统

编辑器使用 Axial 坐标系统（q, r）：
- `q`：水平轴坐标
- `r`：垂直轴坐标
- 中心点为 `(0,0)`

## 快捷键

- `Ctrl + S`：快速导出配置（未实现，可自行添加）
- `Ctrl + O`：快速导入配置（未实现，可自行添加）

