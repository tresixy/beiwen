# UI组件测试说明

## 测试页面

已创建UI组件预览测试页面: `/client/src/components/test/UIPreview.jsx`

## 如何使用测试页面

### 方法1: 临时添加到App.jsx

在 `client/src/App.jsx` 中临时添加测试组件：

```jsx
import { UIPreview } from './components/test/UIPreview';

function App() {
    // 添加一个测试开关
    const [showUITest, setShowUITest] = useState(false);
    
    // 临时测试：按下特定键显示测试页面
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'F2') {
                setShowUITest(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);
    
    if (showUITest) {
        return <UIPreview />;
    }
    
    // 原有的App逻辑
    return (
        // ...
    );
}
```

### 方法2: 在开发环境中添加测试路由

如果项目使用React Router，可以添加一个测试路由：

```jsx
import { UIPreview } from './components/test/UIPreview';

// 在路由配置中添加
<Route path="/ui-test" element={<UIPreview />} />
```

然后访问 `http://localhost:5173/ui-test` (或你的开发服务器地址)

### 方法3: 直接在Lobby中添加测试按钮

在 `client/src/components/lobby/Lobby.jsx` 中添加：

```jsx
import { useState } from 'react';
import { UIPreview } from '../test/UIPreview';

function Lobby() {
    const [showTest, setShowTest] = useState(false);
    
    // 在开发环境显示测试按钮
    const isDev = import.meta.env.DEV;
    
    return (
        <div className="lobby-shell">
            {/* 其他内容 */}
            
            {isDev && (
                <button 
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
                    onClick={() => setShowTest(!showTest)}
                >
                    {showTest ? '关闭UI测试' : 'UI测试'}
                </button>
            )}
            
            {showTest && <UIPreview />}
        </div>
    );
}
```

## 测试检查清单

使用测试页面时，请检查以下内容：

### 1. 世界观介绍
- [ ] 图像正常加载
- [ ] 透明通道正常显示
- [ ] 关闭按钮可用
- [ ] 点击背景可关闭
- [ ] 进入动画流畅

### 2. 时代升级提醒
- [ ] 图像居中显示
- [ ] 时代名称正确显示
- [ ] 3秒后自动关闭
- [ ] 发光动画效果正常
- [ ] 缩放动画流畅

### 3. 胜利结算
- [ ] 胜利图像正确显示
- [ ] 得分和时代信息清晰
- [ ] 按钮可点击
- [ ] 悬停效果正常
- [ ] 透明度正确

### 4. 失败结算
- [ ] 失败图像正确显示
- [ ] 得分和时代信息清晰
- [ ] 按钮可点击
- [ ] 悬停效果正常
- [ ] 透明度正确

### 5. 危机事件
- [ ] 事件图像正确显示
- [ ] 文字内容清晰可读
- [ ] 按钮可交互
- [ ] 点击背景可关闭
- [ ] 模糊背景效果正常

### 6. 响应式测试
- [ ] 桌面端 (1920x1080)
- [ ] 平板端 (768x1024)
- [ ] 手机端 (375x667)
- [ ] 超宽屏 (2560x1440)

### 7. 性能测试
- [ ] 图像加载速度
- [ ] 动画帧率稳定
- [ ] 无明显卡顿
- [ ] 内存占用正常

## 已知问题排查

### 图像不显示
1. 检查图像路径是否正确: `/assets/UI/xxx.png`
2. 确认图像文件存在于 `client/public/assets/UI/` 目录
3. 检查浏览器控制台是否有404错误

### 透明通道不正确
1. 确认PNG图像包含alpha通道
2. 检查CSS中是否有背景色覆盖
3. 验证父元素的opacity设置

### 层级问题
1. 检查z-index设置
2. 确认父元素没有创建新的层叠上下文
3. 验证position属性设置

### 动画不流畅
1. 检查CSS动画是否正确定义
2. 确认没有触发大量重排
3. 使用浏览器性能工具分析

## 生产环境部署

测试完成后，部署到生产环境前请：

1. 移除测试代码和测试按钮
2. 确认所有UI图像已优化
3. 验证所有路径使用正确
4. 进行最终的跨浏览器测试

## 技术支持

如遇到问题，请查看：
- `UI_INTEGRATION.md` - UI集成说明文档
- `UI_USAGE_EXAMPLES.md` - 使用示例文档
- `client/src/styles/app.css` - UI样式定义


