import { useState } from 'react';
import { 
    WorldIntro, 
    EraUpgradeNotification, 
    GameResult,
    EventCrisisPanel 
} from '../ui';

/**
 * UI组件预览测试页面
 * 用于测试所有新集成的UI组件
 */
export function UIPreview() {
    const [activePreview, setActivePreview] = useState(null);

    const testEvent = {
        name: '资源匮乏危机',
        description: '长期的干旱导致粮食严重不足，人民开始出现饥荒，需要立即采取行动！'
    };

    return (
        <div style={{ 
            padding: '20px', 
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <h1 style={{ color: 'white', textAlign: 'center', marginBottom: '40px' }}>
                UI组件预览测试
            </h1>

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                {/* 世界观介绍 */}
                <button
                    onClick={() => setActivePreview('world-intro')}
                    style={{
                        padding: '20px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        border: '3px solid white',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                >
                    📖 世界观介绍
                </button>

                {/* 时代升级提醒 */}
                <button
                    onClick={() => setActivePreview('era-upgrade')}
                    style={{
                        padding: '20px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        border: '3px solid white',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                >
                    🎉 时代升级提醒
                </button>

                {/* 胜利结算 */}
                <button
                    onClick={() => setActivePreview('victory')}
                    style={{
                        padding: '20px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        border: '3px solid white',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                >
                    🏆 胜利结算
                </button>

                {/* 失败结算 */}
                <button
                    onClick={() => setActivePreview('defeat')}
                    style={{
                        padding: '20px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        border: '3px solid white',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                >
                    💔 失败结算
                </button>

                {/* 危机事件 */}
                <button
                    onClick={() => setActivePreview('crisis')}
                    style={{
                        padding: '20px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        border: '3px solid white',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                >
                    ⚠️ 危机事件
                </button>
            </div>

            {/* 渲染激活的预览 */}
            {activePreview === 'world-intro' && (
                <WorldIntro onClose={() => setActivePreview(null)} />
            )}

            {activePreview === 'era-upgrade' && (
                <EraUpgradeNotification 
                    era="工业时代" 
                    onClose={() => setActivePreview(null)} 
                />
            )}

            {activePreview === 'victory' && (
                <GameResult 
                    result="victory"
                    score={2500}
                    era="信息时代"
                    onRestart={() => {
                        alert('重新开始游戏');
                        setActivePreview(null);
                    }}
                    onBackToLobby={() => {
                        alert('返回大厅');
                        setActivePreview(null);
                    }}
                />
            )}

            {activePreview === 'defeat' && (
                <GameResult 
                    result="defeat"
                    score={850}
                    era="农业时代"
                    onRestart={() => {
                        alert('重新开始游戏');
                        setActivePreview(null);
                    }}
                    onBackToLobby={() => {
                        alert('返回大厅');
                        setActivePreview(null);
                    }}
                />
            )}

            {activePreview === 'crisis' && (
                <EventCrisisPanel 
                    event={testEvent}
                    onComplete={() => {
                        alert('危机已处理');
                        setActivePreview(null);
                    }}
                    onClose={() => setActivePreview(null)}
                />
            )}

            <div style={{ 
                marginTop: '40px', 
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: 'white',
                maxWidth: '1200px',
                margin: '40px auto 0'
            }}>
                <h2>使用说明</h2>
                <p>点击上方按钮预览各个UI组件效果</p>
                <ul>
                    <li>所有UI图像都支持透明通道</li>
                    <li>已按正确的z-index层级配置</li>
                    <li>支持响应式布局和动画效果</li>
                    <li>点击背景或关闭按钮可关闭弹窗</li>
                </ul>
            </div>
        </div>
    );
}


