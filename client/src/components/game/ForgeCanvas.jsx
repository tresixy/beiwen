import { useMemo, useRef, useState, useCallback, useEffect } from 'react';

import './ForgeCanvas.css';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const MAX_FURNACE_CARDS = 2;
const PROGRESS_DURATION = 1500;
const PROGRESS_RESET_DELAY = 220;

const isPointInsideElement = (element, clientX, clientY) => {
    if (!element) {
        return false;
    }
    const rect = element.getBoundingClientRect();
    return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
    );
};

export function ForgeCanvas({ cards = [], hand = [], positions = {}, ideaCards = [], onDrop, onRemove, onReposition, onSynthesize, onSelectForForge }) {
    const containerRef = useRef(null);
    const progressTimerRef = useRef(null);
    const [furnaceCards, setFurnaceCards] = useState([]);
    const [isForging, setIsForging] = useState(false);
    const [furnaceProgress, setFurnaceProgress] = useState(0);
    const [isCanvasDragActive, setIsCanvasDragActive] = useState(false);
    const [isFurnaceDragOver, setIsFurnaceDragOver] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [draggingCardId, setDraggingCardId] = useState(null);

    const resetDragState = useCallback(() => {
        setIsDragging(false);
        setDraggingCardId(null);
        setIsCanvasDragActive(false);
        setIsFurnaceDragOver(false);
    }, []);

    const withPositions = useMemo(() => {
        const safeCards = Array.isArray(cards) ? cards : [];
        return safeCards.map((card) => {
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

    const furnaceStatus = useMemo(() => {
        if (isForging) {
            return '合成进行中';
        }
        if (furnaceCards.length === 0) {
            return '等待投放卡牌';
        }
        if (furnaceCards.length === 1) {
            return '继续放入一张卡牌';
        }
        return '准备触发合成';
    }, [furnaceCards.length, isForging]);

    const stopProgressTimer = useCallback(() => {
        if (progressTimerRef.current) {
            window.clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
        }
    }, []);

    const startProgressTimer = useCallback(() => {
        stopProgressTimer();
        const startAt = performance.now();
        setFurnaceProgress(0);
        progressTimerRef.current = window.setInterval(() => {
            const elapsed = performance.now() - startAt;
            const percent = Math.min(100, Math.round((elapsed / PROGRESS_DURATION) * 100));
            setFurnaceProgress(percent);
            if (percent >= 100) {
                stopProgressTimer();
            }
        }, 60);
    }, [stopProgressTimer]);

    useEffect(() => {
        if (isForging) {
            startProgressTimer();
            return stopProgressTimer;
        }
        stopProgressTimer();
        return undefined;
    }, [isForging, startProgressTimer, stopProgressTimer]);

    useEffect(() => () => stopProgressTimer(), [stopProgressTimer]);

    useEffect(() => {
        if (!isForging && furnaceProgress > 0) {
            const timeout = window.setTimeout(() => setFurnaceProgress(0), PROGRESS_RESET_DELAY);
            return () => window.clearTimeout(timeout);
        }
        return undefined;
    }, [isForging, furnaceProgress]);

    const handleDragOver = (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (!isCanvasDragActive) {
            setIsCanvasDragActive(true);
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        const cardId = event.dataTransfer.getData('text/plain');
        const normalizedId = `${cardId ?? ''}`.trim();
        console.log('📍 画布 Drop 事件, cardId:', normalizedId);
        if (!normalizedId) {
            return;
        }
        const position = extractPosition(event);
        console.log('📍 位置:', position, '调用 onDrop');
        onDrop?.(normalizedId, position);
        resetDragState();
    };

    const handleCanvasDragEnter = () => {
        if (!isCanvasDragActive) {
            setIsCanvasDragActive(true);
        }
    };

    const handleCanvasDragLeave = (event) => {
        if (!containerRef.current?.contains(event.relatedTarget)) {
            setIsCanvasDragActive(false);
        }
    };

    const handleStageDragStart = (event, cardId) => {
        const normalizedId = `${cardId ?? ''}`.trim();
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', normalizedId);
        setIsDragging(true);
        setDraggingCardId(normalizedId);
    };

    const handleStageDragEnd = (event, cardId) => {
        const normalizedId = `${cardId ?? ''}`.trim();
        const hovered = document.elementFromPoint(event.clientX, event.clientY);
        
        // 检查是否拖到手牌堆
        const cardDock = document.querySelector('.card-dock__rail');
        if (cardDock && cardDock.contains(hovered)) {
            onRemove?.(normalizedId);
            resetDragState();
            return;
        }
        
        // 检查是否拖到熔炉
        const furnaceZone = containerRef.current?.querySelector('.forge-furnace');
        const insideFurnace = furnaceZone && (furnaceZone.contains(hovered) || isPointInsideElement(furnaceZone, event.clientX, event.clientY));
        if (insideFurnace) {
            handleCardDropInFurnace(normalizedId);
            resetDragState();
            return;
        }
        
        // 检查是否在画布内
        if (!containerRef.current?.contains(hovered)) {
            resetDragState();
            return;
        }
        
        if (onReposition) {
            const position = extractPosition(event);
            onReposition(normalizedId, position);
        }
        resetDragState();
    };

    const handleCardDropInFurnace = useCallback((cardId) => {
        const normalizedId = `${cardId ?? ''}`.trim();
        if (!normalizedId) {
            console.warn('handleCardDropInFurnace 收到空的 cardId', cardId);
            return;
        }

        if (isForging) {
            console.log('正在合成中，无法放入卡牌');
            return;
        }

        console.log('卡牌进入熔炉, ID:', normalizedId, 'hand 数组长度:', hand.length);
        
        // 从手牌中查找卡牌
        const safeHand = Array.isArray(hand) ? hand : [];
        const card = safeHand.find((c) => `${c?.id ?? ''}`.trim() === normalizedId);
        if (!card) {
            console.log('错误: 卡牌未在 hand 列表中找到:', normalizedId);
            console.log('hand 内容:', safeHand.map((c) => c?.id));
            return;
        }
        
        console.log('找到卡牌:', card.name);
        
        setFurnaceCards(prev => {
            // 避免重复添加
            if (prev.some((c) => `${c.id}`.trim() === normalizedId)) {
                console.log('卡牌已在熔炉中');
                return prev;
            }
            const updated = [...prev, card].slice(0, MAX_FURNACE_CARDS);
            console.log('✓ 熔炉现有卡牌数:', updated.length, updated.map(c => c.name));
            
            // 熔炉卡牌独立管理，不影响 selectedIds（画布选中状态）
            // 只通知 onSelectForForge 用于合成逻辑
            const furnaceIds = updated.map((c) => c.id);
            onSelectForForge?.(furnaceIds);
            
            return updated;
        });
        resetDragState();
    }, [hand, isForging, onDrop, onSelectForForge, resetDragState]);

    useEffect(() => {
        setFurnaceCards(prev => {
            const safeHand = Array.isArray(hand) ? hand : [];
            const filtered = prev.filter(card => safeHand.some(entry => entry.id === card.id));
            if (filtered.length === prev.length) {
                return prev;
            }
            return filtered;
        });
    }, [hand]);

    // 监听熔炉卡牌数量，达到2张时触发合成
    useEffect(() => {
        if (furnaceCards.length >= MAX_FURNACE_CARDS && !isForging) {
            console.log('========================================');
            console.log('✓ 触发合成! 熔炉卡牌:', furnaceCards.map(c => c.name).join(' + '));
            console.log('熔炉卡牌数量:', furnaceCards.length);
            console.log('========================================');
            
            // 先更新选中的卡牌
            const cardIds = furnaceCards.slice(0, MAX_FURNACE_CARDS).map((c) => c.id);
            onSelectForForge?.(cardIds);
            setIsForging(true);
            
            // 延迟触发合成，确保状态已更新
            setTimeout(() => {
                console.log('>>> 调用 onSynthesize，熔炉卡牌:', furnaceCards.map(c => c.name));
                onSynthesize?.(furnaceCards);
                
                // 清空熔炉
                setTimeout(() => {
                    console.log('>>> 清空熔炉');
                    setFurnaceProgress(100);
                    setFurnaceCards([]);
                    onSelectForForge?.([]);
                    setIsForging(false);
                }, 1000);
            }, 800);
        }
    }, [furnaceCards, isForging, onSynthesize, onSelectForForge]);

    const handleFurnaceDragOver = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'copy';
        if (!isFurnaceDragOver) {
            console.log('🔥 熔炉 DragOver - 检测到拖动');
            setIsFurnaceDragOver(true);
        }
    };

    const handleFurnaceDragEnter = (event) => {
        event.preventDefault();
        event.stopPropagation();
        console.log('🔥 熔炉 DragEnter');
        if (!isFurnaceDragOver) {
            setIsFurnaceDragOver(true);
        }
    };

    const handleFurnaceDragLeave = (event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsFurnaceDragOver(false);
        }
    };

    const handleFurnaceDrop = (event) => {
        event.preventDefault();
        event.stopPropagation();
        console.log('🔥 熔炉 Drop 事件触发');
        const cardId = event.dataTransfer.getData('text/plain');
        const normalizedId = `${cardId ?? ''}`.trim();
        console.log('🔥 获取到卡牌ID:', normalizedId);
        if (normalizedId) {
            console.log('🔥 直接拖放到熔炉:', normalizedId);
            handleCardDropInFurnace(normalizedId);
        } else {
            console.warn('🔥 熔炉 Drop: 未获取到卡牌ID');
        }
        setIsFurnaceDragOver(false);
        setIsCanvasDragActive(false);
    };

    const handleFurnaceCardDragStart = (event, cardId) => {
        if (isForging) {
            event.preventDefault();
            return;
        }
        const normalizedId = `${cardId ?? ''}`.trim();
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', normalizedId);
        setIsDragging(true);
        setDraggingCardId(normalizedId);
    };

    const handleFurnaceCardDragEnd = (event, cardId) => {
        resetDragState();

        if (isForging) {
            return;
        }

        const hovered = document.elementFromPoint(event.clientX, event.clientY);
        const furnaceZone = containerRef.current?.querySelector('.forge-furnace');
        const insideFurnace = furnaceZone && (furnaceZone.contains(hovered) || isPointInsideElement(furnaceZone, event.clientX, event.clientY));
        if (insideFurnace) {
            setIsFurnaceDragOver(false);
            return;
        }

        const normalizedId = `${cardId ?? ''}`.trim();
        const cardDock = document.querySelector('.card-dock__rail');
        const card = furnaceCards.find((entry) => `${entry.id ?? ''}`.trim() === normalizedId);

        setFurnaceCards((prev) => {
            const next = prev.filter((entry) => `${entry.id ?? ''}`.trim() !== normalizedId);
            onSelectForForge?.(next.map((entry) => entry.id));
            return next;
        });

        if (!card) {
            return;
        }

        if (cardDock && hovered && cardDock.contains(hovered)) {
            onRemove?.(normalizedId);
            return;
        }

        if (containerRef.current?.contains(hovered)) {
            const position = extractPosition(event);
            onDrop?.(normalizedId, position);
            return;
        }
    };

    const canvasClassName = [
        'forge-canvas',
        isDragging ? 'forge-canvas--dragging' : '',
        isCanvasDragActive ? 'forge-canvas--drop-active' : '',
    ].filter(Boolean).join(' ');

    const furnaceClassName = [
        'forge-furnace',
        isForging ? 'forging' : '',
        furnaceCards.length > 0 ? 'has-cards' : '',
        isFurnaceDragOver ? 'forge-furnace--drag-over' : '',
    ].filter(Boolean).join(' ');

    const showProgress = isForging || furnaceProgress > 0;
    const progressDisplay = Math.min(100, Math.round(furnaceProgress));

    return (
        <div
            ref={containerRef}
            className={canvasClassName}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnter={handleCanvasDragEnter}
            onDragLeave={handleCanvasDragLeave}
            role="application"
            aria-label="合成画布"
        >
            <div className="forge-canvas__halo" />
            
            {/* 熔炉区域 */}
            <div 
                className={furnaceClassName}
                onDragOver={handleFurnaceDragOver}
                onDragEnter={handleFurnaceDragEnter}
                onDragLeave={handleFurnaceDragLeave}
                onDrop={handleFurnaceDrop}
            >
                {/* 卡槽 */}
                <div className="forge-furnace__slots">
                    {[0, 1].map((slotIndex) => {
                        const card = furnaceCards[slotIndex];
                        const rarityClass = card?.rarity ? `rarity-${card.rarity.toLowerCase()}` : '';
                        
                        if (card) {
                            return (
                                <div
                                    key={card.id}
                                    className={`forge-furnace__slot filled ${rarityClass} ${isForging ? 'is-forging' : ''} ${draggingCardId === card.id ? 'is-dragging' : ''}`}
                                    draggable={!isForging}
                                    onDragStart={(event) => handleFurnaceCardDragStart(event, card.id)}
                                    onDragEnd={(event) => handleFurnaceCardDragEnd(event, card.id)}
                                >
                                    <div className="forge-furnace__slot-card">
                                        <div className="forge-furnace__slot-name">{card.name}</div>
                                        <div className="forge-furnace__slot-type">{card.type}</div>
                                        {card.rarity && (
                                            <div className="forge-furnace__slot-rarity">{card.rarity}</div>
                                        )}
                                    </div>
                                </div>
                            );
                        }
                        
                        return (
                            <div key={`slot-${slotIndex}`} className="forge-furnace__slot empty">
                                <div className="forge-furnace__slot-placeholder">
                                    <span className="forge-furnace__slot-number">{slotIndex + 1}</span>
                                    <span className="forge-furnace__slot-hint">拖入卡牌</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* 火焰图标 */}
                <div className="forge-furnace__icon">🔥</div>
                
                {/* 状态木牌 */}
                <div className="forge-furnace__status-board">
                    <div className="forge-furnace__status" aria-live="polite">{furnaceStatus}</div>
                    {showProgress && (
                        <div className="forge-furnace__progress" role="status" aria-live="polite">
                            <div className="forge-furnace__progress-track">
                                <div className="forge-furnace__progress-fill" style={{ width: `${progressDisplay}%` }} />
                            </div>
                            <div className="forge-furnace__progress-label">熔炼中 {progressDisplay}%</div>
                        </div>
                    )}
                </div>
            </div>

            {cards.length === 0 && (
                <div className="forge-canvas__hint">拖动卡牌到左上角熔炉进行合成</div>
            )}
            {cards.length >= 1 && cards.length < 2 && (
                <div className="forge-canvas__hint">继续拖入卡牌到熔炉（需要2张）</div>
            )}
            
            {withPositions.map(({ card, position }) => {
                // 如果卡牌在熔炉中，不在画布上显示
                if (furnaceCards.some(fc => fc.id === card.id)) {
                    return null;
                }
                
                const rarityClass = card.rarity ? `rarity-${card.rarity.toLowerCase()}` : '';
                
                return (
                    <div
                        key={card.id}
                        className={`forge-canvas__card ${rarityClass}`}
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

            {ideaCards.length > 0 && (
                <div className="forge-canvas__idea-ribbon">
                    {ideaCards.map((idea) => {
                        const rarityClass = idea?.rarity ? `rarity-${idea.rarity.toLowerCase()}` : '';
                        return (
                            <div key={idea.id} className={`forge-canvas__idea-card ${rarityClass}`}>
                                <div className="forge-canvas__idea-name">{idea.name}</div>
                                {idea.description ? (
                                    <div className="forge-canvas__idea-desc">{idea.description}</div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
