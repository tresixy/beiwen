import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FORGE_LOADING_MESSAGES, createCard, createInitialHand, forgeCards } from '../data/cards.js';
import { createContract } from '../data/contracts.js';
import { createProfessionState, generateProfessionChoices } from '../data/professions.js';
import { createInitialInventory, forgeResultToInventoryItem } from '../data/inventory.js';
import { createInitialCardBook, addCardToBook, loadCardBook, persistCardBook } from '../data/cardBook.js';
import * as gameStateApi from '../services/gameStateApi.js';

const INITIAL_RESOURCES = {
    food: 8,
    production: 6,
    research: 4,
};

const MAX_HAND_SIZE = 5;
const SAVE_HAND_DEBOUNCE_MS = 3000;
const MAX_STAGE_CARDS = 2;

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
    const [hand, setHand] = useState(() => createInitialHand(MAX_HAND_SIZE));
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

    const ensureHandSize = useCallback((cards) => {
        if (cards.length >= MAX_HAND_SIZE) {
            return cards.slice(0, MAX_HAND_SIZE);
        }
        const missing = MAX_HAND_SIZE - cards.length;
        if (missing <= 0) {
            return cards.slice(0, MAX_HAND_SIZE);
        }
        const newCards = Array.from({ length: missing }, () => createCard());
        updateCardBook((prev) => newCards.reduce((book, card) => addCardToBook(book, card), prev));
        pushMessage?.(`抽取了 ${missing} 张新的构想。`, 'info');
        return [...cards, ...newCards];
    }, [pushMessage, updateCardBook]);

    const drawCards = useCallback((count = 1) => {
        setHand((prev) => {
            if (prev.length >= MAX_HAND_SIZE) {
                pushMessage?.('手牌已满，无需抽牌。', 'info');
                return prev;
            }
            const slots = Math.min(count, MAX_HAND_SIZE - prev.length);
            if (slots <= 0) {
                return prev;
            }
            const newCards = Array.from({ length: slots }, () => createCard());
            updateCardBook((prevBook) => newCards.reduce((book, card) => addCardToBook(book, card), prevBook));
            pushMessage?.(`抽取了 ${slots} 张新的构想。`, 'info');
            return [...prev, ...newCards];
        });
    }, [pushMessage, updateCardBook]);

    const stageCard = useCallback((cardId, position) => {
        let removedId = null;
        let shouldOpenDialogue = false;
        
        setSelectedIds((prev) => {
            if (prev.includes(cardId)) {
                return prev;
            }
            const accumulated = [...prev, cardId];
            if (accumulated.length > MAX_STAGE_CARDS) {
                removedId = accumulated.shift();
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

    const finishForge = useCallback((resultCard, finalMessage) => {
        setHand((prev) => {
            const remaining = prev.filter((card) => !selectedIds.includes(card.id));
            const combined = [...remaining, resultCard];
            return ensureHandSize(combined);
        });
        setInventory((prev) => [...prev, forgeResultToInventoryItem(resultCard)]);
        updateCardBook((prev) => addCardToBook(prev, resultCard));
        clearSelection();
        setForgeLoading(false);
        setForgePanelOpen(false);
        setForgeName('');
        setOverlayState((prev) => ({
            ...prev,
            status: 'done',
            text: finalMessage,
        }));
        overlayTimeoutRef.current = window.setTimeout(() => {
            setOverlayState((prev) => ({ ...prev, visible: false }));
        }, 900);
    }, [clearSelection, ensureHandSize, selectedIds]);

    const submitForge = useCallback(async (name, aiIdea = null) => {
        if (selectedCards.length < 2) {
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

        try {
            // 尝试调用AI合成API
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const cardNames = selectedCards.map(card => card.name);
                    const response = await fetch('/api/synthesize', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            inputs: cardNames,
                            name: trimmedName,
                            mode: 'ai',
                        }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const resultCard = {
                            id: `card-${Date.now()}`,
                            name: data.item?.name || trimmedName,
                            type: data.item?.attrs?.type || '合成物',
                            rarity: data.item?.tier ? ['common', 'uncommon', 'rare', 'epic', 'legendary'][Math.min(data.item.tier - 1, 4)] : 'common',
                        };
                        finishForge(resultCard, '融合完成');
                        pushMessage?.(`获得新卡牌「${resultCard.name}」`, 'success');
                        stopForgeTimers();
                        return;
                    }
                } catch (apiErr) {
                    console.warn('API合成失败，使用本地合成:', apiErr);
                }
            }

            // 降级到本地合成
            forgeTimeoutRef.current = window.setTimeout(() => {
                try {
                    const resultCard = forgeCards(selectedCards, trimmedName);
                    finishForge(resultCard, '合成完成');
                    pushMessage?.(`获得新卡牌「${resultCard.name}」`, 'success');
                } catch (err) {
                    pushMessage?.(err?.message || '合成失败', 'error');
                    setForgeLoading(false);
                    setOverlayState((prev) => ({ ...prev, visible: false }));
                } finally {
                    stopForgeTimers();
                }
            }, 4200);
        } catch (err) {
            pushMessage?.(err?.message || '合成失败', 'error');
            setForgeLoading(false);
            setOverlayState((prev) => ({ ...prev, visible: false }));
            stopForgeTimers();
        }
    }, [finishForge, forgeName, pushMessage, selectedCards, stopForgeTimers]);

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

    const chooseProfession = useCallback((index) => {
        setProfessionState((prev) => {
            const choice = prev.pendingChoices?.[index];
            if (!choice) {
                return prev;
            }
            pushMessage?.(`已转职：${choice.name}`, 'success');
            return {
                ...prev,
                active: choice,
                pendingChoices: [],
            };
        });
        setProfessionPanelOpen(false);
    }, [pushMessage]);

    const regenerateProfessions = useCallback(() => {
        setProfessionState((prev) => ({
            ...prev,
            pendingChoices: generateProfessionChoices(),
        }));
        pushMessage?.('已刷新新的一批职业灵感。', 'info');
    }, [pushMessage]);

    const toggleCarryOver = useCallback((carryOver) => {
        setProfessionState((prev) => ({ ...prev, carryOver }));
        pushMessage?.(`下一局沿用职业：${carryOver ? '是' : '否'}`, 'info');
    }, [pushMessage]);

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
    };
}

