import { useState } from 'react';

const RESOURCE_LIST = [
    { key: 'food', icon: '🍖', label: '食粮', tooltip: '食粮资源 - 用于维持人口生存和军队补给' },
    { key: 'production', icon: '⚙️', label: '生产', tooltip: '生产力 - 用于建造建筑和生产工业品' },
    { key: 'research', icon: '🔬', label: '研究', tooltip: '研究点数 - 用于解锁科技和推动文明进步' },
];

export function HUD({
    resources,
    pulses,
    turn,
    user,
    activeEvent,
    era,
    onCompleteEvent,
    onShowGuide,
    onSpawnKeyCard,
}) {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        
        // 获取拖拽的卡牌ID，需要找到对应的卡牌名称
        const cardId = e.dataTransfer.getData('text/plain');
        
        // 从data属性中获取卡牌名称
        const cardName = e.dataTransfer.getData('card-name');
        
        console.log('🎯 卡牌拖到事件上:', cardName, cardId);
        
        if (cardName && activeEvent) {
            // 检查卡牌名称是否匹配事件所需的钥匙（支持“或”多选）
            const requiredRaw = `${activeEvent.required_key || ''}`;
            const requiredList = requiredRaw.split('或').map((k) => k.trim()).filter(Boolean);
            if (requiredList.includes(cardName)) {
                onCompleteEvent?.(cardName);
            } else {
                console.log('❌ 钥匙不匹配，需要:', activeEvent.required_key, '得到:', cardName);
            }
        }
    };

    return (
        <header className="hud">
            <div className="resources">
                {RESOURCE_LIST.map(({ key, icon, tooltip }) => (
                    <div 
                        key={key} 
                        className={`resource-chip${pulses[key] ? ' bump' : ''}`}
                        title={tooltip}
                    >
                        <span className="icon" aria-label={key}>
                            {icon}
                        </span>
                        <span className="value">{resources[key] ?? 9}</span>
                    </div>
                ))}
            </div>
            <div 
                className={`event-info ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {activeEvent ? (
                    <>
                        <div className="event-header">
                            <div className="event-name">{activeEvent.name}</div>
                            {activeEvent.progress !== undefined && activeEvent.totalEvents !== undefined && (
                                <div className="event-progress">
                                    {activeEvent.progress + 1}/{activeEvent.totalEvents}
                                </div>
                            )}
                        </div>
                        <div className="event-desc">{activeEvent.description}</div>
                        <div className="event-key-hint">需要：【{activeEvent.required_key}】</div>
                        {user && user.role === 'admin' && user.username === 'aita' && activeEvent.required_key ? (
                            <button 
                                type="button" 
                                onClick={onSpawnKeyCard}
                                title="生成当前事件钥匙卡"
                                style={{ marginTop: '6px' }}
                            >
                                出现key card
                            </button>
                        ) : null}
                    </>
                ) : (
                    <div className="event-name">回合 {turn}</div>
                )}
            </div>
            <div className="hud-user">
                <span className="era-badge">{era}</span>
            </div>
            <button 
                type="button" 
                className="hud-guide-btn"
                onClick={onShowGuide}
                title="游玩指南"
            >
                ❓
            </button>
        </header>
    );
}




