# UI组件使用示例

## 完整集成示例

### 1. 在游戏中显示时代升级提醒

```jsx
import { useState, useEffect } from 'react';
import { EraUpgradeNotification } from '@/components/ui';

function GameComponent() {
    const [showEraUpgrade, setShowEraUpgrade] = useState(false);
    const [currentEra, setCurrentEra] = useState('');
    
    // 监听时代变化
    useEffect(() => {
        // 假设你有一个era状态从游戏逻辑中获取
        if (era !== currentEra && currentEra) {
            setCurrentEra(era);
            setShowEraUpgrade(true);
        }
    }, [era]);
    
    return (
        <div>
            {/* 游戏主界面 */}
            
            {/* 时代升级提醒（自动3秒后关闭） */}
            {showEraUpgrade && (
                <EraUpgradeNotification 
                    era={currentEra} 
                    onClose={() => setShowEraUpgrade(false)} 
                />
            )}
        </div>
    );
}
```

### 2. 在Lobby中添加世界观介绍按钮

```jsx
import { useState } from 'react';
import { WorldIntro } from '@/components/ui';

function Lobby({ user, token, onEnterGame }) {
    const [showWorldIntro, setShowWorldIntro] = useState(false);
    
    return (
        <div className="lobby-shell">
            <div className="lobby-ui">
                {/* 其他UI元素 */}
                
                {/* 左下角功能按钮 */}
                <div className="lobby-bottom-left">
                    <button className="sci-btn" onClick={onEnterGame}>
                        <span className="sci-btn-icon">🚀</span>
                        <span className="sci-btn-text">启程探索</span>
                    </button>
                    <button 
                        className="sci-btn" 
                        onClick={() => setShowWorldIntro(true)}
                    >
                        <span className="sci-btn-icon">📖</span>
                        <span className="sci-btn-text">世界观</span>
                    </button>
                </div>
            </div>
            
            {/* 世界观介绍弹窗 */}
            {showWorldIntro && (
                <WorldIntro onClose={() => setShowWorldIntro(false)} />
            )}
        </div>
    );
}
```

### 3. 游戏结束时显示结算界面

```jsx
import { useState, useEffect } from 'react';
import { GameResult } from '@/components/ui';

function GameShell({ user, token, onLogout, onBackLobby }) {
    const [gameEnded, setGameEnded] = useState(false);
    const [gameResult, setGameResult] = useState(null);
    
    // 监听游戏结束
    useEffect(() => {
        // 游戏逻辑判断游戏是否结束
        if (isGameOver) {
            setGameResult({
                result: isVictory ? 'victory' : 'defeat',
                score: finalScore,
                era: currentEra
            });
            setGameEnded(true);
        }
    }, [isGameOver]);
    
    const handleRestart = () => {
        setGameEnded(false);
        setGameResult(null);
        // 重启游戏逻辑
        restartGame();
    };
    
    const handleBackToLobby = () => {
        setGameEnded(false);
        setGameResult(null);
        onBackLobby();
    };
    
    return (
        <div className="game-shell">
            {/* 游戏主界面 */}
            
            {/* 结算界面 */}
            {gameEnded && gameResult && (
                <GameResult 
                    result={gameResult.result}
                    score={gameResult.score}
                    era={gameResult.era}
                    onRestart={handleRestart}
                    onBackToLobby={handleBackToLobby}
                />
            )}
        </div>
    );
}
```

### 4. 显示事件危机UI

```jsx
import { useState } from 'react';
import { EventCrisisPanel } from '@/components/ui';

function GameComponent() {
    const [crisisEvent, setCrisisEvent] = useState(null);
    
    // 当触发危机事件时
    const handleCrisisEvent = (event) => {
        if (event.type === 'crisis') {
            setCrisisEvent(event);
        }
    };
    
    const handleCompleteCrisis = () => {
        // 处理危机完成逻辑
        completeEvent(crisisEvent.id);
        setCrisisEvent(null);
    };
    
    return (
        <div>
            {/* 游戏主界面 */}
            
            {/* 危机事件面板 */}
            {crisisEvent && (
                <EventCrisisPanel 
                    event={crisisEvent}
                    onComplete={handleCompleteCrisis}
                    onClose={() => setCrisisEvent(null)}
                />
            )}
        </div>
    );
}
```

