import { useEffect, useMemo, useState, useRef, useCallback } from 'react';

import { getCardSvg } from '../../utils/cardSvgMap.js';

const KEYCARD_EXTENSIONS = ['.webp', '.png', '.jpg', '.jpeg'];
const keycardSourceCache = new Map();

// 生成通用卡牌SVG模板
function generateCardSvg(card) {
    const cardName = card.name || '';
    const rarity = (card.rarity || 'common').toLowerCase();
    const cardType = card.card_type || card.type || 'inspiration';
    
    // 稀有度对应的颜色
    const rarityColors = {
        common: '#a89968',
        uncommon: '#7fb069',
        rare: '#6fafe8',
        epic: '#a878d4',
        ruby: '#dc143c',
        legendary: '#ff9447'
    };
    
    const rarityLabels = {
        common: 'COMMON',
        uncommon: 'UNCOMMON',
        rare: 'RARE',
        epic: 'EPIC',
        ruby: 'RUBY',
        legendary: 'LEGENDARY'
    };
    
    const typeLabels = {
        inspiration: 'inspiration',
        key: 'key',
        reward: 'reward',
        element: 'element'
    };
    
    const color = rarityColors[rarity] || rarityColors.common;
    const rarityLabel = rarityLabels[rarity] || rarityLabels.common;
    const typeLabel = typeLabels[cardType] || cardType;
    
    // 根据卡牌名称长度调整字体大小
    const nameFontSize = cardName.length > 6 ? 22 : cardName.length > 4 ? 24 : 26;
    
    // 生成装饰图案（根据稀有度）
    const decorativePattern = rarity === 'legendary' || rarity === 'epic' 
        ? `<g opacity="0.15">
            <circle cx="50" cy="100" r="15" fill="${color}"/>
            <circle cx="150" cy="100" r="15" fill="${color}"/>
            <circle cx="50" cy="180" r="15" fill="${color}"/>
            <circle cx="150" cy="180" r="15" fill="${color}"/>
          </g>`
        : '';
    
    return `<svg width="180" height="270" viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">
  <!-- Soft Cream Background -->
  <rect width="200" height="280" rx="15" ry="15" fill="#FDF5E6"/>
  
  <!-- Playful Stitched Border -->
  <rect x="5" y="5" width="190" height="270" rx="10" ry="10" fill="none" stroke="#B5838D" stroke-width="3" stroke-dasharray="10 5"/>
  
  ${decorativePattern}
  
  <!-- Rarity Badge Background -->
  <rect x="40" y="35" width="120" height="28" rx="5" fill="${color}" opacity="0.9"/>
  
  <!-- Rarity Text -->
  <text x="100" y="56" font-family="'Georgia', 'serif'" font-size="13" font-weight="bold" text-anchor="middle" fill="#FFF">${rarityLabel}</text>
  
  <!-- Card Icon Area (geometric shape based on rarity) -->
  <g transform="translate(100, 130)">
    <circle cx="0" cy="0" r="48" fill="${color}" opacity="0.15"/>
    <circle cx="0" cy="0" r="38" fill="none" stroke="${color}" stroke-width="3.5" opacity="0.5" stroke-dasharray="5 5"/>
    <circle cx="0" cy="0" r="28" fill="${color}" opacity="0.25"/>
    <circle cx="0" cy="0" r="18" fill="${color}" opacity="0.4"/>
  </g>
  
  <!-- Card Name -->
  <text x="100" y="225" font-family="'Kaiti', 'STKaiti', 'serif'" font-size="${nameFontSize}" font-weight="bold" text-anchor="middle" fill="#6D4C41">${cardName}</text>
  
  <!-- Card Type -->
  <text x="100" y="250" font-family="'Georgia', 'serif'" font-size="11" text-anchor="middle" fill="#A1887F">${typeLabel}</text>
</svg>`;
}

