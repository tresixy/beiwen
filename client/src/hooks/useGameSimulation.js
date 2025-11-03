import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FORGE_LOADING_MESSAGES } from '../data/cards.js';
import { createContract } from '../data/contracts.js';
import { createProfessionState, generateProfessionChoices } from '../data/professions.js';
import { createInitialInventory, forgeResultToInventoryItem } from '../data/inventory.js';
import { createInitialCardBook, addCardToBook, loadCardBook, persistCardBook } from '../data/cardBook.js';
import * as gameStateApi from '../services/gameStateApi.js';
import * as eventsApi from '../api/eventsApi.js';
import audioService from '../services/audioService.js';

const INITIAL_RESOURCES = {
    food: 8,
    production: 6,
    research: 4,
};

const MAX_HAND_SIZE = 5; // 手牌最大数量
const MAX_STAGED_CARDS = 10; // 画布最大卡牌数量
const SAVE_HAND_DEBOUNCE_MS = 3000;
const MAX_STAGE_CARDS = 2;
const TEST_DISABLE_SERVER_SYNTH = import.meta.env.VITE_DISABLE_SERVER_SYNTH === 'true';

const OVERLAY_POSITIONS = [
    { x: 42, y: 48 },
    { x: 55, y: 38 },
    { x: 35, y: 52 },
    { x: 60, y: 44 },
];

const pickOverlayPosition = () => OVERLAY_POSITIONS[Math.floor(Math.random() * OVERLAY_POSITIONS.length)];

