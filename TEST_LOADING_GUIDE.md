# Loading页面测试指南

## 问题诊断

Loading页面背景不显示的原因是 `dont-starve-style.css` 的样式覆盖了背景图设置。

## 已修复的内容

### 1. 在 `app.css` 中
```css
/* 禁用loading状态下的伪元素 */
.game-shell--loading::before {
    display: none;
}

.game-shell--loading {
    background-image: url('/assets/UI/loading背景.png');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-color: #2d1810;
}
```

### 2. 在 `dont-starve-style.css` 中
```css
/* Loading状态不使用默认背景 */
.game-shell--loading {
    background: none;
}
```

### 3. 移除了 `.loading-panel` 的遮挡背景

## 测试方法

### 方法1: 直接在浏览器查看图片

1. 确保服务器运行中
2. 在浏览器中访问以下URL查看图片是否能加载：
   - `http://43.161.234.121:端口号/assets/UI/loading背景.png`
   - `http://43.161.234.121:端口号/assets/UI/loading进度条空条.png`
   - `http://43.161.234.121:端口号/assets/UI/loading进度条满条.png`

### 方法2: 在游戏中添加测试按钮

在 `client/src/App.jsx` 中临时添加：

```jsx
import { useState } from 'react';

function App() {
    const [showLoadingTest, setShowLoadingTest] = useState(false);
    
    // 开发环境添加测试按钮
    const isDev = import.meta.env.DEV;
    
    if (showLoadingTest) {
        return (
            <div className="game-shell game-shell--loading">
                <div className="loading-panel">
                    <div className="loading-title">正在加载游戏数据...</div>
                    <div className="loading-subtitle">从云端同步您的游戏进度</div>
                    <div className="loading-bar">
                        <div className="loading-bar__track">
                            <div className="loading-bar__fill" style={{ width: '60%' }} />
                        </div>
                        <div className="loading-bar__label">60%</div>
                    </div>
                    <button 
                        onClick={() => setShowLoadingTest(false)}
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            background: '#ff9447',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        关闭测试
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <>
            {isDev && (
                <button 
                    onClick={() => setShowLoadingTest(true)}
                    style={{
                        position: 'fixed',
                        top: '10px',
                        right: '10px',
                        zIndex: 9999,
                        padding: '10px 20px',
                        background: '#ff6b35',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    测试Loading页面
                </button>
            )}
            {/* 原有的App内容 */}
        </>
    );
}
```

### 方法3: 启动开发服务器测试

```bash
# 进入客户端目录
cd /root/minigame/client

# 启动开发服务器
npm run dev

# 服务器启动后访问
# http://localhost:5173 (本地)
# 或
# http://43.161.234.121:5173 (远程)
```

### 方法4: 使用浏览器开发者工具检查

1. 打开游戏，触发loading状态
2. 按 F12 打开开发者工具
3. 切换到 Elements/元素 标签
4. 找到 `<div class="game-shell game-shell--loading">` 元素
5. 查看 Computed/计算后 标签中的 background-image 属性
6. 切换到 Network/网络 标签，查看图片是否成功加载

## 预期效果

修复后的loading页面应该显示：

```
┌─────────────────────────────────┐
│   loading背景.png (全屏背景)      │
│                                 │
│   正在加载游戏数据...            │
│   从云端同步您的游戏进度         │
│                                 │
│   [进度条空条────────────]       │
│   [进度条满条████        ]       │
│   60%                           │
│                                 │
└─────────────────────────────────┘
```

## CSS优先级说明

由于CSS文件加载顺序：
1. `app.css` (先加载)
2. `dont-starve-style.css` (后加载，优先级更高)

因此需要在 `dont-starve-style.css` 中重写 `.game-shell--loading` 的背景样式。

## 如果还是不显示

### 检查1: 文件路径
```bash
ls -la /root/minigame/client/public/assets/UI/loading*.png
```

应该看到三个文件：
- loading背景.png
- loading进度条空条.png  
- loading进度条满条.png

### 检查2: 浏览器缓存
- 强制刷新: Ctrl + Shift + R (Windows/Linux)
- 或在开发者工具中勾选 "Disable cache"

### 检查3: CSS是否正确加载
在浏览器开发者工具的 Sources 标签中：
- 找到 `app.css`
- 搜索 `.game-shell--loading`
- 确认背景图设置存在

### 检查4: 图片是否损坏
```bash
file /root/minigame/client/public/assets/UI/loading背景.png
```

应该显示: PNG image data

## 快速验证命令

```bash
# 1. 检查图片文件
ls -lh /root/minigame/client/public/assets/UI/loading*.png

# 2. 检查CSS文件修改时间
ls -lh /root/minigame/client/src/styles/*.css

# 3. 搜索CSS中的loading样式
grep -n "game-shell--loading" /root/minigame/client/src/styles/*.css
```

## 最终修复验证

修复成功后：
- ✅ loading背景.png 全屏显示
- ✅ 进度条空条显示
- ✅ 进度条满条根据进度填充
- ✅ 文字清晰可读（白色+多层黑色阴影）
- ✅ 无其他背景色遮挡


