import { useMemo, useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import './ForgeCanvas.css';
import { CardSvg } from './CardSvg.jsx';
import { hasCardSvg } from '../../utils/cardSvgMap.js';
import audioService from '../../services/audioService.js';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const MAX_FURNACE_CARDS = 2;
const MAX_STAGED_CARDS = 10; // 画布最大卡牌数量
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

export const ForgeCanvas = forwardRef(function ForgeCanvas({ cards = [], hand = [], positions = {}, ideaCards = [], forgeLoading = false, forgeResultCard = null, onDrop, onRemove, onReturnCardToHand, onReposition, onSynthesize, onSelectForForge, onSpawnKeyCard, onClearForgeResult, pushMessage }, ref) {
    const containerRef = useRef(null);
    const progressTimerRef = useRef(null);
    const lastForgeClickRef = useRef(0);
    const [furnaceCards, setFurnaceCards] = useState([]);
    const [isForging, setIsForging] = useState(false);
    const [furnaceProgress, setFurnaceProgress] = useState(0);
    const [isCanvasDragActive, setIsCanvasDragActive] = useState(false);
    const [isFurnaceDragOver, setIsFurnaceDragOver] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [draggingCardId, setDraggingCardId] = useState(null);
    const [cheatSequence, setCheatSequence] = useState('');

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

    // 外部同步：根据上层的 forgeLoading 控制锻造状态
    useEffect(() => {
        setIsForging(Boolean(forgeLoading));
    }, [forgeLoading]);

    // 合成完成后清空熔炉
    useEffect(() => {
        if (forgeResultCard && furnaceCards.length > 0) {
            setFurnaceCards([]);
            onSelectForForge?.([]);
        }
    }, [forgeResultCard, furnaceCards, onSelectForForge]);

    // 作弊码：检测键盘输入 "aitaarthur" + Enter
    useEffect(() => {
        const handleKeyDown = (event) => {
            const key = event.key.toLowerCase();
            
            // 按下回车键，检查是否匹配作弊码
            if (key === 'enter') {
                if (cheatSequence === 'aitaarthur') {
                    console.log('🔑 作弊码激活，生成 key card');
                    onSpawnKeyCard?.();
                }
                setCheatSequence('');
                return;
            }
            
            // 忽略修饰键和特殊键
            if (event.ctrlKey || event.altKey || event.metaKey || key.length > 1) {
                return;
            }
            
            // 累积输入字符，最多保留 10 个字符
            setCheatSequence(prev => {
                const updated = (prev + key).slice(-10);
                return updated;
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cheatSequence, onSpawnKeyCard]);

    const handleDragOver = (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (!isCanvasDragActive) {
            setIsCanvasDragActive(true);
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        
        // 检查是否拖到了合成区域，如果是则不处理（让合成区域自己处理）
        const target = event.target;
        const synthesisArea = containerRef.current?.querySelector('.forge-synthesis-area');
        if (synthesisArea && (synthesisArea.contains(target) || synthesisArea === target)) {
            console.log('📍 拖到了合成区域，由合成区域处理');
            return;
        }
        
        const cardId = event.dataTransfer.getData('text/plain');
        const normalizedId = `${cardId ?? ''}`.trim();
        console.log('📍 画布 Drop 事件, cardId:', normalizedId);
        if (!normalizedId) {
            return;
        }
        
        // 检查画布是否已满（只检查从手牌拖来的新卡牌）
        const safeCards = Array.isArray(cards) ? cards : [];
        const isAlreadyOnCanvas = safeCards.some(c => `${c?.id ?? ''}`.trim() === normalizedId);
        if (!isAlreadyOnCanvas && safeCards.length >= MAX_STAGED_CARDS) {
            console.log(`🚫 画布已满（${MAX_STAGED_CARDS}张），无法添加卡牌`);
            pushMessage?.(`画布已满，最多可以放置${MAX_STAGED_CARDS}张卡牌`, 'warning');
            resetDragState();
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
        const furnaceZone = containerRef.current?.querySelector('.forge-synthesis-area');
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
            return false;
        }

        if (isForging) {
            console.log('正在合成中，无法放入卡牌');
            return false;
        }

        // 直接检查forgeResultCard prop，避免DOM查询
        if (forgeResultCard) {
            console.log('🚫 结果区还有卡牌，请先取走再合成');
            pushMessage?.('请先取走结果区的卡牌', 'warning');
            return false;
        }

        console.log('卡牌进入熔炉, ID:', normalizedId, 'hand 数组长度:', hand.length, 'cards 数组长度:', cards.length);
        
        // 从手牌或画布卡牌中查找
        const safeHand = Array.isArray(hand) ? hand : [];
        const safeCards = Array.isArray(cards) ? cards : [];
        let card = safeHand.find((c) => `${c?.id ?? ''}`.trim() === normalizedId);
        
        if (!card) {
            // 如果在手牌中找不到，尝试在画布卡牌中查找
            card = safeCards.find((c) => `${c?.id ?? ''}`.trim() === normalizedId);
        }
        
        if (!card) {
            console.log('错误: 卡牌未找到:', normalizedId);
            console.log('hand 内容:', safeHand.map((c) => c?.id));
            console.log('cards 内容:', safeCards.map((c) => c?.id));
            return false;
        }
        
        console.log('找到卡牌:', card.name);
        
        // 提前检查是否能添加
        const currentFurnaceCards = furnaceCards;
        
        // 避免重复添加
        if (currentFurnaceCards.some((c) => `${c.id}`.trim() === normalizedId)) {
            console.log('卡牌已在熔炉中');
            resetDragState();
            return false;
        }
        
        // 检查熔炉是否已满
        if (currentFurnaceCards.length >= MAX_FURNACE_CARDS) {
            console.log('熔炉已满，无法添加更多卡牌');
            resetDragState();
            return false;
        }
        
        // 可以添加
        setFurnaceCards(prev => {
            const updated = [...prev, card];
            console.log('✓ 熔炉现有卡牌数:', updated.length, updated.map(c => c.name));
            
            // 播放卡牌放置音效
            audioService.playClick();
            
            // 熔炉卡牌独立管理，不影响 selectedIds（画布选中状态）
            // 只通知 onSelectForForge 用于合成逻辑
            const furnaceIds = updated.map((c) => c.id);
            onSelectForForge?.(furnaceIds);
            
            return updated;
        });
        resetDragState();
        return true;
    }, [hand, cards, isForging, furnaceCards, forgeResultCard, onSelectForForge, resetDragState, pushMessage]);

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
        addCardToFurnace: handleCardDropInFurnace
    }), [handleCardDropInFurnace]);

    // 手动触发合成按钮
    const handleForgeClick = useCallback(() => {
        // 防止0.5秒内重复点击
        const now = Date.now();
        if (now - lastForgeClickRef.current < 500) {
            console.log('🚫 点击过快，请稍候');
            return;
        }
        
        if (furnaceCards.length >= MAX_FURNACE_CARDS && !isForging) {
            lastForgeClickRef.current = now;
            
            console.log('========================================');
            console.log('✓ 触发合成! 熔炉卡牌:', furnaceCards.map(c => c.name).join(' + '));
            console.log('熔炉卡牌数量:', furnaceCards.length);
            console.log('========================================');
            
            // 先更新选中的卡牌
            const cardIds = furnaceCards.slice(0, MAX_FURNACE_CARDS).map((c) => c.id);
            onSelectForForge?.(cardIds);
            
            // 直接触发合成，不需要延迟
            console.log('>>> 调用 onSynthesize，熔炉卡牌:', furnaceCards.map(c => c.name));
            onSynthesize?.(furnaceCards);
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
        const furnaceZone = containerRef.current?.querySelector('.forge-synthesis-area');
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
            onReturnCardToHand?.(card);
            return;
        }

        if (containerRef.current?.contains(hovered)) {
            // 检查画布是否已满
            const safeCards = Array.isArray(cards) ? cards : [];
            if (safeCards.length >= MAX_STAGED_CARDS) {
                console.log(`🚫 画布已满（${MAX_STAGED_CARDS}张），无法从熔炉添加卡牌`);
                pushMessage?.(`画布已满，最多可以放置${MAX_STAGED_CARDS}张卡牌`, 'warning');
                // 卡牌返回手牌
                onReturnCardToHand?.(card);
                return;
            }
            
            const position = extractPosition(event);
            onDrop?.(normalizedId, position);
            return;
        }
    };

    const handleResultCardDragStart = (event, cardId) => {
        const normalizedId = `${cardId ?? ''}`.trim();
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', normalizedId);
        setIsDragging(true);
        setDraggingCardId(normalizedId);
        
        // 播放卡牌拖动音效
        audioService.playClick();
    };

    const handleResultCardDragEnd = (event, cardId) => {
        resetDragState();

        const hovered = document.elementFromPoint(event.clientX, event.clientY);
        const normalizedId = `${cardId ?? ''}`.trim();
        const cardDock = document.querySelector('.card-dock__rail');
        
        // 先保存卡牌引用，再清除状态
        const resultCard = forgeResultCard;
        
        // 清除结果卡牌显示
        onClearForgeResult?.();
        
        // 清空熔炉卡槽
        setFurnaceCards([]);
        onSelectForForge?.([]);

        // 检查是否拖到手牌堆（添加到手牌）
        if (cardDock && hovered && cardDock.contains(hovered)) {
            if (resultCard) {
                onReturnCardToHand?.(resultCard);
            }
            return;
        }

        // 检查是否拖到画布（放到画布上）
        if (containerRef.current?.contains(hovered)) {
            // 检查画布是否已满
            const safeCards = Array.isArray(cards) ? cards : [];
            if (safeCards.length >= MAX_STAGED_CARDS) {
                console.log(`🚫 画布已满（${MAX_STAGED_CARDS}张），无法添加合成结果`);
                pushMessage?.(`画布已满，最多可以放置${MAX_STAGED_CARDS}张卡牌`, 'warning');
                // 卡牌返回手牌
                if (resultCard) {
                    onReturnCardToHand?.(resultCard);
                }
                return;
            }
            
            // 先添加到手牌，再放到画布
            if (resultCard) {
                onReturnCardToHand?.(resultCard);
            }
            const position = extractPosition(event);
            onDrop?.(normalizedId, position);
            return;
        }
        
        // 其他情况（拖到画布外），返回手牌
        if (resultCard) {
            onReturnCardToHand?.(resultCard);
        }
    };

    const canvasClassName = [
        'forge-canvas',
        isDragging ? 'forge-canvas--dragging' : '',
        isCanvasDragActive ? 'forge-canvas--drop-active' : '',
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
            
            {/* 合成区域 - 横向布局 */}
            <div 
                className="forge-synthesis-area"
                onDragOver={handleFurnaceDragOver}
                onDragEnter={handleFurnaceDragEnter}
                onDragLeave={handleFurnaceDragLeave}
                onDrop={handleFurnaceDrop}
            >
                {/* 卡槽1 */}
                <div 
                    className="forge-slot-container"
                    onDragOver={handleFurnaceDragOver}
                    onDragEnter={handleFurnaceDragEnter}
                    onDragLeave={handleFurnaceDragLeave}
                    onDrop={handleFurnaceDrop}
                    data-slot-index="0"
                >
                    {furnaceCards[0] ? (
                        <div
                            className={`dock-slot ${furnaceCards[0]?.rarity ? `rarity-${furnaceCards[0].rarity.toLowerCase()}` : ''} ${isForging ? 'is-forging' : ''} ${draggingCardId === furnaceCards[0].id ? 'is-dragging' : ''} ${hasCardSvg(furnaceCards[0].name) ? 'has-svg' : ''}`}
                            draggable={!isForging}
                            onDragStart={(event) => handleFurnaceCardDragStart(event, furnaceCards[0].id)}
                            onDragEnd={(event) => handleFurnaceCardDragEnd(event, furnaceCards[0].id)}
                            style={{ width: '110px', height: '150px', margin: 0 }}
                        >
                            {hasCardSvg(furnaceCards[0].name) ? (
                                <CardSvg card={furnaceCards[0]} className="dock-slot__svg" />
                            ) : (
                                <>
                                    <div className="dock-slot__header">
                                        <span className="dock-slot__name">{furnaceCards[0].name}</span>
                                        <span className={`dock-slot__rarity ${furnaceCards[0].rarity}`}>{furnaceCards[0].rarity}</span>
                                    </div>
                                    <div className="dock-slot__meta">{furnaceCards[0].type}</div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="forge-slot-empty" />
                    )}
                </div>

                {/* 卡槽2 */}
                <div 
                    className="forge-slot-container"
                    onDragOver={handleFurnaceDragOver}
                    onDragEnter={handleFurnaceDragEnter}
                    onDragLeave={handleFurnaceDragLeave}
                    onDrop={handleFurnaceDrop}
                    data-slot-index="1"
                >
                    {furnaceCards[1] ? (
                        <div
                            className={`dock-slot ${furnaceCards[1]?.rarity ? `rarity-${furnaceCards[1].rarity.toLowerCase()}` : ''} ${isForging ? 'is-forging' : ''} ${draggingCardId === furnaceCards[1].id ? 'is-dragging' : ''} ${hasCardSvg(furnaceCards[1].name) ? 'has-svg' : ''}`}
                            draggable={!isForging}
                            onDragStart={(event) => handleFurnaceCardDragStart(event, furnaceCards[1].id)}
                            onDragEnd={(event) => handleFurnaceCardDragEnd(event, furnaceCards[1].id)}
                            style={{ width: '110px', height: '150px', margin: 0 }}
                        >
                            {hasCardSvg(furnaceCards[1].name) ? (
                                <CardSvg card={furnaceCards[1]} className="dock-slot__svg" />
                            ) : (
                                <>
                                    <div className="dock-slot__header">
                                        <span className="dock-slot__name">{furnaceCards[1].name}</span>
                                        <span className={`dock-slot__rarity ${furnaceCards[1].rarity}`}>{furnaceCards[1].rarity}</span>
                                    </div>
                                    <div className="dock-slot__meta">{furnaceCards[1].type}</div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="forge-slot-empty" />
                    )}
                </div>

                {/* 合成按钮 */}
                <button
                    className={`forge-button ${furnaceCards.length >= MAX_FURNACE_CARDS && !isForging ? 'active' : ''} ${isForging ? 'forging' : ''}`}
                    onClick={handleForgeClick}
                    disabled={furnaceCards.length < MAX_FURNACE_CARDS || isForging}
                    aria-label="合成卡牌"
                />

                {/* 结果显示区域 */}
                <div className="forge-result-area">
                    {showProgress && !forgeResultCard && (
                        <div className="forge-progress" role="status" aria-live="polite">
                            <div className="forge-progress-track">
                                <div className="forge-progress-fill" style={{ width: `${progressDisplay}%` }} />
                            </div>
                            <div className="forge-progress-label">合成中 {progressDisplay}%</div>
                        </div>
                    )}
                    {forgeResultCard && (
                        <div
                            className={`dock-slot forge-result-card ${forgeResultCard?.rarity ? `rarity-${forgeResultCard.rarity.toLowerCase()}` : ''} ${draggingCardId === forgeResultCard.id ? 'is-dragging' : ''} ${hasCardSvg(forgeResultCard.name) ? 'has-svg' : ''}`}
                            draggable={true}
                            onDragStart={(event) => handleResultCardDragStart(event, forgeResultCard.id)}
                            onDragEnd={(event) => handleResultCardDragEnd(event, forgeResultCard.id)}
                            style={{ width: '110px', height: '150px', margin: 0 }}
                        >
                            {hasCardSvg(forgeResultCard.name) ? (
                                <CardSvg card={forgeResultCard} className="dock-slot__svg" />
                            ) : (
                                <>
                                    <div className="dock-slot__header">
                                        <span className="dock-slot__name">{forgeResultCard.name}</span>
                                        <span className={`dock-slot__rarity ${forgeResultCard.rarity}`}>{forgeResultCard.rarity}</span>
                                    </div>
                                    <div className="dock-slot__meta">{forgeResultCard.type}</div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {cards.length === 0 && (
                <div className="forge-canvas__hint">拖动卡牌到上方卡槽进行合成</div>
            )}
            {cards.length >= 1 && cards.length < 2 && (
                <div className="forge-canvas__hint">继续拖入卡牌到卡槽（需要2张），然后点击合成按钮</div>
            )}
            
            {withPositions.map(({ card, position }) => {
                // 如果卡牌在熔炉中，不在画布上显示
                if (furnaceCards.some(fc => fc.id === card.id)) {
                    return null;
                }
                
                const rarityClass = card.rarity ? `rarity-${card.rarity.toLowerCase()}` : '';
                const hasSvg = hasCardSvg(card.name);
                const isKeyCard = card.type === 'key' || card.card_type === 'key' || card.rarity === 'ruby';
                
                return (
                    <div
                        key={card.id}
                        className={`forge-canvas__card ${rarityClass} ${hasSvg ? 'has-svg' : ''} ${isKeyCard ? 'is-keycard' : ''}`}
                        style={{
                            left: `${position.x}%`,
                            top: `${position.y}%`,
                        }}
                        draggable
                        onDragStart={(event) => handleStageDragStart(event, card.id)}
                        onDragEnd={(event) => handleStageDragEnd(event, card.id)}
                    >
                        {hasSvg ? (
                            <CardSvg card={card} className="forge-canvas__svg" />
                        ) : (
                            <>
                                <div className="forge-canvas__name">{card.name}</div>
                                <div className="forge-canvas__type">{card.type}</div>
                            </>
                        )}
                    </div>
                );
            })}

            
        </div>
    );
});
