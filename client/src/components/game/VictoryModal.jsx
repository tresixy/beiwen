import './VictoryModal.css';

export function VictoryModal({ show, onClose, eventName, reward, cardsAdded = [], cardName, isFullVictory, onBackToLobby }) {
    // 如果有 onBackToLobby 回调，说明是合成触发的胜利结算
    const isGameVictory = !!onBackToLobby;
    
    if (!show) return null;
    
    const handleClick = () => {
        if (isGameVictory && onBackToLobby) {
            // 合成胜利：返回主页
            onBackToLobby();
        } else {
            // 普通胜利弹窗：继续游戏
            onClose?.();
        }
    };
    
    return (
        <div className="victory-modal-overlay" onClick={handleClick}>
            <div className="victory-modal" onClick={handleClick}>
                {isGameVictory ? (
                    // 合成触发的胜利结算页
                    <>
                        <img 
                            src="/assets/UI/胜利结算页.webp" 
                            alt="胜利结算" 
                            className="victory-settlement-image"
                        />
                        <div className="victory-settlement-info">
                            <h2 className="victory-settlement-title">
                                {isFullVictory ? '🎉 完美通关！' : '✨ 阶段胜利！'}
                            </h2>
                            {eventName && (
                                <p className="victory-settlement-event">{eventName}</p>
                            )}
                            {cardName && (
                                <p className="victory-settlement-card">合成了：{cardName}</p>
                            )}
                            <p className="victory-settlement-hint">点击任意位置返回主页</p>
                        </div>
                    </>
                ) : (
                    // 原有的胜利弹窗
                    <>
                        <div className="victory-image-container">
                            <img 
                                src="/assets/UI/结算胜利.webp" 
                                alt="胜利" 
                                className="victory-image"
                            />
                        </div>
                        
                        <div className="victory-content">
                            <h2 className="victory-title">🎉 挑战成功！</h2>
                            
                            {eventName && (
                                <p className="victory-event">完成了 {eventName}</p>
                            )}
                            
                            {reward && (
                                <p className="victory-reward">获得奖励：{reward}</p>
                            )}
                            
                            {cardsAdded && cardsAdded.length > 0 && (
                                <div className="victory-cards">
                                    <p className="victory-cards-title">已加入背包的卡牌：</p>
                                    <ul className="victory-cards-list">
                                        {cardsAdded.map((card, idx) => (
                                            <li key={idx} className="victory-card-item">
                                                {card.name || card}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            <button className="victory-close-btn" onClick={(e) => { e.stopPropagation(); onClose?.(); }}>
                                继续游戏
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

