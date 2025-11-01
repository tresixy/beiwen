import { useMemo } from 'react';

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
        const filled = cards.slice(0, MAX_SLOTS);
        return [...filled, ...Array.from({ length: Math.max(0, MAX_SLOTS - filled.length) })];
    }, [cards]);

    const handleDragStart = (event, card) => {
        if (!card) {
            return;
        }
        const normalizedId = `${card.id ?? ''}`.trim();
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', normalizedId);
    };

    const renderCard = (card, index) => {
        if (!card) {
            return (
                <div key={`empty-${index}`} className="dock-slot empty" aria-hidden="true">
                    <span className="dock-slot__hint">空位</span>
                </div>
            );
        }

        const staged = stagedIds.includes(card.id);

        return (
            <div
                key={card.id}
                className={`dock-slot${staged ? ' staged' : ''}`}
                draggable
                onDragStart={(event) => handleDragStart(event, card)}
                data-card-id={card.id}
            >
                <div className="dock-slot__header">
                    <span className="dock-slot__name">{card.name}</span>
                    <span className={`dock-slot__rarity ${card.rarity}`}>{card.rarity}</span>
                </div>
                <div className="dock-slot__meta">{card.type}</div>
            </div>
        );
    };

    return (
        <div className="card-dock" role="region" aria-label="手牌区">
            <div className="card-dock__header">
                <span className="card-dock__title">手牌</span>
                <button type="button" className="card-dock__draw" onClick={onDraw}>
                    补牌
                </button>
            </div>
            <div className="card-dock__rail">
                {slots.map((card, index) => renderCard(card, index))}
            </div>
            <p className="card-dock__hint">拖动卡牌到地图上进行合成</p>
        </div>
    );
}



