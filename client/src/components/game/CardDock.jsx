import { useMemo } from 'react';
import { CardSvg } from './CardSvg.jsx';
import { hasCardSvg } from '../../utils/cardSvgMap.js';

const MAX_SLOTS = 5;

export function CardDock({ 
    cards, 
    stagedIds = [], 
    onDraw,
    onOpenForge,
    onOpenContract,
    onEndTurn,
    onShowInventory,
    onShowCardBook,
    onBackLobby,
}) {
    const slots = useMemo(() => {
        // 只显示未被放到画布上的卡牌
        const safeCards = Array.isArray(cards) ? cards : [];
        const availableCards = safeCards.filter(card => !stagedIds.includes(card.id));
        const filled = availableCards.slice(0, MAX_SLOTS);
        return [...filled, ...Array.from({ length: Math.max(0, MAX_SLOTS - filled.length) })];
    }, [cards, stagedIds]);

    const handleDragStart = (event, card) => {
        if (!card) {
            return;
        }
        const normalizedId = `${card.id ?? ''}`.trim();
        console.log('🎴 手牌 DragStart:', card.name, 'ID:', normalizedId);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', normalizedId);
        event.dataTransfer.setData('card-name', card.name);
        // 设置拖动时的视觉效果
        event.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnd = (event, card) => {
        const normalizedId = `${card.id ?? ''}`.trim();
        console.log('🎴 手牌 DragEnd:', card.name, 'ID:', normalizedId);
        
        // 检查是否拖到了熔炉
        const hovered = document.elementFromPoint(event.clientX, event.clientY);
        const furnace = document.querySelector('.forge-furnace');
        
        if (furnace && (furnace.contains(hovered) || furnace === hovered)) {
            console.log('✅ 手牌拖放到熔炉成功');
            // 熔炉的 onDrop 会处理，这里不需要额外操作
        } else {
            console.log('❌ 手牌未拖到熔炉');
        }
    };

    const renderCard = (card, index) => {
        if (!card) {
            return (
                <div key={`empty-${index}`} className="dock-slot empty" aria-hidden="true">
                    <span className="dock-slot__hint">空位</span>
                </div>
            );
        }

        const rarityClass = card.rarity ? `rarity-${card.rarity.toLowerCase()}` : '';
        const hasSvg = hasCardSvg(card.name);
        
        return (
            <div
                key={card.id}
                className={`dock-slot ${rarityClass} ${hasSvg ? 'has-svg' : ''}`}
                draggable
                onDragStart={(event) => handleDragStart(event, card)}
                onDragEnd={(event) => handleDragEnd(event, card)}
                data-card-id={card.id}
            >
                {hasSvg ? (
                    <CardSvg card={card} className="dock-slot__svg" />
                ) : (
                    <>
                        <div className="dock-slot__header">
                            <span className="dock-slot__name">{card.name}</span>
                            <span className={`dock-slot__rarity ${card.rarity}`}>{card.rarity}</span>
                        </div>
                        <div className="dock-slot__meta">{card.type}</div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="card-dock" role="region" aria-label="手牌区">
            <div className="card-dock__header">
                <span className="card-dock__title">手牌</span>
                <button type="button" className="card-dock__draw" onClick={onDraw}>
                    <img src="/assets/UI/局内补牌.webp" alt="补牌" />
                </button>
            </div>
            <div className="card-dock__rail">
                {slots.map((card, index) => renderCard(card, index))}
            </div>
            <p className="card-dock__hint">拖动卡牌到地图上进行合成</p>
        </div>
    );
}



