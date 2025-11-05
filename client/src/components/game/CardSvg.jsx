import { useEffect, useMemo, useState } from 'react';

import { getCardSvg } from '../../utils/cardSvgMap.js';

const KEYCARD_EXTENSIONS = ['.webp', '.png', '.jpg', '.jpeg'];
const keycardSourceCache = new Map();

export function CardSvg({ card, className = '', style = {} }) {
    const cardName = card.name?.replace(/【|】/g, '') || '';

    // 优先检查是否是基础卡（有SVG）
    const svgContent = getCardSvg(card.name);
    if (svgContent) {
        return (
            <div
                className={`card-svg ${className}`}
                style={style}
                dangerouslySetInnerHTML={{ __html: svgContent }}
            />
        );
    }

    const cachedSource = keycardSourceCache.get(cardName) || null;
    const sources = useMemo(() => {
        if (cachedSource) {
            return [cachedSource];
        }
        return KEYCARD_EXTENSIONS.map((ext) => `/assets/keycards/${cardName}${ext}`);
    }, [cardName, cachedSource]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        setCurrentIndex(0);
        setStatus('loading');
    }, [cardName]);

    const handleLoad = () => {
        const resolvedSrc = sources[currentIndex];
        if (resolvedSrc) {
            keycardSourceCache.set(cardName, resolvedSrc);
        }
        setStatus('loaded');
    };

    const handleError = () => {
        const nextIndex = currentIndex + 1;
        if (nextIndex < sources.length) {
            setCurrentIndex(nextIndex);
        } else {
            setStatus('error');
        }
    };

    // 只在图片真正加载失败时显示 fallback，加载中时不显示
    const showFallback = status === 'error';
    const rarityClass = (card.rarity || '').toLowerCase();

    return (
        <div className={`card-image ${className}`} style={style}>
            {sources.length > 0 && (
                <img
                    key={`${cardName}-${currentIndex}`}
                    src={sources[currentIndex]}
                    alt={card.name}
                    onLoad={handleLoad}
                    onError={handleError}
                    loading="eager"
                    decoding="async"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        opacity: status === 'loaded' ? 1 : 0,
                        transition: 'opacity 0.2s ease-in',
                    }}
                />
            )}

            {showFallback && (
                <div className="card-fallback">
                    <div className="card-fallback__name">{card.name}</div>
                    {card.rarity ? (
                        <div className={`card-fallback__rarity ${rarityClass}`}>{card.rarity}</div>
                    ) : null}
                    <div className="card-fallback__type">{card.type || card.card_type}</div>
                </div>
            )}
        </div>
    );
}

