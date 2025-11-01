import { useCallback, useEffect, useMemo, useState } from 'react';

import { HexCanvas } from './HexCanvas.jsx';
import { CardBookPanel } from '../game/CardBookPanel.jsx';
import { loadCardBook } from '../../data/cardBook.js';

const FEATURE_CARDS = [
    {
        id: 'solo',
        title: '单机冒险',
        icon: '🔥',
        description: '进入无尽回合，体验熔炉、职业与契约驱动的文明成长。',
        action: '开始冒险',
        badge: 'NEW',
    },
    {
        id: 'inventory',
        title: '背包',
        icon: '🎒',
        description: '查看已收集的结晶与遗物',
        action: '即将开放',
        disabled: true,
    },
    {
        id: 'coop',
        title: '协作',
        icon: '🤝',
        description: '和旅伴共同构筑文明史诗',
        action: '敬请期待',
        disabled: true,
    },
];

export function Lobby({ user, onEnterGame, onLogout }) {
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [cardBookOpen, setCardBookOpen] = useState(false);
    const [cardBook, setCardBook] = useState(() => loadCardBook());
    const [volume, setVolume] = useState(70);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 6) return '夜色尚深，谨慎前行。';
        if (hour < 12) return '晨光熹微，新的灵感正在苏醒。';
        if (hour < 18) return '黄昏未至，熔炉正等待你的火花。';
        return '星辉映照，今晚的合成将格外璀璨。';
    }, []);

    const getTerrainName = (hex) => {
        if (!hex) return '';
        const noise = ((hex.q * 374761393) + (hex.r * 668265263) + 12345) % 2147483647;
        const value = (noise / 2147483647 + 1) / 2;
        const dist = Math.sqrt(hex.q * hex.q + hex.r * hex.r);
        
        if (dist < 5) return '草原';
        if (value < 0.2) return '水域';
        if (value < 0.6) return '草原';
        if (value < 0.75) return '森林';
        if (value < 0.85) return '沙漠';
        return '山脉';
    };

    const handleSelectHex = useCallback((hex) => {
        setSelectedLocation(hex);
    }, []);

    const handleOpenCardBook = useCallback(() => {
        setCardBook(loadCardBook());
        setCardBookOpen(true);
    }, []);

    const handleCloseCardBook = useCallback(() => {
        setCardBookOpen(false);
    }, []);

    useEffect(() => {
        if (!cardBookOpen) {
            return;
        }
        setCardBook(loadCardBook());
    }, [cardBookOpen]);

    return (
        <div className="lobby-shell">
            <HexCanvas 
                width={1920} 
                height={1080}
                onSelectHex={handleSelectHex}
            />
            
            <div className="lobby-ui">
                {/* 左上角用户信息面板 */}
                <div className="lobby-user-panel">
                    <div className="user-panel-avatar">
                        {(user?.username ?? '旅')[0].toUpperCase()}
                    </div>
                    <div className="user-panel-stats">
                        <div className="stat-item">
                            <span className="stat-label">拥有</span>
                            <span className="stat-value">0</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">{user?.username ?? '旅者'}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">成就</span>
                        </div>
                    </div>
                </div>

                {/* 顶部中央位置信息 */}
                {selectedLocation && (
                    <div className="lobby-top-center">
                        <div className="location-badge">
                            <span className="location-name">{getTerrainName(selectedLocation)}</span>
                            <span className="location-coords">({selectedLocation.q}, {selectedLocation.r})</span>
                        </div>
                    </div>
                )}

                {/* 左下角功能按钮 */}
                <div className="lobby-bottom-left">
                    <button 
                        className="sci-btn"
                        onClick={onEnterGame}
                    >
                        <span className="sci-btn-icon">🚀</span>
                        <span className="sci-btn-text">启程探索</span>
                    </button>
                    <button className="sci-btn disabled">
                        <span className="sci-btn-icon">🏪</span>
                        <span className="sci-btn-text">交易市场</span>
                    </button>
                    <button className="sci-btn disabled">
                        <span className="sci-btn-icon">📊</span>
                        <span className="sci-btn-text">排行榜</span>
                    </button>
                </div>

                {/* 右下角功能按钮 */}
                <div className="lobby-bottom-right">
                    <button 
                        className="sci-btn-circle"
                        onClick={handleOpenCardBook}
                        title="背包"
                    >
                        🎒
                    </button>
                    <button 
                        className="sci-btn-circle"
                        onClick={() => setShowSettings(true)}
                        title="设置"
                    >
                        ⚙️
                    </button>
                </div>
            </div>

            <CardBookPanel open={cardBookOpen} cardBook={cardBook} onClose={handleCloseCardBook} />

            {showSettings && (
                <div className="lobby-settings-overlay" onClick={() => setShowSettings(false)}>
                    <div className="lobby-settings-panel" onClick={(e) => e.stopPropagation()}>
                        <h3>⚙️ 设置</h3>
                        <div className="settings-item">
                            <label>🔊 音量</label>
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={volume}
                                onChange={(e) => setVolume(parseInt(e.target.value))}
                            />
                            <span className="volume-value">{volume}%</span>
                        </div>
                        <div className="settings-actions">
                            <button 
                                type="button" 
                                className="settings-logout" 
                                onClick={onLogout}
                            >
                                🚪 离开
                            </button>
                            <button 
                                type="button" 
                                className="settings-close" 
                                onClick={() => setShowSettings(false)}
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

