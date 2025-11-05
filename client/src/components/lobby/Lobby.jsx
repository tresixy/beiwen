import { useCallback, useEffect, useMemo, useState, useRef } from 'react';

import { HexCanvas, REGION_DEFS } from './HexCanvas.jsx';
import { CardBookPanel } from '../game/CardBookPanel.jsx';
import { InventoryPanel } from '../game/InventoryPanel.jsx';
import { loadCardBook, persistCardBook } from '../../data/cardBook.js';
import { getGameState } from '../../services/gameStateApi.js';
import { getUserMarkers, getUserHighlights } from '../../api/tilesApi.js';
import { getDeckState } from '../../api/deckApi.js';

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

export function Lobby({ user, token, onEnterGame, onLogout, onEnterCardsDatabase, onOpenPlayerArchives }) {
    const containerRef = useRef(null);
    const frameRef = useRef(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [cardBookOpen, setCardBookOpen] = useState(false);
    const [inventoryOpen, setInventoryOpen] = useState(false);
    const [cardBook, setCardBook] = useState(() => loadCardBook());
    const [volume, setVolume] = useState(70);
    const [era, setEra] = useState('生存时代');
    const USER_ICONS = useMemo(() => ['01.webp', '02.webp', '03.webp', '04.webp', '05.webp'], []);
    const [userIcon, setUserIcon] = useState(() => {
        if (typeof window === 'undefined') return '01.webp';
        const saved = localStorage.getItem('userIcon');
        if (saved) return saved;
        const random = ['01.webp', '02.webp', '03.webp', '04.webp', '05.webp'][Math.floor(Math.random() * 5)];
        try { localStorage.setItem('userIcon', random); } catch {}
        return random;
    });
    const [iconPickerOpen, setIconPickerOpen] = useState(false);
    const [markers, setMarkers] = useState([]);
    const [permanentHighlights, setPermanentHighlights] = useState([]); // 永久高亮（沙盘奖励）
    const [temporaryHighlights, setTemporaryHighlights] = useState([]); // 临时区域高亮
    const [regionToTiles, setRegionToTiles] = useState(null);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [frameSize, setFrameSize] = useState({ width: '100%', height: '100%' });
    const [canvasSize, setCanvasSize] = useState(() => {
        if (typeof window === 'undefined') {
            return { width: 1920, height: 1080 };
        }
        return { width: 1920, height: 1080 };
    });

    const isAdmin = useMemo(() => user?.role === 'admin', [user]);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 6) return '夜色尚深，谨慎前行。';
        if (hour < 12) return '晨光熹微，新的灵感正在苏醒。';
        if (hour < 18) return '黄昏未至，熔炉正等待你的火花。';
        return '星辉映照，今晚的合成将格外璀璨。';
    }, []);

    const getTerrainName = (hex) => {
        if (!hex) return '';
        
        // 地形类型中文映射
        const terrainNameMap = {
            ocean: '海洋',
            grassland: '草原',
            forest: '森林',
            mountain: '山脉',
            desert: '沙漠',
            snow: '雪地',
            water: '水域'
        };
        
        return terrainNameMap[hex.terrain] || '未知';
    };

    const handleSelectHex = useCallback((hex) => {
        // 检查该地块是否已经被点亮（永久占领）
        const isHighlighted = permanentHighlights.some(tile => tile.q === hex.q && tile.r === hex.r);
        
        if (isHighlighted) {
            console.log('🚫 该地块已被点亮，无法再次选择', hex);
            return; // 不允许选择已点亮的地块
        }
        
        setSelectedLocation(hex);
        // 保存到localStorage供游戏中使用
        localStorage.setItem('selectedHex', JSON.stringify(hex));
    }, [permanentHighlights]);

    const toggleIconPicker = useCallback(() => {
        setIconPickerOpen((open) => !open);
    }, []);

    const chooseIcon = useCallback((icon) => {
        setUserIcon(icon);
        if (typeof window !== 'undefined') {
            try { localStorage.setItem('userIcon', icon); } catch {}
        }
        setIconPickerOpen(false);
    }, []);

    const handleOpenCardBook = useCallback(() => {
        setCardBook(loadCardBook());
        setCardBookOpen(true);
    }, []);

    const handleCloseCardBook = useCallback(() => {
        setCardBookOpen(false);
    }, []);

    const handleOpenInventory = useCallback(() => {
        setCardBook(loadCardBook());
        setInventoryOpen(true);
    }, []);

    const handleCloseInventory = useCallback(() => {
        setInventoryOpen(false);
    }, []);

    const handleRegionMapReady = useCallback((regionMap) => {
        setRegionToTiles(regionMap);
    }, []);

    const handleRegionClick = useCallback((regionKey) => {
        if (!regionToTiles) return;
        
        if (selectedRegion === regionKey) {
            // 取消选中：只清空临时高亮，保留永久高亮
            setSelectedRegion(null);
            setTemporaryHighlights([]);
            setSelectedLocation(null);
            localStorage.removeItem('selectedHex');
            localStorage.removeItem('selectedRegion');
            localStorage.removeItem('selectedRegionTiles');
        } else {
            // 选中新区域：只设置临时高亮
            setSelectedRegion(regionKey);
            const tiles = regionToTiles.get(regionKey) || [];
            setTemporaryHighlights(tiles);
            
            // 自动选择该区域的第一个地块作为起始位置（优先选择未被永久点亮的地块）
            if (tiles.length > 0) {
                const availableTile = tiles.find(t => 
                    !permanentHighlights.some(p => p.q === t.q && p.r === t.r)
                ) || tiles[0];
                
                setSelectedLocation(availableTile);
                localStorage.setItem('selectedHex', JSON.stringify(availableTile));
                localStorage.setItem('selectedRegion', regionKey);
                localStorage.setItem('selectedRegionTiles', JSON.stringify(tiles));
            }
        }
    }, [regionToTiles, selectedRegion, permanentHighlights]);

    useEffect(() => {
        if (!cardBookOpen) {
            return;
        }
        setCardBook(loadCardBook());
    }, [cardBookOpen]);

    useEffect(() => {
        // 加载主页webp获取其尺寸
        const img = new Image();
        img.src = '/assets/UI/主页.webp';
        img.onload = () => {
            const calcSize = () => {
                if (typeof window === 'undefined' || !containerRef.current) {
                    return;
                }
                const container = containerRef.current;
                const rect = container.getBoundingClientRect();
                
                // 计算主页webp的contain尺寸
                const containerWidth = rect.width;
                const containerHeight = rect.height;
                const imgRatio = img.naturalWidth / img.naturalHeight;
                const containerRatio = containerWidth / containerHeight;
                
                let frameWidth, frameHeight;
                if (containerRatio > imgRatio) {
                    // 容器更宽，以高度为准
                    frameHeight = containerHeight;
                    frameWidth = frameHeight * imgRatio;
                } else {
                    // 容器更高，以宽度为准
                    frameWidth = containerWidth;
                    frameHeight = frameWidth / imgRatio;
                }
                
                setFrameSize({ width: frameWidth, height: frameHeight });
                // canvas尺寸也设置为frame尺寸
                setCanvasSize({ width: Math.ceil(frameWidth), height: Math.ceil(frameHeight) });
            };

            // 延迟计算，确保容器已渲染
            const timer = setTimeout(calcSize, 100);
            
            window.addEventListener('resize', calcSize);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', calcSize);
            };
        };
    }, []);

    // 加载游戏状态获取当前时代
    useEffect(() => {
        if (!token) return;
        
        getGameState(token)
            .then((state) => {
                if (state?.era) {
                    setEra(state.era);
                }
            })
            .catch((err) => {
                console.warn('Failed to load game state:', err);
            });
    }, [token]);

    // 加载地块标志和高亮的函数
    const loadTileData = useCallback(() => {
        if (!token) return;
        
        console.log('🗺️ 主页加载地块标记和高亮...');
        Promise.all([
            getUserMarkers(token),
            getUserHighlights(token),
        ])
            .then(([markersData, highlightsData]) => {
                console.log('✅ 地块标记加载完成:', markersData.markers?.length || 0, '个标记');
                console.log('✅ 永久高亮地块加载完成:', highlightsData.highlights?.length || 0, '个地块');
                console.log('永久高亮地块详情:', highlightsData.highlights);
                setMarkers(markersData.markers || []);
                setPermanentHighlights(highlightsData.highlights || []);
            })
            .catch((err) => {
                console.error('❌ 加载地块数据失败:', err);
            });
    }, [token]);

    // 初始加载地块标志和高亮
    useEffect(() => {
        loadTileData();
    }, [loadTileData]);

    // 监听自定义事件以重新加载地块数据（从游戏返回时触发）
    useEffect(() => {
        const handleRefreshTiles = () => {
            console.log('🔄 收到刷新地块标记的事件');
            loadTileData();
        };
        
        window.addEventListener('refreshTileMarkers', handleRefreshTiles);
        return () => window.removeEventListener('refreshTileMarkers', handleRefreshTiles);
    }, [loadTileData]);

    // 从服务器同步卡册
    useEffect(() => {
        if (!token) return;
        
        getDeckState(token)
            .then((deckData) => {
                const cards = deckData.cards || [];
                // 转换为cardBook格式
                const serverCardBook = {
                    cards: cards
                        .filter(card => card.discovered && card.count > 0)
                        .map(card => ({
                            name: card.name,
                            type: card.type,
                            rarity: card.rarity,
                            count: card.count,
                            firstObtained: Date.now(),
                            lastObtained: Date.now(),
                        })),
                    totalCollected: cards.reduce((sum, card) => sum + (card.count || 0), 0),
                };
                
                // 保存到localStorage
                persistCardBook(serverCardBook);
                setCardBook(serverCardBook);
            })
            .catch((err) => {
                console.warn('Failed to sync card book:', err);
            });
    }, [token]);

    return (
        <div className="lobby-shell">
            <div className="lobby-content-container" ref={containerRef}>
                {/* 内容框架 - 匹配主页webp的显示区域 */}
                <div 
                    className="lobby-content-frame" 
                    ref={frameRef}
                    style={{ width: frameSize.width, height: frameSize.height }}
                >
                    <HexCanvas
                        key="main-hex-canvas"
                        width={canvasSize.width}
                        height={canvasSize.height}
                        onSelectHex={handleSelectHex}
                        markers={markers}
                        highlightedTiles={[...permanentHighlights, ...temporaryHighlights]}
                        onRegionMapReady={handleRegionMapReady}
                        onRegionClick={handleRegionClick}
                    />
                    
                    {/* 主页装饰层 - 带alpha通道的边框装饰 */}
                    <div className="lobby-decoration-layer"></div>
                </div>
                
                <div className="lobby-ui">
                {/* 左上角用户信息面板，左为头像，右为用户名/时代 */}
                <div className="lobby-user-panel">
                    <div className="user-panel-content">
                        <button 
                            type="button"
                            className="user-avatar-box"
                            onClick={toggleIconPicker}
                            title="点击更换头像"
                        >
                            <img 
                                className="user-avatar-img"
                                src={`/assets/usericon/${userIcon}`}
                                alt="头像"
                                onError={(e) => { e.target.style.display = 'none'; e.currentTarget.textContent = '🙂'; }}
                            />
                        </button>
                        <div className="user-panel-text">
                            <span className="user-panel-name">
                                {user 
                                    ? user.email.split('@')[0]
                                    : '旅者'
                                }
                            </span>
                            <div className="era-line">
                                <span className="achievement-icon">⏳</span>
                                <span className="achievement-label">{era}</span>
                            </div>
                        </div>
                        {iconPickerOpen && (
                            <div className="avatar-picker">
                                {USER_ICONS.map((icon) => (
                                    <button 
                                        key={icon}
                                        type="button"
                                        className={`avatar-option${userIcon === icon ? ' active' : ''}`}
                                        onClick={() => chooseIcon(icon)}
                                        title={`选择 ${icon}`}
                                    >
                                        <img src={`/assets/usericon/${icon}`} alt={icon} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 顶部中央提示信息 */}
                {!selectedLocation ? (
                    <div className="lobby-top-center">
                        <div className="location-hint">
                            选择您想探索的地区开始游戏
                        </div>
                    </div>
                ) : (
                    <div className="lobby-top-center">
                        <div className="location-badge">
                            <span className="location-name">{getTerrainName(selectedLocation)}</span>
                            <span className="location-coords">({selectedLocation.q}, {selectedLocation.r})</span>
                        </div>
                    </div>
                )}

                {/* 右上角设置按钮 */}
                <div className="lobby-top-right">
                    <button 
                        className="sci-btn-circle settings-btn"
                        onClick={() => setShowSettings(true)}
                        title="设置"
                    >
                        <img 
                            src="/assets/UI/设置.webp" 
                            alt="设置"
                            className="btn-icon-img"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.textContent = '⚙️';
                            }}
                        />
                    </button>
                </div>

                {/* 左侧区域列表 */}
                <div className="lobby-region-list">
                    <div className="region-list-header">Region Index</div>
                    <div className="region-list-content">
                        {REGION_DEFS.map((region) => (
                            <button
                                key={region.key}
                                className={`region-item ${selectedRegion === region.key ? 'active' : ''}`}
                                onClick={() => handleRegionClick(region.key)}
                                title={region.literalName}
                            >
                                <span className="region-name">{region.fantasyName}</span>
                                <span className="region-terrain">{region.terrain === 'grassland' ? 'Grassland' : region.terrain === 'forest' ? 'Forest' : region.terrain === 'mountain' ? 'Mountain' : region.terrain === 'desert' ? 'Desert' : region.terrain === 'snow' ? 'Snow' : 'Ocean'}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 左下角功能按钮 */}
                <div className="lobby-bottom-left">
                    <button 
                        className="sci-btn-circle backpack-btn"
                        onClick={handleOpenInventory}
                        title="背包"
                    >
                        <img 
                            src="/assets/UI/背包.webp" 
                            alt="背包"
                            className="btn-icon-img"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.textContent = '🎒';
                            }}
                        />
                    </button>
                </div>

                {/* 右下角GO按钮 */}
                <div className="lobby-bottom-right">
                    <div
                        className="lobby-func-icons"
                        data-tooltip="需要2个人以上通过所有主线困境，服务器会自动解锁"
                    >
                        <button 
                            className="sci-btn-circle func-icon-btn disabled small"
                            disabled
                            aria-label="需要2个人以上通过所有主线困境，服务器会自动解锁"
                        >
                            <img 
                                src="/assets/funcicon/storeicon.webp" 
                                alt="交易市场"
                                className="btn-icon-img"
                            />
                        </button>
                        <button 
                            className="sci-btn-circle func-icon-btn disabled small"
                            disabled
                            aria-label="需要2个人以上通过所有主线困境，服务器会自动解锁"
                        >
                            <img 
                                src="/assets/funcicon/leaderboardicon.webp" 
                                alt="排行榜"
                                className="btn-icon-img"
                            />
                        </button>
                        <button 
                            className="sci-btn-circle func-icon-btn disabled small"
                            disabled
                            aria-label="需要2个人以上通过所有主线困境，服务器会自动解锁"
                        >
                            <img 
                                src="/assets/funcicon/battleicon.webp" 
                                alt="战斗"
                                className="btn-icon-img"
                            />
                        </button>
                    </div>
                    <button 
                        className={`lobby-go-btn${!selectedLocation ? ' disabled' : ''}`}
                        onClick={selectedLocation ? onEnterGame : undefined}
                        disabled={!selectedLocation}
                        title={selectedLocation ? "启程探索" : "请先选择地块"}
                    >
                        <img 
                            src="/assets/UI/go_button.webp" 
                            alt="GO"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '<span style="color: #fff; font-size: 24px; font-weight: bold;">GO</span>';
                            }}
                        />
                    </button>
                </div>
            </div>

            <CardBookPanel open={cardBookOpen} cardBook={cardBook} onClose={handleCloseCardBook} />
            <InventoryPanel open={inventoryOpen} cardBook={cardBook} onClose={handleCloseInventory} />

            {showSettings && (
                <div className="lobby-settings-overlay" onClick={() => setShowSettings(false)}>
                    <div className="lobby-settings-panel" onClick={(e) => e.stopPropagation()}>
                        <button 
                            type="button"
                            className="settings-close-icon" 
                            onClick={() => setShowSettings(false)}
                            title="关闭"
                        >
                            <img 
                                src="/assets/UI/退出.webp" 
                                alt="关闭"
                            />
                        </button>
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
                            {isAdmin && onEnterCardsDatabase && (
                                <button 
                                    type="button" 
                                    className="settings-admin" 
                                    onClick={onEnterCardsDatabase}
                                >
                                    🎴 卡牌数据库
                                </button>
                            )}
                            {isAdmin && onOpenPlayerArchives && (
                                <button 
                                    type="button" 
                                    className="settings-admin" 
                                    onClick={onOpenPlayerArchives}
                                >
                                    📁 玩家存档管理
                                </button>
                            )}
                            <button 
                                type="button" 
                                className="settings-logout" 
                                onClick={onLogout}
                            >
                                登出
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}

