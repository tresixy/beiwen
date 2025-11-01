import { useMemo, useRef, useState, useEffect } from 'react';

const DEFAULT_POSITIONS = [
    { x: 25, y: 45 },
    { x: 50, y: 42 },
    { x: 75, y: 48 },
    { x: 35, y: 65 },
    { x: 65, y: 68 },
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const OVERLAP_THRESHOLD = 0.5; // 重合超过50%认为是重合
const OVERLAP_DURATION = 500; // 0.5秒

export function ForgeCanvas({ cards, positions = {}, onDrop, onRemove, onReposition, onSynthesize }) {
    const containerRef = useRef(null);
    const overlapTimerRef = useRef(null);
    const [overlapProgress, setOverlapProgress] = useState(0);
    const [isOverlapping, setIsOverlapping] = useState(false);

    const withPositions = useMemo(() => {
        return cards.map((card, index) => {
            const fallback = DEFAULT_POSITIONS[index] ?? DEFAULT_POSITIONS[DEFAULT_POSITIONS.length - 1];
            const stored = positions[card.id];
            return {
                card,
                position: stored || fallback,
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
        
        // 检查是否在画布内
        if (!containerRef.current?.contains(hovered)) {
            return;
        }
        
        if (onReposition) {
            const position = extractPosition(event);
            onReposition(cardId, position);
        }
    };

    // 计算两个矩形的重叠面积
    const calculateOverlap = (rect1, rect2) => {
        const xOverlap = Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left));
        const yOverlap = Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top));
        const overlapArea = xOverlap * yOverlap;
        const area1 = rect1.width * rect1.height;
        const area2 = rect2.width * rect2.height;
        const minArea = Math.min(area1, area2);
        return minArea > 0 ? overlapArea / minArea : 0;
    };

    // 检测卡牌重合 - 支持多张卡牌
    useEffect(() => {
        if (cards.length < 2) {
            setIsOverlapping(false);
            setOverlapProgress(0);
            if (overlapTimerRef.current) {
                clearInterval(overlapTimerRef.current);
                overlapTimerRef.current = null;
            }
            return;
        }

        const checkOverlap = () => {
            const cardElements = containerRef.current?.querySelectorAll('.forge-canvas__card');
            if (!cardElements || cardElements.length < 2) return;

            // 检测任意两张卡牌是否重合
            let maxOverlap = 0;
            for (let i = 0; i < cardElements.length; i++) {
                for (let j = i + 1; j < cardElements.length; j++) {
                    const rect1 = cardElements[i].getBoundingClientRect();
                    const rect2 = cardElements[j].getBoundingClientRect();
                    const overlapRatio = calculateOverlap(rect1, rect2);
                    maxOverlap = Math.max(maxOverlap, overlapRatio);
                }
            }

            if (maxOverlap >= OVERLAP_THRESHOLD) {
                if (!overlapTimerRef.current) {
                    const startTime = Date.now();
                    setIsOverlapping(true);
                    
                    overlapTimerRef.current = setInterval(() => {
                        const elapsed = Date.now() - startTime;
                        const progress = Math.min(elapsed / OVERLAP_DURATION, 1);
                        setOverlapProgress(progress);
                        
                        if (progress >= 1) {
                            clearInterval(overlapTimerRef.current);
                            overlapTimerRef.current = null;
                            setIsOverlapping(false);
                            setOverlapProgress(0);
                            // 触发合成
                            onSynthesize?.();
                        }
                    }, 16);
                }
            } else {
                if (overlapTimerRef.current) {
                    clearInterval(overlapTimerRef.current);
                    overlapTimerRef.current = null;
                    setIsOverlapping(false);
                    setOverlapProgress(0);
                }
            }
        };

        const interval = setInterval(checkOverlap, 100);
        return () => {
            clearInterval(interval);
            if (overlapTimerRef.current) {
                clearInterval(overlapTimerRef.current);
                overlapTimerRef.current = null;
            }
        };
    }, [cards, positions, onSynthesize]);

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
            {cards.length === 0 && (
                <div className="forge-canvas__hint">拖动卡牌到地图上</div>
            )}
            {cards.length === 1 && (
                <div className="forge-canvas__hint">拖动更多卡牌，让它们重叠合成</div>
            )}
            {isOverlapping && (
                <div className="forge-canvas__overlap-indicator">
                    <div className="forge-canvas__overlap-progress" style={{ width: `${overlapProgress * 100}%` }} />
                    <span className="forge-canvas__overlap-text">合成中...</span>
                </div>
            )}
            {withPositions.map(({ card, position }) => (
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
            ))}
        </div>
    );
}


