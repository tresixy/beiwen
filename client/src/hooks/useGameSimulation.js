import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FORGE_LOADING_MESSAGES, createCard, createInitialHand, forgeCards } from '../data/cards.js';
import { createContract } from '../data/contracts.js';
import { createProfessionState, generateProfessionChoices } from '../data/professions.js';
import { createInitialInventory, forgeResultToInventoryItem } from '../data/inventory.js';
import { createInitialCardBook, addCardToBook, loadCardBook, persistCardBook } from '../data/cardBook.js';
import * as gameStateApi from '../services/gameStateApi.js';
import * as eventsApi from '../api/eventsApi.js';

const INITIAL_RESOURCES = {
    food: 8,
    production: 6,
    research: 4,
};

const MAX_HAND_SIZE = 5;
const SAVE_HAND_DEBOUNCE_MS = 3000;
const MAX_STAGE_CARDS = 2;
const TEST_FORGE_RESULT_NAME = '合成中间物';
const TEST_DISABLE_SERVER_SYNTH = true;

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
        () => hand.filter((card) => selectedIds.includes(card.id)),
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
            const newCards = drawn.hand || [];
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
            const newCards = drawn.hand || [];
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
        let removedId = null;
        let shouldOpenDialogue = false;
        
        setSelectedIds((prev) => {
            console.log('🎯 当前 selectedIds:', prev);
            if (prev.includes(cardId)) {
                console.log('🎯 卡牌已在 selectedIds 中，不重复添加');
                return prev;
            }
            const accumulated = [...prev, cardId];
            console.log('🎯 添加后 selectedIds:', accumulated);
            if (accumulated.length > MAX_STAGE_CARDS) {
                removedId = accumulated.shift();
                console.log('🎯 超过最大数量，移除:', removedId);
            }
            // 当达到2张卡牌时，自动触发AI对话
            if (accumulated.length === MAX_STAGE_CARDS) {
                shouldOpenDialogue = true;
            }
            return accumulated;
        });
        setStagedPositions((prev) => {
            const updated = { ...prev };
            if (removedId) {
                delete updated[removedId];
            }
            updated[cardId] = position ?? updated[cardId] ?? { x: 50, y: 50 };
            return updated;
        });
        
        // 延迟打开AI对话面板，确保状态已更新
        if (shouldOpenDialogue) {
            setTimeout(() => {
                setAiDialogueOpen(true);
            }, 100);
        }
    }, []);

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

    const finishForge = useCallback(async (resultCard) => {
        // 立即清除选择状态，从场上移除旧卡牌
        const forgedCardIds = [...selectedIds];
        clearSelection();
        
        // 将新卡牌放到手牌中，并设置初始位置为画布中间
        const remaining = hand.filter((card) => !forgedCardIds.includes(card.id));
        const combined = [...remaining, resultCard];
        const newHand = await ensureHandSize(combined);
        setHand(newHand);
        
        // 设置新卡牌在画布中间的位置
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
        
        pushMessage?.(`获得新卡牌「${resultCard.name}」`, 'success');
    }, [clearSelection, ensureHandSize, hand, selectedIds, updateCardBook, pushMessage]);

    const scheduleLocalForge = useCallback((cards, trimmedName) => {
        forgeTimeoutRef.current = window.setTimeout(async () => {
            try {
                const resultCard = {
                    ...forgeCards(cards, trimmedName),
                    name: trimmedName || '合成物',
                };
                await finishForge(resultCard);
            } catch (err) {
                pushMessage?.(err?.message || '合成失败', 'error');
                setForgeLoading(false);
                setOverlayState((prev) => ({ ...prev, visible: false }));
            } finally {
                stopForgeTimers();
            }
        }, 2000);
    }, [finishForge, pushMessage, stopForgeTimers]);

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
            scheduleLocalForge(cards, trimmedName);
            return;
        }

        try {
            const localToken = token || localStorage.getItem('token');
            if (localToken && serverSyncEnabled) {
                try {
                    const cardNames = cards.map(card => card.name);
                    const mode = aiIdea ? 'ai' : 'auto';
                    
                    // 调用统一的合成API
                    const data = await gameStateApi.synthesize(localToken, cardNames, trimmedName, mode, false);
                    
                    // 使用实际返回的物品名称
                    const actualName = data.item?.name || trimmedName || '合成物';
                    const resultCard = {
                        id: `card-${Date.now()}`,
                        name: actualName,
                        type: data.item?.attrs?.type || '合成物',
                        rarity: data.item?.tier ? ['common', 'uncommon', 'rare', 'epic', 'legendary'][Math.min(data.item.tier - 1, 4)] : 'common',
                        attrs: data.item?.attrs,
                    };
                    
                    await finishForge(resultCard);
                    
                    if (data.aiUsed && data.ideas && data.ideas.length > 0) {
                        pushMessage?.(`AI灵感：${data.ideas[0].results}`, 'info');
                    }
                    
                    stopForgeTimers();
                    return;
                } catch (apiErr) {
                    console.error('API合成失败:', apiErr);
                    pushMessage?.(`服务器合成失败：${apiErr.message || '未知错误'}，使用本地合成`, 'warning');
                }
            }

            // 降级到本地合成
            scheduleLocalForge(cards, trimmedName);
        } catch (err) {
            pushMessage?.(err?.message || '合成失败', 'error');
            setForgeLoading(false);
            setOverlayState((prev) => ({ ...prev, visible: false }));
            stopForgeTimers();
        }
    }, [finishForge, forgeName, pushMessage, scheduleLocalForge, selectedCards, stopForgeTimers, serverSyncEnabled, token]);

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
                        if (drawn.hand && drawn.hand.length > 0) {
                            setHand(drawn.hand);
                            const meaningfulCards = drawn.hand.filter((card) => card && card.type !== 'empty');
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
            
            const result = await eventsApi.completeEvent(token, activeEvent.id, cardName, selectedHex);
            
            if (result.success) {
                pushMessage?.(`🎉 成功完成【${activeEvent.name}】`, 'success');
                
                // 更新时代
                if (result.newEra) {
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

                // 从手牌中移除钥匙卡
                const cardId = hand.find(c => c.name === cardName)?.id;
                if (cardId) {
                    setHand(prev => prev.filter(c => c.id !== cardId));
                    setSelectedIds(prev => prev.filter(id => id !== cardId));
                }
            }
        } catch (err) {
            console.error('完成事件失败:', err);
            pushMessage?.(err.message || '完成事件失败', 'error');
        }
    }, [activeEvent, token, pushMessage, hand]);

    return {
        loading,
        resources,
        turn,
        hand,
        selectedIds,
        selectedCards,
        clearSelection,
        drawCards,
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
        stagedPositions,
        selectCardsForForge,
        activeEvent,
        era,
        completeEvent,
    };
}

