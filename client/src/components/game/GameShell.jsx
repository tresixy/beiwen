import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EventBus } from '../../game/EventBus.js';
import { PhaserGame } from '../../PhaserGame.jsx';
import { useGameSimulation } from '../../hooks/useGameSimulation.js';
import { ContractPanel } from './ContractPanel.jsx';
import { ForgeOverlay } from './ForgeOverlay.jsx';
import { ForgePanel } from './ForgePanel.jsx';
import { HUD } from './HUD.jsx';
import { InventoryPanel } from './InventoryPanel.jsx';
import { Joystick } from './Joystick.jsx';
import { ProfessionPanel } from './ProfessionPanel.jsx';
import { CardDock } from './CardDock.jsx';
import { ForgeCanvas } from './ForgeCanvas.jsx';
import { CardBookPanel } from './CardBookPanel.jsx';
import { EscMenu } from './EscMenu.jsx';
import audioService from '../../services/audioService.js';
import { VictoryModal } from './VictoryModal.jsx';

const detectMobile = () => {
    if (typeof navigator === 'undefined') {
        return false;
    }
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export function GameShell({ user, token, onLogout, onBackLobby, pushMessage }) {
    const [victoryModalData, setVictoryModalData] = useState(null);
    
    const {
        loading,
        resources,
        turn,
        hand,
        selectedIds,
        selectedCards,
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
        forgeResultCard,
        clearForgeResult,
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
        fillHandToMax,
        restartGame,
    } = useGameSimulation({ pushMessage, token });

    const [resourcePulse, setResourcePulse] = useState({ food: false, production: false, research: false });
    const [loadingProgress, setLoadingProgress] = useState(0);
    const pulseTimeoutsRef = useRef([]);
    const prevResourcesRef = useRef(resources);
    const [showJoystick, setShowJoystick] = useState(detectMobile());
    const [escMenuOpen, setEscMenuOpen] = useState(false);
    const [volume, setVolume] = useState(70);
    const [guideOpen, setGuideOpen] = useState(false);

    // 初始化音效系统
    useEffect(() => {
        audioService.init({
            sounds: {
                // 点击音效（多个变体，随机播放）
                clickVariants: [
                    '/assets/music/SE/点击卡牌.wav',
                    '/assets/music/SE/点击卡牌 (2).wav',
                    '/assets/music/SE/点击卡牌 (3).wav',
                    '/assets/music/SE/点击卡牌 (4).wav',
                ],
                // 合成音效（多个变体）
                synthesisVariants: [
                    '/assets/music/SE/中间合成物1.wav',
                    '/assets/music/SE/中间合成物2.wav',
                ],
                // 钥匙卡合成音效
                keySynthesis: '/assets/music/SE/钥匙卡合成音效.wav',
                // 事件完成音效
                eventComplete: '/assets/music/SE/解决困境.wav',
                // 时代切换音效
                eraTransition: '/assets/music/SE/进入下一个时代.wav',
                // 进入游戏音效
                enterGame: '/assets/music/SE/进入游戏.wav',
            },
            bgm: {
                '生存时代': '/assets/music/bgm/生存时代.mp3',
                '城邦时代': '/assets/music/bgm/城邦时代.mp3',
                '分野时代': '/assets/music/bgm/后期的时代.mp3',
                '帝国时代': '/assets/music/bgm/后期的时代.mp3',
                '理性时代': '/assets/music/bgm/后期的时代.mp3',
                '信仰时代': '/assets/music/bgm/后期的时代.mp3',
                '启蒙时代': '/assets/music/bgm/后期的时代.mp3',
                '全球时代': '/assets/music/bgm/后期的时代.mp3',
                '第二次分野时代': '/assets/music/bgm/后期的时代.mp3',
                '星辰时代': '/assets/music/bgm/后期的时代.mp3',
                '奇点时代': '/assets/music/bgm/后期的时代.mp3',
            }
        });
        
        // 设置初始音量
        audioService.setVolume(volume / 100);
        
        // 播放进入游戏音效
        audioService.playEnterGame();
        
        // 根据当前时代播放BGM
        if (era) {
            audioService.switchBGM(era);
        }
        
        return () => {
            // 清理：停止背景音乐
            audioService.stopBGM();
        };
    }, []);

    // 音量变化时更新音效系统
    useEffect(() => {
        audioService.setVolume(volume / 100);
    }, [volume]);

    // 时代变化时切换BGM
    useEffect(() => {
        if (era) {
            audioService.switchBGM(era);
        }
    }, [era]);

    useEffect(() => {
        if (!loading) {
            setLoadingProgress(100);
            return;
        }

        setLoadingProgress(0);
        const interval = window.setInterval(() => {
            setLoadingProgress((prev) => {
                if (prev >= 96) {
                    return prev;
                }
                const increment = 4 + Math.random() * 6;
                return Math.min(prev + increment, 96);
            });
        }, 180);

        return () => window.clearInterval(interval);
    }, [loading]);
    
    // 提供全局函数用于显示胜利界面
    useEffect(() => {
        window.showVictoryModal = (data) => {
            setVictoryModalData(data);
        };
        
        return () => {
            delete window.showVictoryModal;
        };
    }, []);

    useEffect(() => {
        pulseTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
        pulseTimeoutsRef.current = [];

        const updates = {};
        Object.keys(resources).forEach((key) => {
            const previous = prevResourcesRef.current[key];
            if (previous !== resources[key]) {
                updates[key] = true;
                const timeout = window.setTimeout(() => {
                    setResourcePulse((prev) => ({ ...prev, [key]: false }));
                }, 350);
                pulseTimeoutsRef.current.push(timeout);
            }
        });

        if (Object.keys(updates).length > 0) {
            setResourcePulse((prev) => ({ ...prev, ...updates }));
        }

        prevResourcesRef.current = resources;

        return () => {
            pulseTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
            pulseTimeoutsRef.current = [];
        };
    }, [resources]);

    useEffect(() => {
        if (overlayState.visible) {
            EventBus.emit('forge:flash', { status: overlayState.status });
        }
    }, [overlayState]);

    useEffect(() => {
        const controller = new AbortController();
        if (!showJoystick && detectMobile()) {
            setShowJoystick(true);
        }

        return () => controller.abort();
    }, [showJoystick]);

    // ESC键监听
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setEscMenuOpen((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleDrawCards = useCallback(() => {
        drawCards(3);
    }, [drawCards]);

    const handleOpenForge = useCallback(() => {
        openForgePanel();
    }, [openForgePanel]);

    const handleCardDrop = useCallback((cardId, position) => {
        stageCard(cardId, position);
    }, [stageCard]);

    // 处理从手牌直接拖到合成区域
    const forgeCanvasRef = useRef(null);
    const handleCardToFurnace = useCallback((cardId) => {
        if (forgeCanvasRef.current?.addCardToFurnace) {
            forgeCanvasRef.current.addCardToFurnace(cardId);
        }
    }, []);

    const handleSaveAndExit = useCallback(async (shouldSave) => {
        setEscMenuOpen(false);
        
        if (shouldSave) {
            // 保存手牌
            await saveHandToServer();
            pushMessage?.('游戏已保存', 'success');
        } else {
            // 清空手牌
            await clearHandFromServer();
            pushMessage?.('已退出，下次将重新开始', 'info');
        }
        
        // 延迟返回大厅，让用户看到提示
        setTimeout(() => {
            onBackLobby?.();
        }, 800);
    }, [saveHandToServer, clearHandFromServer, onBackLobby, pushMessage]);

    const handleRestart = useCallback(async () => {
        await restartGame();
    }, [restartGame]);

    const handleCardRemove = useCallback((cardId) => {
        unstageCard(cardId);
    }, [unstageCard]);

    const handleCardReposition = useCallback((cardId, position) => {
        updateStagedPosition(cardId, position);
    }, [updateStagedPosition]);

    const handleSynthesize = useCallback((cardsToForge) => {
        // 如果传入卡牌参数，使用传入的；否则使用 selectedCards
        const cards = cardsToForge || selectedCards;
        console.log('handleSynthesize 被调用, cards:', cards.length, cards.map(c => c?.name));
        if (cards.length >= 2) {
            // 使用简单占位符，让AI决定真正的名字
            const placeholderName = '合成物';
            console.log('开始合成:', cards.map(c => c.name).join(' + '));
            submitForge(placeholderName, cards);
        } else {
            console.log('卡牌数量不足，需要至少2张，当前:', cards.length);
        }
    }, [selectedCards, submitForge]);

    const overlayMemo = useMemo(() => overlayState, [overlayState]);

    if (loading) {
        const progressDisplay = Math.min(100, Math.round(loadingProgress));
        return (
            <div className="game-shell game-shell--loading">
                <div className="loading-panel">
                    <div className="loading-title">正在加载游戏数据...</div>
                    <div className="loading-subtitle">从云端同步您的游戏进度</div>
                    <div className="loading-bar">
                        <div className="loading-bar__track">
                            <div
                                className="loading-bar__fill"
                                style={{ clipPath: `inset(0 ${100 - progressDisplay}% 0 0)` }}
                            />
                        </div>
                        <div className="loading-bar__label">{progressDisplay}%</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="game-shell">
            <div className="game-screen">
                <HUD
                    resources={resources}
                    pulses={resourcePulse}
                    turn={turn}
                    user={user}
                    activeEvent={activeEvent}
                    era={era}
                    onCompleteEvent={completeEvent}
                    onShowGuide={() => setGuideOpen(true)}
                    onSpawnKeyCard={spawnKeyCard}
                />

                <EscMenu
                    isOpen={escMenuOpen}
                    onClose={() => setEscMenuOpen(false)}
                    onSaveAndExit={handleSaveAndExit}
                    onRestart={handleRestart}
                    volume={volume}
                    onVolumeChange={setVolume}
                />

                <div className="game-stage">
                    <PhaserGame />
                    <div className="board-container">
                        <ForgeOverlay overlay={overlayMemo} />
                        <ForgeCanvas
                            ref={forgeCanvasRef}
                            cards={selectedCards}
                            hand={hand}
                            positions={stagedPositions}
                            ideaCards={aiIdeaCards}
                            forgeLoading={forgeLoading}
                            forgeResultCard={forgeResultCard}
                            onSelectForForge={selectCardsForForge}
                            onDrop={handleCardDrop}
                            onRemove={handleCardRemove}
                            onReposition={handleCardReposition}
                            onSynthesize={handleSynthesize}
                            onSpawnKeyCard={spawnKeyCard}
                            onClearForgeResult={clearForgeResult}
                        />
                        <img
                            className="ui-strip ui-strip--top"
                            src="/assets/UI/局内上条.webp"
                            alt="顶部装饰条"
                        />
                        <img
                            className="ui-strip ui-strip--bottom"
                            src="/assets/UI/局内下条.webp"
                            alt="底部装饰条"
                        />
                    </div>
                </div>

                <aside className="sidebar" style={{ display: 'none' }}>
                    <ForgePanel
                        open={forgePanelOpen}
                        selectedCards={selectedCards}
                        forgeName={forgeName}
                        onChangeName={setForgeName}
                        onSubmit={submitForge}
                        onClose={closeForgePanel}
                        loading={forgeLoading}
                        currentMessage={forgeMessage}
                    />
                    <ProfessionPanel
                        open={professionPanelOpen}
                        choices={professionState.pendingChoices || []}
                        onSelect={chooseProfession}
                        onRegenerate={regenerateProfessions}
                        onClose={closeProfessionPanel}
                        onAbandon={closeProfessionPanel}
                    />
                    <ContractPanel
                        open={contractPanelOpen}
                        contract={contract}
                        onChoose={chooseContractChoice}
                        onClose={closeContractPanel}
                    />
                </aside>
            </div>

            <CardDock 
                cards={hand} 
                stagedIds={selectedIds} 
                onDraw={handleDrawCards}
                onOpenForge={handleOpenForge}
                onOpenContract={openContractPanel}
                onEndTurn={endTurn}
                onShowInventory={showInventory}
                onShowCardBook={showCardBook}
                onBackLobby={onBackLobby}
                onDropToFurnace={handleCardToFurnace}
            />

            <InventoryPanel open={inventoryOpen} cardBook={cardBook} onClose={closeInventory} />
            <CardBookPanel open={cardBookOpen} cardBook={cardBook} onClose={closeCardBook} />
            {showJoystick ? <Joystick /> : null}
            
            {guideOpen && (
                <div className="guide-overlay" onClick={() => setGuideOpen(false)}>
                    <div className="guide-panel" onClick={(e) => e.stopPropagation()}>
                        <h2>🎮 游玩指南</h2>
                        <div className="guide-content">
                            <section>
                                <h3>🎯 游戏目标</h3>
                                <p>• 解决每个时代的挑战事件（Events）</p>
                                <p>• 通过合成卡牌推动文明发展</p>
                                <p>• 从生存时代逐步进化到启蒙时代及以后</p>
                            </section>
                            
                            <section>
                                <h3>🃏 卡牌系统</h3>
                                <p><span style={{color: '#ddd'}}>⚪ 灵感卡（白色）</span> - 基础材料，通过抽牌获得</p>
                                <p><span style={{color: '#ff6b6b'}}>🔴 钥匙卡（红色）</span> - 合成灵感卡获得，用于解决Events</p>
                                <p><span style={{color: '#4ecdc4'}}>🔵 生成卡（蓝色）</span> - AI创意合成的自定义卡牌</p>
                            </section>
                            
                            <section>
                                <h3>⚗️ 合成玩法</h3>
                                <p>• 点击"抽牌"获取灵感卡到手牌区</p>
                                <p>• 选择2张或更多手牌，点击"合成"</p>
                                <p>• <strong>固定配方</strong>：例如"木头+石头=火"</p>
                                <p>• <strong>AI创意</strong>：输入名称让AI合成新物品</p>
                                <p>• 合成成功后卡牌加入卡册供后续使用</p>
                            </section>
                            
                            <section>
                                <h3>🌟 Events挑战</h3>
                                <p>• 每局游戏从当前时代随机选择挑战</p>
                                <p>• 将对应的<strong>钥匙卡</strong>拖到顶部Events区域</p>
                                <p>• 例：【寒冷】需要【火】卡，【饥饿】需要【农业】卡</p>
                                <p>• 完成所有时代Events后升级到下一时代</p>
                            </section>
                            
                            <section>
                                <h3>🎯 资源管理</h3>
                                <p>🍖 <strong>食粮</strong> - 用于维持人口生存和军队补给</p>
                                <p>⚙️ <strong>生产</strong> - 用于建造建筑和生产工业品</p>
                                <p>🔬 <strong>研究</strong> - 用于解锁科技和推动文明进步</p>
                                <p>• 每回合自动产出资源（基础+建筑加成）</p>
                            </section>
                            
                            <section>
                                <h3>🔄 回合流程</h3>
                                <p><strong>1. 抽牌阶段</strong> - 点击"抽牌"补充灵感卡</p>
                                <p><strong>2. 合成阶段</strong> - 选择卡牌进行合成</p>
                                <p><strong>3. 解决Events</strong> - 拖动钥匙卡解决挑战</p>
                                <p><strong>4. 结束回合</strong> - 资源结算，触发事件</p>
                            </section>
                            
                            <section>
                                <h3>👤 职业系统</h3>
                                <p>• 每3回合选择一个职业（三选一）</p>
                                <p>• 职业提供特殊加成和能力</p>
                                <p>• 例：光谱演算师增加研究产出</p>
                                <p>• 可选择下一局是否沿用职业</p>
                            </section>
                            
                            <section>
                                <h3>📜 契约系统</h3>
                                <p>• 每10回合出现一次社会契约</p>
                                <p>• 选择不同路线影响资源发展</p>
                                <p>• 例：集体主义、技术革新、资源分配</p>
                                <p>• 根据当前策略做出抉择</p>
                            </section>
                            
                            <section>
                                <h3>💡 进阶技巧</h3>
                                <p>• 优先合成当前时代的钥匙卡</p>
                                <p>• 查看卡册了解已解锁的卡牌</p>
                                <p>• 合理规划资源用于抽牌和合成</p>
                                <p>• 利用AI创意合成探索新组合</p>
                                <p>• 关注时代限制，不同时代可合成不同等级</p>
                            </section>
                        </div>
                        <button className="guide-close-btn" onClick={() => setGuideOpen(false)}>
                            知道了
                        </button>
                    </div>
                </div>
            )}
            
            <VictoryModal
                show={!!victoryModalData}
                eventName={victoryModalData?.eventName}
                reward={victoryModalData?.reward}
                cardsAdded={victoryModalData?.cardsAdded}
                cardName={victoryModalData?.cardName}
                isFullVictory={victoryModalData?.isFullVictory}
                onBackToLobby={victoryModalData?.onBackToLobby}
                onClose={() => setVictoryModalData(null)}
            />
        </div>
    );
}