### 5. 完整游戏流程集成

```jsx
import { useState, useEffect } from 'react';
import { 
    WorldIntro, 
    EraUpgradeNotification, 
    GameResult,
    EventCrisisPanel 
} from '@/components/ui';

function CompleteGameFlow() {
    // UI状态
    const [showWorldIntro, setShowWorldIntro] = useState(false);
    const [showEraUpgrade, setShowEraUpgrade] = useState(false);
    const [gameEnded, setGameEnded] = useState(false);
    const [crisisEvent, setCrisisEvent] = useState(null);
    
    // 游戏状态
    const [currentEra, setCurrentEra] = useState('生存时代');
    const [gameResult, setGameResult] = useState(null);
    const [prevEra, setPrevEra] = useState('');
    
    // 监听时代升级
    useEffect(() => {
        if (currentEra !== prevEra && prevEra) {
            setShowEraUpgrade(true);
            setPrevEra(currentEra);
        }
    }, [currentEra, prevEra]);
    
    // 监听游戏结束
    useEffect(() => {
        // 从游戏逻辑获取是否结束
        if (isGameOver) {
            setGameResult({
                result: checkVictory() ? 'victory' : 'defeat',
                score: calculateScore(),
                era: currentEra
            });
            setGameEnded(true);
        }
    }, [isGameOver, currentEra]);
    
    // 监听危机事件
    useEffect(() => {
        // 从游戏逻辑获取当前活跃事件
        if (activeEvent && activeEvent.type === 'crisis') {
            setCrisisEvent(activeEvent);
        }
    }, [activeEvent]);
    
    return (
        <div className="game-container">
            {/* 主游戏界面 */}
            <GameMainUI />
            
            {/* 世界观介绍（可选，通常在第一次进入时显示） */}
            {showWorldIntro && (
                <WorldIntro onClose={() => setShowWorldIntro(false)} />
            )}
            
            {/* 时代升级提醒 */}
            {showEraUpgrade && (
                <EraUpgradeNotification 
                    era={currentEra} 
                    onClose={() => setShowEraUpgrade(false)} 
                />
            )}
            
            {/* 危机事件 */}
            {crisisEvent && (
                <EventCrisisPanel 
                    event={crisisEvent}
                    onComplete={() => {
                        completeEvent(crisisEvent.id);
                        setCrisisEvent(null);
                    }}
                    onClose={() => setCrisisEvent(null)}
                />
            )}
            
            {/* 游戏结算 */}
            {gameEnded && gameResult && (
                <GameResult 
                    result={gameResult.result}
                    score={gameResult.score}
                    era={gameResult.era}
                    onRestart={handleRestart}
                    onBackToLobby={handleBackToLobby}
                />
            )}
        </div>
    );
}
```

## 注意事项

1. **层级管理**: 确保各UI组件的显示顺序正确，z-index已预设
2. **状态管理**: 使用useState管理各个UI组件的显示/隐藏状态
3. **回调处理**: 确保onClose等回调函数正确处理状态变更
4. **动画效果**: 所有组件都内置了进入/退出动画，无需额外配置
5. **响应式**: 所有UI组件已适配不同屏幕尺寸

## 样式自定义

如需调整UI组件的位置、大小等，可在 `/client/src/styles/app.css` 中找到对应的CSS类进行修改：

- 世界观介绍: `.world-intro-panel`
- 时代升级: `.era-upgrade-notification`
- 游戏结算: `.game-result-panel`
- 危机事件: `.event-crisis-panel`

## 测试建议

1. 测试不同屏幕尺寸下的显示效果
2. 验证透明通道是否正常显示
3. 检查UI层叠顺序是否正确
4. 确认动画效果流畅
5. 测试触摸设备上的交互