export function useGameSimulation({ pushMessage, token }) {
    const [serverSyncEnabled, setServerSyncEnabled] = useState(!!token);
    const [loading, setLoading] = useState(!!token);
    const [resources, setResources] = useState(INITIAL_RESOURCES);
    const [turn, setTurn] = useState(1);
    // 使用空手牌初始化，等待从服务器加载
    const [hand, setHand] = useState([]);
    const [cardBook, setCardBook] = useState(() => {
        const loaded = loadCardBook();
        if (loaded && Array.isArray(loaded.cards)) {
            return loaded;
        }
        return createInitialCardBook();
    });
    const [selectedIds, setSelectedIds] = useState([]);
    const [stagedPositions, setStagedPositions] = useState({});
    const [forgePanelOpen, setForgePanelOpen] = useState(false);
    const [aiDialogueOpen, setAiDialogueOpen] = useState(false);
    const [forgeName, setForgeName] = useState('');
    const [forgeStep, setForgeStep] = useState(0);
    const [forgeLoading, setForgeLoading] = useState(false);
    const [overlayState, setOverlayState] = useState({ visible: false, status: 'idle', text: '', position: pickOverlayPosition() });
    const [professionState, setProfessionState] = useState(createProfessionState);
    const [professionPanelOpen, setProfessionPanelOpen] = useState(false);
    const [contract, setContract] = useState(null);
    const [contractPanelOpen, setContractPanelOpen] = useState(false);
    const [inventory, setInventory] = useState(createInitialInventory);
    const [inventoryOpen, setInventoryOpen] = useState(false);
    const [cardBookOpen, setCardBookOpen] = useState(false);
    const [activeEvent, setActiveEvent] = useState(null);
    const [era, setEra] = useState('生存时代');
    const [aiIdeaCards, setAiIdeaCards] = useState([]);

    const forgeIntervalRef = useRef(null);
    const forgeTimeoutRef = useRef(null);
    const overlayTimeoutRef = useRef(null);
    const saveHandTimeoutRef = useRef(null);
    const initialHandLoggedRef = useRef(false);

    const updateCardBook = useCallback((updater) => {
        setCardBook((prev) => {
            const base = prev ?? createInitialCardBook();
            const next = updater(base);
            return persistCardBook(next);
        });
    }, []);

    const selectedCards = useMemo(
        () => (Array.isArray(hand) ? hand : []).filter((card) => selectedIds.includes(card.id)),
        [hand, selectedIds],
    );

    const clearSelection = useCallback(() => {
        setSelectedIds([]);
        setStagedPositions({});
    }, []);

    useEffect(() => {
        if (initialHandLoggedRef.current) {
            return;
        }
        if (serverSyncEnabled && loading) {
            return;
        }
        if (!hand || hand.length === 0) {
            return;
        }
        initialHandLoggedRef.current = true;
        updateCardBook((prev) => hand.reduce((book, card) => addCardToBook(book, card), prev));
    }, [hand, updateCardBook, serverSyncEnabled, loading]);

    const ensureHandSize = useCallback(async (cards) => {
        if (cards.length >= MAX_HAND_SIZE) {
            return cards.slice(0, MAX_HAND_SIZE);
        }
        const missing = MAX_HAND_SIZE - cards.length;
        if (missing <= 0) {
            return cards.slice(0, MAX_HAND_SIZE);
        }
        
        if (!token) {
            console.error('需要登录才能抽牌');
            pushMessage?.('请先登录', 'error');
            return cards;
        }
        
        // 从服务器抽牌
        try {
            const drawn = await gameStateApi.drawCards(token, missing);
            const newCards = drawn?.hand ?? [];
            if (newCards.length > 0) {
                updateCardBook((prev) => newCards.reduce((book, card) => addCardToBook(book, card), prev));
                pushMessage?.(`抽取了 ${newCards.length} 张卡牌。`, 'info');
                return [...cards, ...newCards];
            }
            return cards;
        } catch (err) {
            console.error('从服务器抽牌失败:', err);
            pushMessage?.(`抽牌失败: ${err.message}`, 'error');
            return cards;
        }
    }, [pushMessage, updateCardBook, token]);

    const drawCards = useCallback(async (count = 1) => {
        if (hand.length >= MAX_HAND_SIZE) {
            pushMessage?.('手牌已满，无需抽牌。', 'info');
            return;
        }
        
        if (!token) {
            console.error('需要登录才能抽牌');
            pushMessage?.('请先登录', 'error');
            return;
        }
        
        const slots = Math.min(count, MAX_HAND_SIZE - hand.length);
        if (slots <= 0) {
            return;
        }
        
        // 从服务器抽牌
        try {
            const drawn = await gameStateApi.drawCards(token, slots);
            const newCards = drawn?.hand ?? [];
            if (newCards.length > 0) {
                setHand((prev) => [...prev, ...newCards]);
                updateCardBook((prevBook) => newCards.reduce((book, card) => addCardToBook(book, card), prevBook));
                pushMessage?.(`抽取了 ${newCards.length} 张卡牌。`, 'info');
            }
        } catch (err) {
            console.error('从服务器抽牌失败:', err);
            pushMessage?.(`抽牌失败: ${err.message}`, 'error');
        }
    }, [hand, pushMessage, updateCardBook, token]);

    const stageCard = useCallback((cardId, position) => {
        console.log('🎯 stageCard 被调用, cardId:', cardId, 'position:', position);
        
        setSelectedIds((prev) => {
            console.log('🎯 当前 selectedIds:', prev);
            if (prev.includes(cardId)) {
                console.log('🎯 卡牌已在 selectedIds 中，不重复添加');
                return prev;
            }
            
            // 检查是否超过画布最大数量
            if (prev.length >= MAX_STAGED_CARDS) {
                console.log(`🎯 画布已满（${MAX_STAGED_CARDS}张），无法添加更多卡牌`);
                pushMessage?.(`画布已满，最多可以放置${MAX_STAGED_CARDS}张卡牌`, 'warning');
                return prev;
            }
            
            const accumulated = [...prev, cardId];
            console.log('🎯 添加后 selectedIds:', accumulated);
            return accumulated;
        });
        
        setStagedPositions((prev) => {
            const updated = { ...prev };
            updated[cardId] = position ?? updated[cardId] ?? { x: 50, y: 50 };
            return updated;
        });
    }, [pushMessage]);

    const selectCardsForForge = useCallback((cardIds) => {
        // 熔炉的卡牌单独管理，不影响画布的 selectedIds
        // 仅用于内部合成逻辑记录
        const unique = Array.from(new Set(cardIds)).filter((id) => hand.some((card) => card.id === id)).slice(0, MAX_STAGE_CARDS);
        console.log('selectCardsForForge: 熔炉卡牌', unique);
        // 不做任何状态修改，熔炉组件自己维护 furnaceCards 状态
    }, [hand]);

    const updateStagedPosition = useCallback((cardId, position) => {
        setStagedPositions((prev) => {
            if (!prev[cardId]) {
                return prev;
            }
            return {
                ...prev,
                [cardId]: position,
            };
        });
    }, []);

    const unstageCard = useCallback((cardId) => {
        setSelectedIds((prev) => prev.filter((id) => id !== cardId));
        setStagedPositions((prev) => {
            if (!prev[cardId]) {
                return prev;
            }
            const { [cardId]: _removed, ...rest } = prev;
            return rest;
        });
    }, []);

    const openForgePanel = useCallback(() => {
        if (selectedCards.length < 2) {
            pushMessage?.('请至少选择两张卡牌进行合成。', 'error');
            return;
        }
        setForgePanelOpen(true);
        setForgeName('');
        setForgeStep(0);
    }, [pushMessage, selectedCards.length]);

    const closeForgePanel = useCallback(() => {
        setForgePanelOpen(false);
        setForgeName('');
    }, []);

    const stopForgeTimers = useCallback(() => {
        if (forgeIntervalRef.current) {
            window.clearInterval(forgeIntervalRef.current);
            forgeIntervalRef.current = null;
        }
        if (forgeTimeoutRef.current) {
            window.clearTimeout(forgeTimeoutRef.current);
            forgeTimeoutRef.current = null;
        }
        if (overlayTimeoutRef.current) {
            window.clearTimeout(overlayTimeoutRef.current);
            overlayTimeoutRef.current = null;
        }
    }, []);

    const handleForgeFailure = useCallback((message) => {
        const errorText = message || '融合失败';
        pushMessage?.(errorText, 'error');
        setForgeLoading(false);
        setForgePanelOpen(false);
        setForgeName('');
        setOverlayState((prev) => ({ ...prev, visible: false, status: 'error', text: '' }));
        stopForgeTimers();
    }, [pushMessage, stopForgeTimers]);

    const finishForge = useCallback(async (resultCard, forgedCardIds = null) => {
        // 如果没有传入实际合成的卡牌ID，使用selectedIds
        const actualForgedIds = forgedCardIds || [...selectedIds];
        
        // 获取合成前的卡牌名称（用于显示）
        const forgedCardNames = actualForgedIds
            .map(id => hand.find(c => c.id === id)?.name)
            .filter(Boolean)
            .join(' + ') || '未知';
        
        // 只清除实际被合成的卡牌，不清除画布上其他卡牌
        setSelectedIds(prev => prev.filter(id => !actualForgedIds.includes(id)));
        setStagedPositions(prev => {
            const newPos = { ...prev };
            actualForgedIds.forEach(id => delete newPos[id]);
            return newPos;
        });
        
        // 从手牌中移除被消耗的卡牌，并添加新卡牌
        const remaining = hand.filter((card) => !actualForgedIds.includes(card.id));
        setHand([...remaining, resultCard]);
        
        // 将新卡牌放到画布中间
        setStagedPositions((prev) => ({
            ...prev,
            [resultCard.id]: { x: 50, y: 50 },
        }));
        
        // 选中新卡牌并显示在画布上
        setSelectedIds([resultCard.id]);
        
        setInventory((prev) => [...prev, forgeResultToInventoryItem(resultCard)]);
        updateCardBook((prev) => addCardToBook(prev, resultCard));
        setForgeLoading(false);
        setForgePanelOpen(false);
        setForgeName('');
        setOverlayState((prev) => ({ ...prev, visible: false }));
        
        // 显示合成详情
        pushMessage?.(`✨ 合成成功：${forgedCardNames} → 「${resultCard.name}」`, 'success');
    }, [hand, selectedIds, updateCardBook, pushMessage, token, serverSyncEnabled]);

    const scheduleLocalForge = useCallback(() => {
        forgeTimeoutRef.current = window.setTimeout(() => {
            handleForgeFailure('融合失败：未能触发AI合成');
        }, 2000);
    }, [handleForgeFailure]);

    const submitForge = useCallback(async (name, cardsToForge = null, aiIdea = null) => {
        const cards = cardsToForge || selectedCards;
        if (cards.length < 2) {
            pushMessage?.('请至少选择两张卡牌进行合成。', 'error');
            return;
        }
        const trimmedName = (name || forgeName).trim();
        if (!trimmedName) {
            pushMessage?.('请为合成命名。', 'error');
            return;
        }

        setForgeLoading(true);
        setAiDialogueOpen(false);
        setAiIdeaCards([]);
        setOverlayState({
            visible: true,
            status: 'loading',
            text: '熔炉运转中…',
            position: pickOverlayPosition(),
        });
        setForgeStep(0);

        forgeIntervalRef.current = window.setInterval(() => {
            setForgeStep((prev) => (prev + 1) % FORGE_LOADING_MESSAGES.length);
        }, 1600);

        if (TEST_DISABLE_SERVER_SYNTH) {
            scheduleLocalForge();
            return;
        }

        try {
            const localToken = token || localStorage.getItem('token');
            if (localToken && serverSyncEnabled) {
                try {
                    // 传递完整的卡牌信息，避免后端重复查询
                    const cardData = cards.map(card => ({
                        id: card.id,
                        name: card.name,
                        type: card.type,
                        rarity: card.rarity,
                        tier: card.tier || 1,
                        attrs: card.attrs || {},
                    }));
                    const mode = aiIdea ? 'ai' : 'auto';
                    
                    console.log('🔧 准备调用合成API:', {
                        cardData,
                        trimmedName,
                        mode,
                        tokenExists: !!localToken
                    });
                    
                    // 调用统一的合成API（传递完整卡牌数据）
                    const data = await gameStateApi.synthesize(localToken, cardData, trimmedName, mode, false);
                    
                    console.log('✅ 合成API返回:', data);
                    
                    if (!data?.aiUsed) {
                        handleForgeFailure('融合失败：未能触发AI合成');
                        return;
                    }

                    if (!data.item) {
                        handleForgeFailure('融合失败：AI未返回合成结果');
                        return;
                    }

                    // 使用实际返回的物品名称
                    const actualName = data.item?.name || trimmedName || '合成物';
                    const resultCard = {
                        id: `card-${Date.now()}`,
                        name: actualName,
                        type: data.item?.attrs?.type || '合成物',
                        rarity: data.item?.tier ? ['common', 'uncommon', 'rare', 'epic', 'legendary'][Math.min(data.item.tier - 1, 4)] : 'common',
                        attrs: data.item?.attrs,
                    };

                    if (Array.isArray(data.ideas) && data.ideas.length > 0) {
                        const createdAt = Date.now();
                        const nextIdeaCards = data.ideas.map((idea, index) => {
                            const ideaName = idea.name || idea.results || `AI灵感 ${index + 1}`;
                            return {
                                id: `ai-idea-${createdAt}-${index}`,
                                name: ideaName,
                                type: 'AI灵感',
                                rarity: 'epic',
                                description: idea.prompt || idea.results || '',
                            };
                        });
                        setAiIdeaCards(nextIdeaCards);
                    }
                    
                    // 如果服务器消耗了卡牌，需要从手牌中移除它们
                    if (data.needRefreshHand && data.cardsConsumed) {
                        // 从手牌中移除已消耗的卡牌（支持重复名称）
                        const consumedNames = [...data.cardsConsumed]; // 复制数组避免修改原数据
                        const remainingHand = [];
                        
                        for (const card of hand) {
                            const index = consumedNames.indexOf(card.name);
                            if (index >= 0) {
                                // 这张卡需要被消耗，从列表移除
                                consumedNames.splice(index, 1);
                            } else {
                                // 这张卡保留
                                remainingHand.push(card);
                            }
                        }
                        
                        // 更新手牌（包含新合成的卡牌）
                        setHand([...remainingHand, resultCard]);
                        
                        // 将新卡牌放到画布中间
                        setStagedPositions((prev) => ({
                            ...prev,
                            [resultCard.id]: { x: 50, y: 50 },
                        }));
                        
                        // 选中新卡牌并显示在画布上
                        setSelectedIds([resultCard.id]);
                        
                        // 更新库存和卡牌图鉴
                        setInventory((prev) => [...prev, forgeResultToInventoryItem(resultCard)]);
                        updateCardBook((prev) => addCardToBook(prev, resultCard));
                        
                        // 清理状态
                        setForgeLoading(false);
                        setForgePanelOpen(false);
                        setForgeName('');
                        setOverlayState({ visible: false });
                        
                        // 播放合成音效（检查是否为钥匙卡）
                        const isKeyCard = resultCard.rarity === 'ruby';
                        audioService.playSynthesis(isKeyCard);
                        
                        // 显示合成详情
                        const inputNames = cards.map(c => c.name).join(' + ');
                        pushMessage?.(`✨ 合成成功：${inputNames} → 「${actualName}」`, 'success');
                        
                        if (data.aiUsed && data.ideas && data.ideas.length > 0) {
                            const idea = data.ideas[0];
                            const ideaText = idea.name || idea.results || '未知灵感';
                            pushMessage?.(`🤖 AI灵感：${ideaText}`, 'info');
                        }
                        
                        // 检测是否匹配 key card
                        if (activeEvent && activeEvent.required_key) {
                            const requiredKeyRaw = `${activeEvent.required_key}`.trim();
                            const requiredKeys = requiredKeyRaw.split('或').map(k => k.trim());
                            const cardName = resultCard.name;
                            
                            let isExactMatch = false;
                            let isPartialMatch = false;
                            
                            // 检查精确匹配
                            for (const key of requiredKeys) {
                                if (cardName === key) {
                                    isExactMatch = true;
                                    break;
                                }
                            }
                            
                            // 检查模糊匹配（卡牌名包含 key card 名）
                            if (!isExactMatch) {
                                for (const key of requiredKeys) {
                                    if (cardName.includes(key)) {
                                        isPartialMatch = true;
                                        break;
                                    }
                                }
                            }
                            
                            // 触发胜利结算
                            if (isExactMatch || isPartialMatch) {
                                console.log('🎉 检测到胜利条件！', { cardName, isExactMatch, isPartialMatch, requiredKeys });
                                setTimeout(() => {
                                    if (window.showVictoryModal) {
                                        window.showVictoryModal({
                                            eventName: activeEvent.name,
                                            cardName: cardName,
                                            isFullVictory: isExactMatch,
                                            onBackToLobby: async () => {
                                                // 保存通关状态到后端
                                                try {
                                                    const selectedHexStr = localStorage.getItem('selectedHex');
                                                    const selectedHex = selectedHexStr ? JSON.parse(selectedHexStr) : null;
                                                    console.log('🎯 调用 completeEvent:', {
                                                        eventId: activeEvent.id,
                                                        eventName: activeEvent.name,
                                                        cardName,
                                                        selectedHex,
                                                        handCards: hand.map(c => c.name),
                                                        isExactMatch
                                                    });
                                                    const result = await eventsApi.completeEvent(token, activeEvent.id, cardName, selectedHex, hand.map(c => c.name), isExactMatch);
                                                    console.log('✅ completeEvent 返回结果:', result);
                                                    
                                                    // 等待500ms确保数据库已保存
                                                    await new Promise(resolve => setTimeout(resolve, 500));
                                                    
                                                    // 返回主页
                                                    window.location.href = '/';
                                                } catch (err) {
                                                    console.error('保存通关状态失败:', err);
                                                    window.location.href = '/';
                                                }
                                            }
                                        });
                                    }
                                }, 800);
                            }
                        }
                    } else {
                        // 如果没有消耗卡牌，直接从手牌中移除并显示合成结果
                        const forgedCardIds = cards.map(c => c.id);
                        const remainingHand = hand.filter((card) => !forgedCardIds.includes(card.id));
                        // 更新手牌（包含新合成的卡牌）
                        setHand([...remainingHand, resultCard]);
                        
                        // 只清除实际被合成的卡牌，不清除画布上其他卡牌
                        setSelectedIds(prev => prev.filter(id => !forgedCardIds.includes(id)));
                        setStagedPositions(prev => {
                            const newPos = { ...prev };
                            forgedCardIds.forEach(id => delete newPos[id]);
                            return newPos;
                        });
                        
                        // 将新卡牌放到画布中间
                        setStagedPositions((prev) => ({
                            ...prev,
                            [resultCard.id]: { x: 50, y: 50 },
                        }));
                        
                        // 选中新卡牌并显示在画布上
                        setSelectedIds([resultCard.id]);
                        
                        // 更新库存和卡牌图鉴
                        setInventory((prev) => [...prev, forgeResultToInventoryItem(resultCard)]);
                        updateCardBook((prev) => addCardToBook(prev, resultCard));
                        
                        // 清理状态
                        setForgeLoading(false);
                        setForgePanelOpen(false);
                        setForgeName('');
                        setOverlayState({ visible: false });
                        
                        // 播放合成音效（检查是否为钥匙卡）
                        const isKeyCard = resultCard.rarity === 'ruby';
                        audioService.playSynthesis(isKeyCard);
                        
                        // 显示合成详情
                        const inputNames = cards.map(c => c.name).join(' + ');
                        pushMessage?.(`✨ 合成成功：${inputNames} → 「${resultCard.name}」`, 'success');
                        
                        if (data.aiUsed && data.ideas && data.ideas.length > 0) {
                            const idea = data.ideas[0];
                            const ideaText = idea.name || idea.results || '未知灵感';
                            pushMessage?.(`🤖 AI灵感：${ideaText}`, 'info');
                        }
                        
                        // 检测是否匹配 key card
                        if (activeEvent && activeEvent.required_key) {
                            const requiredKeyRaw = `${activeEvent.required_key}`.trim();
                            const requiredKeys = requiredKeyRaw.split('或').map(k => k.trim());
                            const cardName = resultCard.name;
                            
                            let isExactMatch = false;
                            let isPartialMatch = false;
                            
                            // 检查精确匹配
                            for (const key of requiredKeys) {
                                if (cardName === key) {
                                    isExactMatch = true;
                                    break;
                                }
                            }
                            
                            // 检查模糊匹配（卡牌名包含 key card 名）
                            if (!isExactMatch) {
                                for (const key of requiredKeys) {
                                    if (cardName.includes(key)) {
                                        isPartialMatch = true;
                                        break;
                                    }
                                }
                            }
                            
                            // 触发胜利结算
                            if (isExactMatch || isPartialMatch) {
                                console.log('🎉 检测到胜利条件！', { cardName, isExactMatch, isPartialMatch, requiredKeys });
                                setTimeout(() => {
                                    if (window.showVictoryModal) {
                                        window.showVictoryModal({
                                            eventName: activeEvent.name,
                                            cardName: cardName,
                                            isFullVictory: isExactMatch,
                                            onBackToLobby: async () => {
                                                // 保存通关状态到后端
                                                try {
                                                    const selectedHexStr = localStorage.getItem('selectedHex');
                                                    const selectedHex = selectedHexStr ? JSON.parse(selectedHexStr) : null;
                                                    console.log('🎯 调用 completeEvent:', {
                                                        eventId: activeEvent.id,
                                                        eventName: activeEvent.name,
                                                        cardName,
                                                        selectedHex,
                                                        handCards: hand.map(c => c.name),
                                                        isExactMatch
                                                    });
                                                    const result = await eventsApi.completeEvent(token, activeEvent.id, cardName, selectedHex, hand.map(c => c.name), isExactMatch);
                                                    console.log('✅ completeEvent 返回结果:', result);
                                                    
                                                    // 等待500ms确保数据库已保存
                                                    await new Promise(resolve => setTimeout(resolve, 500));
                                                    
                                                    // 返回主页
                                                    window.location.href = '/';
                                                } catch (err) {
                                                    console.error('保存通关状态失败:', err);
                                                    window.location.href = '/';
                                                }
                                            }
                                        });
                                    }
                                }, 800);
                            }
                        }
                    }
                    
                    stopForgeTimers();
                    return;
                } catch (apiErr) {
                    console.error('❌ API合成失败:', apiErr);
                    console.error('错误详情:', {
                        message: apiErr.message,
                        stack: apiErr.stack
                    });
                    // 显示融合失败的错误信息
                    const errorMessage = apiErr.message || apiErr.error || '融合失败';
                    handleForgeFailure(errorMessage);
                    return;
                }
            }

            // 如果没有token或服务器同步未启用，直接返回错误
            handleForgeFailure('融合失败：需要登录才能进行合成');
        } catch (err) {
            handleForgeFailure(err?.message || '融合失败');
        }
    }, [forgeName, handleForgeFailure, pushMessage, scheduleLocalForge, selectedCards, stopForgeTimers, serverSyncEnabled, token]);

    const updateResources = useCallback((modifier) => {
        setResources((prev) => ({
            food: Math.max(0, prev.food + (modifier.food ?? 0)),
            production: Math.max(0, prev.production + (modifier.production ?? 0)),
            research: Math.max(0, prev.research + (modifier.research ?? 0)),
        }));
    }, []);

    const endTurn = useCallback(async () => {
        // 如果启用服务器同步，调用API
        if (serverSyncEnabled && token) {
            try {
                const result = await gameStateApi.endTurn(token);
                setTurn(result.turn);
                
                // 更新资源
                const newResources = await gameStateApi.getResources(token);
                setResources({
                    food: newResources.food || 0,
                    production: newResources.production || 0,
                    research: newResources.research || 0,
                });

                // 处理契约
                if (result.contract) {
                    setContract(result.contract);
                    setContractPanelOpen(true);
                    pushMessage?.('发现新的社会契约，可选择其一。', 'info');
                }

                // 处理职业选择
                if (result.professionChoices && result.professionChoices.length > 0) {
                    setProfessionState((prev) => ({
                        ...prev,
                        pendingChoices: result.professionChoices,
                    }));
                    setProfessionPanelOpen(true);
                }

                pushMessage?.(`回合 ${result.turn} 开始，资源已结算。`, 'info');
                return;
            } catch (err) {
                console.error('服务器回合结束失败:', err);
                pushMessage?.('服务器同步失败，使用本地模式', 'warning');
            }
        }

        // 本地模式
        setTurn((prev) => prev + 1);

        const drift = {
            food: 1 + Math.floor(Math.random() * 3),
            production: 1 + Math.floor(Math.random() * 2),
            research: 1 + Math.floor(Math.random() * 2),
        };
        updateResources(drift);

        if (!contract) {
            const newContract = createContract();
            setContract(newContract);
            setContractPanelOpen(true);
            pushMessage?.('发现新的社会契约，可选择其一。', 'info');
        } else {
            pushMessage?.('回合结束，资源已结算。', 'info');
        }
    }, [contract, pushMessage, updateResources, serverSyncEnabled, token]);

    const showInventory = useCallback(() => {
        setInventoryOpen(true);
    }, []);

    const closeInventory = useCallback(() => {
        setInventoryOpen(false);
    }, []);

    const showCardBook = useCallback(() => {
        setCardBookOpen(true);
    }, []);

    const closeCardBook = useCallback(() => {
        setCardBookOpen(false);
    }, []);

    const openProfessionPanel = useCallback(() => {
        setProfessionPanelOpen(true);
        if (!professionState.pendingChoices || professionState.pendingChoices.length === 0) {
            setProfessionState((prev) => ({
                ...prev,
                pendingChoices: generateProfessionChoices(),
            }));
        }
    }, [professionState.pendingChoices]);

    const closeProfessionPanel = useCallback(() => {
        setProfessionPanelOpen(false);
    }, []);

    const chooseProfession = useCallback(async (index) => {
        const localToken = token || localStorage.getItem('token');
        
        setProfessionState((prev) => {
            const choice = prev.pendingChoices?.[index];
            if (!choice) {
                return prev;
            }
            
            // 如果启用了服务器同步，保存到服务器
            if (localToken && serverSyncEnabled) {
                gameStateApi.selectProfession(localToken, index)
                    .then(() => {
                        pushMessage?.(`已转职：${choice.name}（已同步到云端）`, 'success');
                    })
                    .catch(err => {
                        console.error('职业同步失败:', err);
                        pushMessage?.(`已转职：${choice.name}（本地）`, 'warning');
                    });
            } else {
                pushMessage?.(`已转职：${choice.name}`, 'success');
            }
            
            return {
                ...prev,
                active: choice,
                pendingChoices: [],
            };
        });
        setProfessionPanelOpen(false);
    }, [pushMessage, serverSyncEnabled, token]);

    const regenerateProfessions = useCallback(() => {
        setProfessionState((prev) => ({
            ...prev,
            pendingChoices: generateProfessionChoices(),
        }));
        pushMessage?.('已刷新新的一批职业灵感。', 'info');
    }, [pushMessage]);

    // 管理员工具：为当前事件生成所需的钥匙卡
    const spawnKeyCard = useCallback(() => {
        console.log('🔍 作弊码调试信息:', {
            activeEvent,
            token: !!token,
            era,
            hand: hand.length
        });
        
        if (!activeEvent) {
            pushMessage?.('当前没有激活的事件，请稍后再试或联系管理员', 'warning');
            console.warn('❌ activeEvent 为空，可能原因：1) 游戏状态未加载完成 2) 所有事件已完成 3) 未初始化游戏');
            
            // 尝试重新获取激活事件
            if (token) {
                console.log('🔄 尝试重新获取激活事件...');
                eventsApi.getActiveEvent(token)
                    .then((eventData) => {
                        if (eventData.event) {
                            console.log('✅ 成功获取激活事件:', eventData.event);
                            // 这里无法直接调用 setActiveEvent，因为它在 callback 外部
                            pushMessage?.(`已找到激活事件：${eventData.event.name}，请再次使用作弊码`, 'info');
                        } else {
                            console.log('❌ 没有激活的事件');
                            pushMessage?.('当前没有激活的事件', 'error');
                        }
                    })
                    .catch((err) => {
                        console.error('❌ 获取激活事件失败:', err);
                        pushMessage?.('获取事件失败: ' + err.message, 'error');
                    });
            }
            return;
        }

        const requiredKeyRaw = `${activeEvent.required_key || ''}`.trim();
        if (!requiredKeyRaw) {
            pushMessage?.('当前事件未指定钥匙', 'warning');
            return;
        }

        // 若存在多选钥匙，以"或"分隔，取第一个
        const requiredKeyName = requiredKeyRaw.split('或')[0].trim();
        if (!requiredKeyName) {
            pushMessage?.('无法解析事件钥匙', 'warning');
            return;
        }

        const newKeyCard = {
            id: `key-${Date.now()}`,
            name: requiredKeyName,
            type: '钥匙',
            rarity: 'epic',
        };

        setHand((previousHand) => {
            const safeHand = Array.isArray(previousHand) ? previousHand : [];
            if (safeHand.length < MAX_HAND_SIZE) {
                return [...safeHand, newKeyCard];
            }
            // 手牌已满，替换第一张以确保测试顺畅
            const [, ...rest] = safeHand;
            return [...rest, newKeyCard];
        });

        // 放入图鉴
        updateCardBook((previous) => addCardToBook(previous, newKeyCard));

        pushMessage?.(`已生成钥匙卡：「${requiredKeyName}」`, 'success');
        
        // 检测是否匹配 key card（作弊码生成的也触发胜利检测）
        if (activeEvent && activeEvent.required_key) {
            const requiredKeys = requiredKeyRaw.split('或').map(k => k.trim());
            const cardName = requiredKeyName;
            
            let isExactMatch = false;
            let isPartialMatch = false;
            
            // 检查精确匹配
            for (const key of requiredKeys) {
                if (cardName === key) {
                    isExactMatch = true;
                    break;
                }
            }
            
            // 检查模糊匹配（卡牌名包含 key card 名）
            if (!isExactMatch) {
                for (const key of requiredKeys) {
                    if (cardName.includes(key)) {
                        isPartialMatch = true;
                        break;
                    }
                }
            }
            
                            // 触发胜利结算
                            if (isExactMatch || isPartialMatch) {
                                console.log('🎉 作弊码触发胜利条件！', { cardName, isExactMatch, isPartialMatch, requiredKeys });
                                setTimeout(() => {
                                    console.log('🎯 检查 window.showVictoryModal:', window.showVictoryModal);
                                    if (window.showVictoryModal) {
                                        console.log('✅ 调用 window.showVictoryModal');
                                        window.showVictoryModal({
                            eventName: activeEvent.name,
                            cardName: cardName,
                            isFullVictory: isExactMatch,
                            onBackToLobby: async () => {
                                // 保存通关状态到后端
                                try {
                                    const localToken = token || localStorage.getItem('token');
                                    const selectedHexStr = localStorage.getItem('selectedHex');
                                    const selectedHex = selectedHexStr ? JSON.parse(selectedHexStr) : null;
                                    console.log('🎯 作弊码调用 completeEvent:', {
                                        eventId: activeEvent.id,
                                        eventName: activeEvent.name,
                                        cardName,
                                        selectedHex,
                                        handCards: [cardName],
                                        isExactMatch
                                    });
                                    const result = await eventsApi.completeEvent(localToken, activeEvent.id, cardName, selectedHex, [cardName], isExactMatch);
                                    console.log('✅ completeEvent 返回结果:', result);
                                    
                                    // 等待500ms确保数据库已保存
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                    
                                    // 返回主页
                                    window.location.href = '/';
                                } catch (err) {
                                    console.error('保存通关状态失败:', err);
                                    window.location.href = '/';
                                }
                            }
                        });
                    }
                }, 800);
            }
        }
    }, [activeEvent, pushMessage, updateCardBook, token, era, hand]);

    const toggleCarryOver = useCallback(async (carryOver) => {
        const localToken = token || localStorage.getItem('token');
        
        setProfessionState((prev) => ({ ...prev, carryOver }));
        
        // 如果启用了服务器同步，保存到服务器
        if (localToken && serverSyncEnabled) {
            try {
                await gameStateApi.setCarryOver(localToken, carryOver);
                pushMessage?.(`下一局沿用职业：${carryOver ? '是' : '否'}（已同步）`, 'info');
            } catch (err) {
                console.error('职业沿用设置同步失败:', err);
                pushMessage?.(`下一局沿用职业：${carryOver ? '是' : '否'}（本地）`, 'warning');
            }
        } else {
            pushMessage?.(`下一局沿用职业：${carryOver ? '是' : '否'}`, 'info');
        }
    }, [pushMessage, serverSyncEnabled, token]);

    const openContractPanel = useCallback(() => {
        if (!contract) {
            const newContract = createContract();
            setContract(newContract);
            setContractPanelOpen(true);
            return;
        }
        setContractPanelOpen(true);
    }, [contract]);

    const closeContractPanel = useCallback(() => {
        setContractPanelOpen(false);
    }, []);

    const chooseContractChoice = useCallback((choiceId) => {
        if (!contract) {
            return;
        }
        const choice = contract.choices.find((item) => item.id === choiceId);
        if (!choice) {
            return;
        }
        updateResources(choice.effects);
        pushMessage?.(`契约生效：${choice.text}`, 'success');
        setContract(null);
        setContractPanelOpen(false);
    }, [contract, pushMessage, updateResources]);

    const forgeMessage = FORGE_LOADING_MESSAGES[forgeStep % FORGE_LOADING_MESSAGES.length];

    // 初始加载服务器状态
    useEffect(() => {
        if (!serverSyncEnabled || !token || loading === false) return;

        const loadServerState = async () => {
            try {
                const state = await gameStateApi.getGameState(token);

                // 加载资源
                if (state.resources) {
                    setResources({
                        food: state.resources.food || 0,
                        production: state.resources.production || 0,
                        research: state.resources.research || 0,
                    });
                    setTurn(state.resources.turn || 1);
                }

                // 加载手牌
                if (state.hand && state.hand.length > 0) {
                    setHand(state.hand);
                    const meaningfulCards = state.hand.filter((card) => card && card.type !== 'empty');
                    if (meaningfulCards.length > 0) {
                        updateCardBook((prev) => meaningfulCards.reduce((book, card) => addCardToBook(book, card), prev));
                    }
                } else {
                    // 手牌为空，从服务器抽取初始手牌
                    try {
                        const drawn = await gameStateApi.drawCards(token, MAX_HAND_SIZE);
                        const newCards = drawn?.hand ?? [];
                        if (newCards.length > 0) {
                            setHand(newCards);
                            const meaningfulCards = newCards.filter((card) => card && card.type !== 'empty');
                            if (meaningfulCards.length > 0) {
                                updateCardBook((prev) => meaningfulCards.reduce((book, card) => addCardToBook(book, card), prev));
                            }
                        }
                    } catch (drawErr) {
                        console.error('抽取初始手牌失败:', drawErr);
                        pushMessage?.('抽牌失败，使用默认手牌', 'warning');
                    }
                }

                // 加载背包
                if (state.inventory) {
                    setInventory(state.inventory.slots || []);
                }

                // 加载职业
                if (state.profession) {
                    setProfessionState(state.profession);
                }

                // 加载契约
                if (state.contract) {
                    setContract(state.contract);
                }

                // 加载时代和激活事件
                if (state.era) {
                    setEra(state.era);
                }
                if (state.activeEvent) {
                    setActiveEvent(state.activeEvent);
                }

                // 单独获取激活事件（如果state中没有）
                if (!state.activeEvent) {
                    try {
                        const eventData = await eventsApi.getActiveEvent(token);
                        if (eventData.event) {
                            setActiveEvent(eventData.event);
                        }
                    } catch (eventErr) {
                        console.error('获取激活事件失败:', eventErr);
                    }
                }

                pushMessage?.('游戏进度已从服务器加载', 'success');
            } catch (err) {
                console.error('加载服务器状态失败:', err);
                pushMessage?.('无法加载云存档，使用本地模式', 'warning');
                setServerSyncEnabled(false);
            } finally {
                setLoading(false);
            }
        };

        loadServerState();
    }, [serverSyncEnabled, token, pushMessage, updateCardBook]);

    // 保存手牌到服务器（防抖）
    useEffect(() => {
        if (!serverSyncEnabled || !token || loading) return;
        if (!Array.isArray(hand) || hand.length === 0) return;

        if (saveHandTimeoutRef.current) {
            clearTimeout(saveHandTimeoutRef.current);
        }

        saveHandTimeoutRef.current = setTimeout(async () => {
            try {
                await gameStateApi.saveHand(token, hand);
            } catch (err) {
                console.error('保存手牌失败:', err);
            }
        }, SAVE_HAND_DEBOUNCE_MS);

        return () => {
            if (saveHandTimeoutRef.current) {
                clearTimeout(saveHandTimeoutRef.current);
            }
        };
    }, [hand, serverSyncEnabled, token, loading]);

    useEffect(() => stopForgeTimers, [stopForgeTimers]);

    const closeAiDialogue = useCallback(() => {
        setAiDialogueOpen(false);
    }, []);

    // 完成事件的函数
    const completeEvent = useCallback(async (cardName) => {
        if (!activeEvent || !token) {
            return;
        }

        try {
            // 从localStorage获取选中的地块（由Lobby设置）
            const selectedHexStr = localStorage.getItem('selectedHex');
            const selectedHex = selectedHexStr ? JSON.parse(selectedHexStr) : null;
            
            // 获取当前手牌中的所有卡牌名称（包括key卡和合成的卡牌）
            const handCardNames = hand.map(card => card.name);
            
            const result = await eventsApi.completeEvent(token, activeEvent.id, cardName, selectedHex, handCardNames);
            
            if (result.success) {
                // 播放事件完成音效
                audioService.playEventComplete();
                
                pushMessage?.(`🎉 成功完成【${activeEvent.name}】`, 'success');
                
                // 清空所有手牌（因为都已加入背包）
                setHand([]);
                setSelectedIds([]);
                
                // 显示胜利弹窗
                if (window.showVictoryModal) {
                    window.showVictoryModal({
                        eventName: activeEvent.name,
                        reward: result.reward,
                        cardsAdded: result.cardsAdded || [],
                    });
                }
                
                // 更新时代
                if (result.newEra && result.newEra !== era) {
                    // 播放时代切换音效
                    audioService.playEraTransition();
                    setEra(result.newEra);
                    pushMessage?.(`🌟 进入新时代：${result.newEra}`, 'success');
                }

                // 刷新激活事件
                try {
                    const eventData = await eventsApi.getActiveEvent(token);
                    if (eventData.event) {
                        setActiveEvent(eventData.event);
                    } else {
                        setActiveEvent(null);
                        pushMessage?.('🎊 恭喜！你已完成所有挑战！', 'success');
                    }
                } catch (err) {
                    console.error('刷新激活事件失败:', err);
                    setActiveEvent(null);
                }
                
                // 刷新背包数据
                try {
                    const inventoryData = await gameStateApi.getInventory(token);
                    if (inventoryData) {
                        setInventory(inventoryData);
                    }
                } catch (err) {
                    console.error('刷新背包失败:', err);
                }
            }
        } catch (err) {
            console.error('完成事件失败:', err);
            pushMessage?.(err.message || '完成事件失败', 'error');
        }
    }, [activeEvent, token, pushMessage, hand, setInventory]);

    // 保存手牌到服务器
    const saveHandToServer = useCallback(async () => {
        if (!token || !hand) return;
        try {
            await gameStateApi.saveHand(token, hand);
            console.log('✅ 手牌已保存到服务器');
        } catch (err) {
            console.error('❌ 保存手牌失败:', err);
        }
    }, [token, hand]);

    // 清除手牌（不保存退出时）
    const clearHandFromServer = useCallback(async () => {
        if (!token) return;
        try {
            await gameStateApi.saveHand(token, []);
            console.log('✅ 手牌已清空');
        } catch (err) {
            console.error('❌ 清空手牌失败:', err);
        }
    }, [token]);

    // 自动补牌到5张
    const fillHandToMax = useCallback(async () => {
        if (!token || hand.length >= MAX_HAND_SIZE) return;
        
        const needed = MAX_HAND_SIZE - hand.length;
        try {
            const drawn = await gameStateApi.drawCards(token, needed);
            const newCards = drawn?.hand ?? [];
            if (newCards.length > 0) {
                setHand((prev) => [...prev, ...newCards]);
                updateCardBook((prevBook) => newCards.reduce((book, card) => addCardToBook(book, card), prevBook));
                console.log(`✅ 自动补充了 ${newCards.length} 张卡牌`);
            }
        } catch (err) {
            console.error('❌ 自动补牌失败:', err);
        }
    }, [token, hand, updateCardBook]);

    // 重新开始游戏
    const restartGame = useCallback(async () => {
        try {
            console.log('🔄 开始重置游戏状态...');
            
            // 清空所有状态
            setHand([]);
            setSelectedIds([]);
            setStagedPositions({});
            setTurn(1);
            setResources(INITIAL_RESOURCES);
            setForgeLoading(false);
            setForgePanelOpen(false);
            setAiDialogueOpen(false);
            setOverlayState({ visible: false, status: 'idle', text: '', position: pickOverlayPosition() });
            setProfessionPanelOpen(false);
            setContractPanelOpen(false);
            setInventoryOpen(false);
            setCardBookOpen(false);
            setContract(null);
            setActiveEvent(null);
            
            // 如果有token，从服务器重新初始化
            if (token && serverSyncEnabled) {
                // 清空服务器手牌
                await gameStateApi.saveHand(token, []);
                console.log('✅ 服务器手牌已清空');
                
                // 重新抽牌
                const drawn = await gameStateApi.drawCards(token, MAX_HAND_SIZE);
                const newCards = drawn?.hand ?? [];
                setHand(newCards);
                console.log(`✅ 已抽取 ${newCards.length} 张新手牌`);
                
                pushMessage?.('🔄 游戏已重新开始！', 'success');
            } else {
                pushMessage?.('🔄 游戏已重新开始！', 'success');
            }
        } catch (err) {
            console.error('❌ 重新开始失败:', err);
            pushMessage?.('重新开始失败，请刷新页面重试', 'error');
        }
    }, [token, serverSyncEnabled, pushMessage]);

    return {
        loading,
        resources,
        turn,
        hand,
        selectedIds,
        selectedCards,
        clearSelection,
        drawCards,
        fillHandToMax,
        stageCard,
        updateStagedPosition,
        unstageCard,
        forgePanelOpen,
        aiDialogueOpen,
        forgeName,
        setForgeName,
        forgeLoading,
        forgeMessage,
        openForgePanel,
        closeForgePanel,
        closeAiDialogue,
        submitForge,
        overlayState,
        professionState,
        professionPanelOpen,
        openProfessionPanel,
        closeProfessionPanel,
        chooseProfession,
        regenerateProfessions,
        toggleCarryOver,
        contract,
        contractPanelOpen,
        openContractPanel,
        closeContractPanel,
        chooseContractChoice,
        endTurn,
        showInventory,
        closeInventory,
        inventoryOpen,
        inventory,
        showCardBook,
        closeCardBook,
        cardBookOpen,
        cardBook,
        aiIdeaCards,
        stagedPositions,
        selectCardsForForge,
        activeEvent,
        era,
        completeEvent,
        spawnKeyCard,
        saveHandToServer,
        clearHandFromServer,
        restartGame,
    };
}

