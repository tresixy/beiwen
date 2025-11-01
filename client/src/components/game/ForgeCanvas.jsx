import { useMemo, useRef, useState } from 'react';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function ForgeCanvas({ cards, positions = {}, onDrop, onRemove, onReposition, onSynthesize }) {
    const containerRef = useRef(null);
    const [furnaceCards, setFurnaceCards] = useState([]);
    const [isForging, setIsForging] = useState(false);

    const withPositions = useMemo(() => {
        return cards.map((card) => {
            const stored = positions[card.id];
            return {
                card,
                position: stored || { x: 50, y: 50 },
            };
        });
    }, [cards, positions]);

    const extractPosition = (event) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) {
            return { x: 50, y: 50 };
        }
        const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 5, 95);
        const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 10, 90);
        return { x, y };
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (event) => {
        event.preventDefault();
        const cardId = event.dataTransfer.getData('text/plain');
        if (!cardId) {
            return;
        }
        const position = extractPosition(event);
        onDrop?.(cardId, position);
    };

    const handleStageDragStart = (event, cardId) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', cardId);
    };

    const handleStageDragEnd = (event, cardId) => {
        const hovered = document.elementFromPoint(event.clientX, event.clientY);
        
        // 检查是否拖到手牌堆
        const cardDock = document.querySelector('.card-dock__rail');
        if (cardDock && cardDock.contains(hovered)) {
            onRemove?.(cardId);
            return;
        }
        
        // 检查是否拖到熔炉
        const furnaceZone = containerRef.current?.querySelector('.forge-furnace');
        if (furnaceZone && furnaceZone.contains(hovered)) {
            handleCardDropInFurnace(cardId);
            return;
        }
        
        // 检查是否在画布内
        if (!containerRef.current?.contains(hovered)) {
            return;
        }
        
        if (onReposition) {
            const position = extractPosition(event);
            onReposition(cardId, position);
        }
    };

    const handleCardDropInFurnace = (cardId) => {
        const card = cards.find(c => c.id === cardId);
        if (!card || isForging) return;

        console.log('卡牌进入熔炉:', card.name);
        
        // 将卡牌加入熔炉
        setFurnaceCards(prev => {
            const newCards = [...prev, card];
            
            // 如果有至少2张卡牌，启动合成
            if (newCards.length >= 2) {
                setTimeout(() => {
                    triggerForge(newCards);
                }, 300);
            }
            
            return newCards;
        });
    };

    const triggerForge = (cardsToForge) => {
        console.log('开始合成:', cardsToForge.map(c => c.name).join(' + '));
        setIsForging(true);
        
        // 触发合成回调
        onSynthesize?.();
        
        // 清空熔炉
        setTimeout(() => {
            setFurnaceCards([]);
            setIsForging(false);
        }, 1000);
    };

    const handleFurnaceDragOver = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'copy';
    };

    const handleFurnaceDrop = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const cardId = event.dataTransfer.getData('text/plain');
        if (cardId) {
            handleCardDropInFurnace(cardId);
        }
    };

    return (
        <div
            ref={containerRef}
            className="forge-canvas"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            role="application"
            aria-label="合成画布"
        >
            <div className="forge-canvas__halo" />
            
            {/* 熔炉区域 */}
            <div 
                className={`forge-furnace ${isForging ? 'forging' : ''} ${furnaceCards.length > 0 ? 'has-cards' : ''}`}
                onDragOver={handleFurnaceDragOver}
                onDrop={handleFurnaceDrop}
            >
                <div className="forge-furnace__icon">🔥</div>
                <div className="forge-furnace__title">熔炉</div>
                {furnaceCards.length > 0 && (
                    <div className="forge-furnace__count">
                        {furnaceCards.length} 张卡牌
                    </div>
                )}
                {furnaceCards.length === 1 && (
                    <div className="forge-furnace__hint">再放入一张即可合成</div>
                )}
                {isForging && (
                    <div className="forge-furnace__status">合成中...</div>
                )}
            </div>

            {cards.length === 0 && (
                <div className="forge-canvas__hint">拖动卡牌到左上角熔炉进行合成</div>
            )}
            {cards.length === 1 && (
                <div className="forge-canvas__hint">继续拖入卡牌到熔炉（需要2张）</div>
            )}
            
            {withPositions.map(({ card, position }) => {
                // 如果卡牌在熔炉中，不在画布上显示
                if (furnaceCards.some(fc => fc.id === card.id)) {
                    return null;
                }
                
                return (
                    <div
                        key={card.id}
                        className="forge-canvas__card"
                        style={{
                            left: `${position.x}%`,
                            top: `${position.y}%`,
                        }}
                        draggable
                        onDragStart={(event) => handleStageDragStart(event, card.id)}
                        onDragEnd={(event) => handleStageDragEnd(event, card.id)}
                    >
                        <div className="forge-canvas__name">{card.name}</div>
                        <div className="forge-canvas__type">{card.type}</div>
                    </div>
                );
            })}
        </div>
    );
}
