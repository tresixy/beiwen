import { getCardSvg, hasCardSvg } from '../../utils/cardSvgMap.js';

const KEYCARD_EXTENSIONS = ['.webp', '.png', '.jpg', '.jpeg'];

export function CardSvg({ card, className = '', style = {} }) {
    const cardName = card.name?.replace(/【|】/g, '') || '';
    
    // 优先检查是否是基础卡（有SVG）
    const svgContent = getCardSvg(card.name);
    if (svgContent) {
        // 使用dangerouslySetInnerHTML渲染SVG
        return (
            <div 
                className={`card-svg ${className}`}
                style={style}
                dangerouslySetInnerHTML={{ __html: svgContent }}
            />
        );
    }
    
    // 非基础卡（钥匙卡、合成卡等）尝试加载webp图片
    const initialImagePath = `/assets/keycards/${cardName}${KEYCARD_EXTENSIONS[0]}`;
    
    return (
        <div className={`card-image ${className}`} style={style}>
            <img 
                src={initialImagePath}
                alt={card.name}
                onError={(e) => {
                    // 如果图片加载失败，尝试下一个扩展名或fallback
                    const currentSrc = e.target.src;
                    const currentExt = KEYCARD_EXTENSIONS.find(ext => currentSrc.includes(ext));
                    const currentIndex = KEYCARD_EXTENSIONS.indexOf(currentExt);
                    const nextIndex = currentIndex + 1;
                    
                    if (nextIndex < KEYCARD_EXTENSIONS.length) {
                        e.target.src = `/assets/keycards/${cardName}${KEYCARD_EXTENSIONS[nextIndex]}`;
                    } else {
                        // 所有扩展名都失败了，显示fallback
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                            <div class="card-fallback">
                                <div class="card-fallback__name">${card.name}</div>
                                ${card.rarity ? `<div class="card-fallback__rarity ${(card.rarity || '').toLowerCase()}">${card.rarity}</div>` : ''}
                                <div class="card-fallback__type">${card.type || card.card_type}</div>
                            </div>
                        `;
                    }
                }}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
        </div>
    );
}

