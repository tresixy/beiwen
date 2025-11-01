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

const detectMobile = () => {
    if (typeof navigator === 'undefined') {
        return false;
    }
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export function GameShell({ user, token, onLogout, onBackLobby, pushMessage }) {
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
    } = useGameSimulation({ pushMessage, token });

    const [resourcePulse, setResourcePulse] = useState({ food: false, production: false, research: false });
    const [loadingProgress, setLoadingProgress] = useState(0);
    const pulseTimeoutsRef = useRef([]);
    const prevResourcesRef = useRef(resources);
    const [showJoystick, setShowJoystick] = useState(detectMobile());
    const [escMenuOpen, setEscMenuOpen] = useState(false);
    const [volume, setVolume] = useState(70);
    const [guideOpen, setGuideOpen] = useState(false);

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

    const handleCardRemove = useCallback((cardId) => {
        unstageCard(cardId);
    }, [unstageCard]);

    const handleCardReposition = useCallback((cardId, position) => {
        updateStagedPosition(cardId, position);
    }, [updateStagedPosition]);

    const handleSynthesize = useCallback(() => {
        if (selectedCards.length >= 2) {
            const defaultName = selectedCards.map(c => c.name).join('+');
            submitForge(defaultName);
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
                                style={{ width: `${progressDisplay}%` }}
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
                    onShowGuide={() => setGuideOpen(true)}
                />

                <EscMenu
                    isOpen={escMenuOpen}
                    onClose={() => setEscMenuOpen(false)}
                    onBackToLobby={onBackLobby}
                    volume={volume}
                    onVolumeChange={setVolume}
                />

                <div className="game-stage">
                    <PhaserGame />
                    <div className="board-container">
                        <ForgeOverlay overlay={overlayMemo} />
                        <ForgeCanvas
                            cards={selectedCards}
                            positions={stagedPositions}
                            onDrop={handleCardDrop}
                            onRemove={handleCardRemove}
                            onReposition={handleCardReposition}
                            onSynthesize={handleSynthesize}
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
            />

            <InventoryPanel open={inventoryOpen} items={inventory} onClose={closeInventory} />
            <CardBookPanel open={cardBookOpen} cardBook={cardBook} onClose={closeCardBook} />
            {showJoystick ? <Joystick /> : null}
            
            {guideOpen && (
                <div className="guide-overlay" onClick={() => setGuideOpen(false)}>
                    <div className="guide-panel" onClick={(e) => e.stopPropagation()}>
                        <h2>🎮 游玩指南</h2>
                        <div className="guide-content">
                            <section>
                                <h3>📋 基础玩法</h3>
                                <p>• 从手牌区拖动卡牌到地图上</p>
                                <p>• 将卡牌重叠在一起开始合成</p>
                                <p>• 合成成功后获得新卡牌和资源</p>
                            </section>
                            <section>
                                <h3>🃏 卡牌系统</h3>
                                <p>• 每回合可以抽取新卡牌</p>
                                <p>• 卡牌有不同的稀有度和类型</p>
                                <p>• 收集更多卡牌解锁新的合成配方</p>
                            </section>
                            <section>
                                <h3>🎯 资源管理</h3>
                                <p>🍖 <strong>食粮</strong> - 用于抽卡和基础操作</p>
                                <p>⚙️ <strong>生产</strong> - 用于高级合成</p>
                                <p>🔬 <strong>研究</strong> - 用于解锁新内容</p>
                            </section>
                            <section>
                                <h3>💡 进阶技巧</h3>
                                <p>• 合理安排卡牌位置，可同时放置多张</p>
                                <p>• 优先合成稀有度高的组合</p>
                                <p>• 关注契约任务获得额外奖励</p>
                            </section>
                        </div>
                        <button className="guide-close-btn" onClick={() => setGuideOpen(false)}>
                            知道了
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

