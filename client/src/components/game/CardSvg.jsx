import { getCardSvg, hasCardSvg } from '../../utils/cardSvgMap.js';

export function CardSvg({ card, className = '', style = {} }) {
    const svgContent = getCardSvg(card.name);
    
    if (!svgContent) {
        // 如果没有SVG，显示文本版本
        return (
            <div className={`card-fallback ${className}`} style={style}>
                <div className="card-fallback__name">{card.name}</div>
                <div className="card-fallback__type">{card.type}</div>
                {card.rarity && (
                    <div className={`card-fallback__rarity ${card.rarity.toLowerCase()}`}>
                        {card.rarity}
                    </div>
                )}
            </div>
        );
    }
    
    // 使用dangerouslySetInnerHTML渲染SVG
    return (
        <div 
            className={`card-svg ${className}`}
            style={style}
            dangerouslySetInnerHTML={{ __html: svgContent }}
        />
    );
}

