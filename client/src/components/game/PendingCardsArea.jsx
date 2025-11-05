import { CardSvg } from './CardSvg.jsx';
import { hasCardSvg } from '../../utils/cardSvgMap.js';
import audioService from '../../services/audioService.js';

export function PendingCardsArea({ cards = [] }) {
    const handleDragStart = (event, card) => {
        if (!card) {
            return;
        }
        audioService.playClick();
        
        const normalizedId = `${card.id ?? ''}`.trim();
        console.log('🎴 待领取卡牌 DragStart:', card.name, 'ID:', normalizedId);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', normalizedId);
        event.dataTransfer.setData('card-name', card.name);
        event.dataTransfer.setData('source', 'pending');
        event.dataTransfer.dropEffect = 'move';
    };

    if (cards.length === 0) {
        return null;
    }

    return (
        <div className="pending-cards-area">
            <div className="pending-cards-area__header">
                <span className="pending-cards-area__title">待领取卡牌</span>
                <span className="pending-cards-area__count">({cards.length})</span>
            </div>
            <div className="pending-cards-area__grid">
                {cards.map((card) => {
                    const rarityClass = card.rarity ? `rarity-${card.rarity.toLowerCase()}` : '';
                    const hasSvg = hasCardSvg(card.name);
                    const isKeyCard = card.type === 'key' || card.card_type === 'key' || card.rarity === 'ruby';
                    
                    return (
                        <div
                            key={card.id}
                            className={`pending-card ${rarityClass} has-svg ${isKeyCard ? 'is-keycard' : ''}`}
                            draggable
                            onDragStart={(event) => handleDragStart(event, card)}
                            data-card-id={card.id}
                        >
                                <CardSvg card={card} className="pending-card__svg" />
                        </div>
                    );
                })}
            </div>
            <p className="pending-cards-area__hint">拖动卡牌到手牌区</p>
        </div>
    );
}


