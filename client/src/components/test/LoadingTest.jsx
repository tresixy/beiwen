import { useState } from 'react';

/**
 * Loading页面测试组件
 * 可以在开发环境中快速测试loading UI效果
 */
export function LoadingTest() {
    const [progress, setProgress] = useState(60);

    return (
        <div className="game-shell game-shell--loading">
            <div className="loading-panel">
                <div className="loading-title">正在加载游戏数据...</div>
                <div className="loading-subtitle">从云端同步您的游戏进度</div>
                <div className="loading-bar">
                    <div className="loading-bar__track">
                        <div 
                            className="loading-bar__fill" 
                            style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }} 
                        />
                    </div>
                    <div className="loading-bar__label">{progress}%</div>
                </div>
                
                {/* 测试控制区 */}
                <div style={{ 
                    marginTop: '40px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button 
                            onClick={() => setProgress(Math.max(0, progress - 10))}
                            style={{
                                padding: '8px 16px',
                                background: '#ff9447',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            -10%
                        </button>
                        <span style={{ 
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            textShadow: '0 2px 6px rgba(0, 0, 0, 0.9)'
                        }}>
                            调整进度
                        </span>
                        <button 
                            onClick={() => setProgress(Math.min(100, progress + 10))}
                            style={{
                                padding: '8px 16px',
                                background: '#ff9447',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            +10%
                        </button>
                    </div>
                    
                    <div style={{
                        color: 'white',
                        fontSize: '0.9rem',
                        textAlign: 'center',
                        textShadow: '0 2px 6px rgba(0, 0, 0, 0.9)',
                        maxWidth: '600px',
                        padding: '20px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '8px'
                    }}>
                        <p><strong>检查清单：</strong></p>
                        <p>✓ 能看到loading背景图吗？</p>
                        <p>✓ 能看到进度条底图（空条）吗？</p>
                        <p>✓ 进度条填充（满条）随百分比变化吗？</p>
                        <p>✓ 文字清晰可读吗？</p>
                    </div>
                </div>
            </div>
        </div>
    );
}


