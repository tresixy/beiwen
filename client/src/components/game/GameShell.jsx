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
import { PendingCardsArea } from './PendingCardsArea.jsx';

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
        pendingCards,
        claimCardToHand,
        selectedIds,
        selectedCards,
        drawCards,
        stageCard,
        updateStagedPosition,
        unstageCard,
        removeCardFromHand,
        addCardToHand,
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
            // 从手牌中移除该卡牌
            removeCardFromHand(cardId);
        }
    }, [removeCardFromHand]);

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

    const handleReturnCardToHand = useCallback((card) => {
        addCardToHand(card);
    }, [addCardToHand]);

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
                            onReturnCardToHand={handleReturnCardToHand}
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

            <PendingCardsArea cards={pendingCards} />
            
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
                onClaimCard={claimCardToHand}
            />

            <InventoryPanel open={inventoryOpen} cardBook={cardBook} onClose={closeInventory} />
            <CardBookPanel open={cardBookOpen} cardBook={cardBook} onClose={closeCardBook} />
            {showJoystick ? <Joystick /> : null}
            
            {guideOpen && (
                <div className="guide-overlay" onClick={() => setGuideOpen(false)}>
                    <div className="guide-panel" onClick={(e) => e.stopPropagation()}>
                        <h2>《Oops, Civilization!》创世新手指南</h2>
                        <div className="guide-content">
                            <section>
                                <h3>👋 嘿，新来的！</h3>
                                <p>对，就是你。别看了，你已经被选中（或者说，抓来凑数）负责一个文明的烂摊子了。</p>
                                <p>你的工作目标听起来很高大上：<strong>推动文明发展</strong>。</p>
                                <p>但相信我，过程基本就是一连串的 <strong>"Oops!"</strong></p>
                            </section>
                            
                            <section>
                                <h3>📋 你的KPI：解决"又双叒叕"出现的麻烦</h3>
                                <p>别被"文明"这个词骗了。你的日常工作更像是客服。</p>
                                <p>屏幕中间那张大卡片就是最新的客诉——<strong>【困境】</strong>。</p>
                                <p>仔细看看上面的抱怨，那是你的文明在告诉你："大佬，又出事了，快管管！"</p>
                            </section>
                            
                            <section>
                                <h3>🔧 创世三步走（"我寻思"工作法）</h3>
                                <p><strong>第一步："我寻思这俩能凑一块儿..."</strong></p>
                                <p>• 手里的小卡牌叫<span style={{color: '#ddd'}}>【灵感卡】</span>，是你随手抓来的原始材料</p>
                                <p>• 比如【人】、【水】、【石头】什么的，别想太多，就当是手边的垃圾分类</p>
                                
                                <p><strong>第二步："走你！"</strong></p>
                                <p>• 把你觉得能行的两张卡牌，一股脑儿扔进屏幕下方的<strong>"思想熔炉"</strong></p>
                                <p>• 它更像个搅拌机，希望能把你的奇葩想法变成能用的东西</p>
                                <p>• <strong>A + B = ？？？</strong> 结果总是充满惊喜（吓）</p>
                                
                                <p><strong>第三步："成了！" / "废了..."</strong></p>
                                <p>• <strong>运气好</strong>，你会合成出金光闪闪的<span style={{color: '#ff6b6b'}}>【钥匙卡】</span>！</p>
                                <p>• 比如【火】或者【农业】，这就是解决麻烦的万能钥匙！赶紧把它甩到【困境】卡上！</p>
                                <p>• <strong>运气不好</strong>，你会合成出一堆没用的中间产物，甚至是黑漆漆的<span style={{color: '#666'}}>【负面卡】</span></p>
                                <p>• 比如【战争】、【污染】……恭喜你，成功创造了新的麻烦！这就是 <strong>"Oops!"</strong> 的精髓所在</p>
                            </section>
                            
                            <section>
                                <h3>🎴 你的工具箱里都有啥？</h3>
                                <p><span style={{color: '#ddd'}}>⚪ 灵感卡</span> - 免费的、原始的、没啥大用的素材。是你一切"作死"的开始</p>
                                <p>⚙️ <strong>中间产物卡</strong> - 你脑洞大开后的产物，有好有坏。大部分时候，它们是你通往成功的垫脚石……或者是绊脚石</p>
                                <p><span style={{color: '#666'}}>💀 负面卡</span> - <strong>"Oops!"时刻的实体化</strong>。当你把【人】和【冲突】合成了【战争】时，别慌。这不代表失败，只代表你的文明走上了一条比较"野"的路子</p>
                                <p><span style={{color: '#ff6b6b'}}>🔑 钥匙卡</span> - 你的"免死金牌"和"绩效证明"。它们是真正能解决问题的发明。合成出来就赶紧用掉，不然指不定你的文明又会出什么幺蛾子</p>
                            </section>
                            
                            <section>
                                <h3>💡 创世小贴士</h3>
                                <p>✅ <strong>大胆搞砸！</strong> 别怕犯错，反正犯错才是常态。合成失败卡牌会弹回来，合成出负面卡……就当是给你的文明增加点挑战</p>
                                <p>✅ <strong>直面你的"Oops!"</strong> 当你合成出【内卷】、【网络喷子】或者【过度包装】时，接受它。这就是你亲手创造的文明，哭着也要带下去</p>
                                <p>✅ <strong>文明的十字路口</strong>：在未来，你会遇到重大的<strong>"分野时代"</strong>。你的文明是该抬头仰望星空，开启<strong>"星辰时代"</strong>？还是向内探索心灵，进入<strong>"奇点时代"</strong>？这个"Oops"会决定你最终的结局！</p>
                                <p>✅ <strong>欣赏你的杰作（和烂摊子）</strong>：别忘了时不时看看背景里的世界沙盘。那里记录了你所有的丰功伟绩和……嗯，和那些有趣的意外</p>
                            </section>
                            
                            <section style={{textAlign: 'center', fontStyle: 'italic', marginTop: '20px', color: '#8b6f47'}}>
                                <p><strong>好了，新手指南结束！</strong></p>
                                <p>现在，去吧！去创造，去发现，去犯一些史诗级的错误！</p>
                                <p>祝你的文明……好运！🎲</p>
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

