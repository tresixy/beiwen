# UI组件集成说明

## 已集成的UI图像

所有UI图像位于 `/client/public/assets/UI/` 目录下，已成功集成到游戏各个界面。

### 1. 登录界面 (登录.png)
- **位置**: `AuthScreen` 组件
- **CSS类**: `.auth-screen`
- **说明**: 作为登录界面的背景图，支持透明通道

### 2. 主页 (主页.png)
- **位置**: `Lobby` 组件
- **CSS类**: `.lobby-shell`
- **说明**: 作为游戏大厅的背景图

### 3. 游戏内界面 (局内.png)
- **位置**: `GameShell` 组件 
- **CSS类**: `.game-screen`
- **说明**: 作为游戏主界面的背景图

### 4. 加载界面 (loading背景.png, loading进度条空条.png, loading进度条满条.png)
- **位置**: `GameShell` 加载状态
- **CSS类**: `.game-shell--loading`, `.loading-bar__track`, `.loading-bar__fill`
- **说明**: 
  - loading背景.png: 加载界面背景
  - loading进度条空条.png: 进度条底图
  - loading进度条满条.png: 进度条填充图

### 5. 背包界面 (背包物品页.png, 背包钥匙页.png)
- **位置**: `CardBookPanel` 组件
- **CSS类**: `.book-page-left`, `.book-page-right`
- **说明**: 
  - 背包钥匙页.png: 背包左页背景
  - 背包物品页.png: 背包右页背景

### 6. 世界观介绍 (世界观介绍.png)
- **组件**: `WorldIntro`
- **路径**: `/client/src/components/common/WorldIntro.jsx`
- **CSS类**: `.world-intro-panel`
- **使用示例**:
```jsx
import { WorldIntro } from '@/components/ui';

function MyComponent() {
    const [showIntro, setShowIntro] = useState(false);
    
    return (
        <>
            <button onClick={() => setShowIntro(true)}>查看世界观</button>
            {showIntro && <WorldIntro onClose={() => setShowIntro(false)} />}
        </>
    );
}
```

### 7. 文明升级提醒 (局内文明升级提醒.png)
- **组件**: `EraUpgradeNotification`
- **路径**: `/client/src/components/game/EraUpgradeNotification.jsx`
- **CSS类**: `.era-upgrade-notification`
- **使用示例**:
```jsx
import { EraUpgradeNotification } from '@/components/ui';

function GameComponent() {
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [currentEra, setCurrentEra] = useState('');
    
    // 当时代升级时
    useEffect(() => {
        if (eraChanged) {
            setCurrentEra(newEra);
            setShowUpgrade(true);
        }
    }, [eraChanged]);
    
    return (
        <>
            {/* 游戏内容 */}
            {showUpgrade && (
                <EraUpgradeNotification 
                    era={currentEra} 
                    onClose={() => setShowUpgrade(false)} 
                />
            )}
        </>
    );
}
```

### 8. 事件危机 (局内事件危机.png)
- **CSS类**: `.event-crisis-overlay`, `.event-crisis-panel`
- **说明**: 样式已定义，可用于事件系统集成
- **建议用法**: 在现有事件组件中添加 `event-crisis-overlay` 和 `event-crisis-panel` 类名

### 9. 结算界面 (结算胜利.png, 结算胜失败.png)
- **组件**: `GameResult`
- **路径**: `/client/src/components/game/GameResult.jsx`
- **CSS类**: `.game-result-panel.victory`, `.game-result-panel.defeat`
- **使用示例**:
```jsx
import { GameResult } from '@/components/ui';

function GameEndComponent() {
    return (
        <GameResult 
            result="victory"  // 或 "defeat"
            score={1500}
            era="信息时代"
            onRestart={handleRestart}
            onBackToLobby={handleBackToLobby}
        />
    );
}
```

## UI层叠说明

所有UI图像均带透明通道，已按照正确的z-index层级配置：

- 加载界面: `z-index: 2500`
- 结算界面: `z-index: 2500`
- 世界观介绍: `z-index: 2000`
- 文明升级提醒: `z-index: 1800`
- 事件危机: `z-index: 1600`
- 游玩指南: `z-index: 1500`
- 设置面板: `z-index: 1000`
- HUD: `z-index: 1000`
- 背包: `z-index: 900`

## 样式特性

所有新增UI组件支持：
- ✅ 透明通道显示
- ✅ 响应式布局
- ✅ 进入/退出动画
- ✅ 悬停交互效果
- ✅ 适配不同屏幕尺寸

## 快速导入

所有UI组件已统一导出，可通过以下方式导入：

```jsx
import { WorldIntro, EraUpgradeNotification, GameResult } from '@/components/ui';
```

## 注意事项

1. 所有UI图像路径使用相对public目录的路径: `/assets/UI/xxx.png`
2. 图像加载采用 `background-image` 方式，保持透明通道
3. 使用 `background-size: cover` 或 `contain` 确保适配不同屏幕
4. 所有弹窗组件支持点击背景关闭（除文明升级提醒自动关闭外）