export function CardSvg({ card, className = '', style = {} }) {
    const cardName = card.name?.replace(/【|】/g, '') || '';

    console.log('[CardSvg] 渲染卡牌:', { 
        originalName: card.name, 
        cleanName: cardName,
        type: card.type,
        cardType: card.card_type,
        rarity: card.rarity
    });

    // 优先检查是否是基础卡（有预定义SVG）
    const svgContent = getCardSvg(card.name);
    if (svgContent) {
        console.log('[CardSvg] 使用预定义SVG:', cardName);
        return (
            <div
                className={`card-svg ${className}`}
                style={style}
                dangerouslySetInnerHTML={{ __html: svgContent }}
            />
        );
    }
    
    // 检查是否是钥匙卡，如果是，尝试加载图片
    const isKeyCard = card.type === 'key' || card.card_type === 'key' || card.rarity === 'ruby';
    if (!isKeyCard) {
        // 非钥匙卡直接使用通用SVG模板
        const generatedSvg = generateCardSvg(card);
        console.log('[CardSvg] 使用通用SVG模板:', cardName);
        return (
            <div
                className={`card-svg ${className}`}
                style={style}
                dangerouslySetInnerHTML={{ __html: generatedSvg }}
            />
        );
    }

    const cachedSource = keycardSourceCache.get(cardName) || null;
    const sources = useMemo(() => {
        if (cachedSource) {
            console.log('[CardSvg] 使用缓存路径:', cachedSource);
            return [cachedSource];
        }
        const paths = KEYCARD_EXTENSIONS.map((ext) => `/assets/keycards/${cardName}${ext}`);
        console.log('[CardSvg] 尝试路径:', paths);
        return paths;
    }, [cardName, cachedSource]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [status, setStatus] = useState('loading');
    const imgRef = useRef(null);
    
    console.log('[CardSvg] 当前状态:', { cardName, status, currentIndex, currentSrc: sources[currentIndex] });

    useEffect(() => {
        setCurrentIndex(0);
        setStatus('loading');
    }, [cardName]);

    const handleLoad = useCallback(() => {
        console.log(`[CardSvg] 图片加载成功: ${cardName}`);
        const resolvedSrc = sources[currentIndex];
        if (resolvedSrc) {
            keycardSourceCache.set(cardName, resolvedSrc);
        }
        setStatus('loaded');
    }, [sources, currentIndex, cardName]);

    const handleError = useCallback(() => {
        console.log(`[CardSvg] 图片加载失败: ${sources[currentIndex]}, 尝试下一个`);
        const nextIndex = currentIndex + 1;
        if (nextIndex < sources.length) {
            setCurrentIndex(nextIndex);
        } else {
            console.error(`[CardSvg] 所有格式都失败: ${cardName}`);
            setStatus('error');
        }
    }, [currentIndex, sources, cardName]);
    
    // 检查图片是否已经从缓存加载（重要！）
    // 在ref回调中调用，处理浏览器已缓存图片的情况
    const checkImageLoaded = useCallback((img) => {
        if (!img) return;
        // 如果图片已经完成加载（从缓存中）
        if (img.complete && img.naturalWidth > 0) {
            console.log(`[CardSvg] 图片从缓存加载: ${cardName}`);
            const resolvedSrc = sources[currentIndex];
            if (resolvedSrc) {
                keycardSourceCache.set(cardName, resolvedSrc);
            }
            setStatus('loaded');
        } else {
            console.log(`[CardSvg] 图片等待加载: ${cardName}, complete=${img.complete}, naturalWidth=${img.naturalWidth}`);
        }
    }, [sources, currentIndex, cardName]);

    // 稳定的ref回调
    const setImgRef = useCallback((el) => {
        imgRef.current = el;
        if (el) {
            checkImageLoaded(el);
        }
    }, [checkImageLoaded]);
    
    // 额外的useEffect检查：如果mounted后图片已经加载完成
    useEffect(() => {
        const img = imgRef.current;
        if (img && img.complete && img.naturalWidth > 0 && status === 'loading') {
            console.log(`[CardSvg] useEffect检测到已加载图片: ${cardName}`);
            const resolvedSrc = sources[currentIndex];
            if (resolvedSrc) {
                keycardSourceCache.set(cardName, resolvedSrc);
            }
            setStatus('loaded');
        }
    }, [status, sources, currentIndex, cardName]);
    
    // 超时fallback：如果1秒后还是loading状态，强制检查一次
    useEffect(() => {
        const timer = setTimeout(() => {
            const img = imgRef.current;
            if (img && status === 'loading') {
                console.warn(`[CardSvg] 超时检查: ${cardName}, complete=${img.complete}, naturalWidth=${img.naturalWidth}, src=${img.src}`);
                if (img.complete && img.naturalWidth > 0) {
                    console.log(`[CardSvg] 超时fallback: 强制设置为loaded`);
                    const resolvedSrc = sources[currentIndex];
                    if (resolvedSrc) {
                        keycardSourceCache.set(cardName, resolvedSrc);
                    }
                    setStatus('loaded');
                }
            }
        }, 1000);
        
        return () => clearTimeout(timer);
    }, [status, cardName, sources, currentIndex]);

    // 如果图片加载失败，使用通用SVG模板作为fallback
    if (status === 'error') {
        console.log('[CardSvg] 图片加载失败，使用通用SVG模板:', cardName);
        const generatedSvg = generateCardSvg(card);
        return (
            <div
                className={`card-svg ${className}`}
                style={style}
                dangerouslySetInnerHTML={{ __html: generatedSvg }}
            />
        );
    }

    // 如果超过2秒还在loading，强制显示图片（可能是事件没触发）
    const forceShow = status === 'loading';
    const shouldShow = status === 'loaded' || (forceShow && imgRef.current?.complete);

    return (
        <div className={`card-image ${className}`} style={style}>
            {sources.length > 0 && (
                <img
                    ref={setImgRef}
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
                        opacity: shouldShow ? 1 : 0.3, // 加载中至少显示30%透明度
                        transition: status === 'loaded' ? 'opacity 0.2s ease-in' : 'none',
                    }}
                />
            )}
        </div>
    );
}

