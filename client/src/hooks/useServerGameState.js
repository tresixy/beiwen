import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    getGameState,
    saveHand,
    saveContract,
    clearContract as clearContractApi,
    endTurn as endTurnApi,
    drawCards as drawCardsApi,
    chooseProfession as chooseProfessionApi,
    chooseContract as chooseContractApi,
} from '../services/gameStateApi.js';
import { EventBus } from '../game/EventBus.js';

const MAX_HAND_SIZE = 7;
const SAVE_DEBOUNCE_MS = 2000;

// 创建空手牌
function createEmptyHand(size) {
    return Array.from({ length: size }, (_, i) => ({
        id: `card-${Date.now()}-${i}`,
        name: '空位',
        type: 'empty',
        rarity: 'common',
        tier: 0,
    }));
}

export function useServerGameState({ token, pushMessage }) {
    const [loading, setLoading] = useState(true);
    const [resources, setResources] = useState({ food: 0, production: 0, research: 0 });
    const [turn, setTurn] = useState(1);
    const [hand, setHand] = useState(() => createEmptyHand(MAX_HAND_SIZE));
    const [inventory, setInventory] = useState({ slots: [] });
    const [profession, setProfession] = useState({ active: null, pendingChoices: [] });
    const [contract, setContract] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [stagedPositions, setStagedPositions] = useState({});
    
    const saveTimeoutRef = useRef(null);

    // 加载游戏状态
    const loadGameState = useCallback(async () => {
        if (!token) return;

        try {
            setLoading(true);
            const state = await getGameState(token);

            setResources(state.resources || { food: 0, production: 0, research: 0 });
            setTurn(state.resources?.turn || 1);
            setInventory(state.inventory || { slots: [] });
            setProfession(state.profession || { active: null, pendingChoices: [] });
            setContract(state.contract || null);

            // 加载手牌，如果为空则抽牌
            if (state.hand && state.hand.length > 0) {
                setHand(state.hand);
            } else {
                const drawn = await drawCardsApi(token, MAX_HAND_SIZE);
                setHand(drawn.hand || createEmptyHand(MAX_HAND_SIZE));
            }

            pushMessage('游戏数据已加载', 'success');
        } catch (err) {
            console.error('加载游戏状态失败:', err);
            pushMessage('加载游戏数据失败: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [token, pushMessage]);

    // 初始加载
    useEffect(() => {
        loadGameState();
    }, [loadGameState]);

    // 防抖保存手牌
    const debouncedSaveHand = useCallback((handToSave) => {
        if (!token) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await saveHand(token, handToSave);
            } catch (err) {
                console.error('保存手牌失败:', err);
            }
        }, SAVE_DEBOUNCE_MS);
    }, [token]);

    // 手牌变化时保存
    useEffect(() => {
        if (!loading && hand.length > 0) {
            debouncedSaveHand(hand);
        }
    }, [hand, loading, debouncedSaveHand]);

    // 结束回合
    const endTurn = useCallback(async () => {
        if (!token) return;

        try {
            const result = await endTurnApi(token);

            setResources({
                food: result.production?.food || resources.food,
                production: result.production?.production || resources.production,
                research: result.production?.research || resources.research,
            });
            setTurn(result.turn);

            if (result.contract) {
                setContract(result.contract);
                await saveContract(token, result.contract);
            }

            if (result.professionChoices && result.professionChoices.length > 0) {
                setProfession((prev) => ({
                    ...prev,
                    pendingChoices: result.professionChoices,
                }));
            }

            pushMessage(`回合 ${result.turn} 开始`, 'info');
            EventBus.emit('turn:end', result);

            return result;
        } catch (err) {
            console.error('结束回合失败:', err);
            pushMessage('结束回合失败: ' + err.message, 'error');
            throw err;
        }
    }, [token, resources, pushMessage]);

    // 选择职业
    const chooseProfession = useCallback(async (professionId) => {
        if (!token) return;

        try {
            await chooseProfessionApi(token, professionId);
            
            // 重新加载职业状态
            const state = await getGameState(token);
            setProfession(state.profession || { active: null, pendingChoices: [] });

            pushMessage('职业已选择', 'success');
        } catch (err) {
            console.error('选择职业失败:', err);
            pushMessage('选择职业失败: ' + err.message, 'error');
        }
    }, [token, pushMessage]);

    // 选择契约
    const chooseContract = useCallback(async (accepted) => {
        if (!token || !contract) return;

        try {
            await chooseContractApi(token, { contractId: contract.id, accepted });

            if (accepted) {
                pushMessage('契约已接受', 'success');
            } else {
                pushMessage('契约已拒绝', 'info');
            }

            setContract(null);
            await clearContractApi(token);
        } catch (err) {
            console.error('选择契约失败:', err);
            pushMessage('操作失败: ' + err.message, 'error');
        }
    }, [token, contract, pushMessage]);

    // 抽牌
    const drawCards = useCallback(async (count = 1) => {
        if (!token) return;

        try {
            const result = await drawCardsApi(token, count);
            const newCards = result.hand || [];

            setHand((prevHand) => {
                const updated = [...prevHand];
                let insertIndex = 0;

                for (const card of newCards) {
                    // 找到第一个空位
                    while (insertIndex < updated.length && updated[insertIndex].type !== 'empty') {
                        insertIndex++;
                    }

                    if (insertIndex < updated.length) {
                        updated[insertIndex] = card;
                        insertIndex++;
                    }
                }

                return updated;
            });

            pushMessage(`抽取了 ${newCards.length} 张卡牌`, 'success');
            return newCards;
        } catch (err) {
            console.error('抽牌失败:', err);
            pushMessage('抽牌失败: ' + err.message, 'error');
        }
    }, [token, pushMessage]);

    // 清除选择
    const clearSelection = useCallback(() => {
        setSelectedIds([]);
        setStagedPositions({});
    }, []);

    // 选中的卡牌
    const selectedCards = useMemo(
        () => hand.filter((card) => selectedIds.includes(card.id) && card.type !== 'empty'),
        [hand, selectedIds]
    );

    return {
        loading,
        resources,
        turn,
        hand,
        inventory,
        profession,
        contract,
        selectedIds,
        selectedCards,
        stagedPositions,
        setHand,
        setSelectedIds,
        setStagedPositions,
        clearSelection,
        endTurn,
        chooseProfession,
        chooseContract,
        drawCards,
        reloadState: loadGameState,
    };
}

