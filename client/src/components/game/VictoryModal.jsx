import './VictoryModal.css';

export function VictoryModal({ show, onClose, eventName, reward, cardsAdded = [], cardName, isFullVictory, onBackToLobby }) {
    // 如果有 onBackToLobby 回调，说明是合成触发的胜利结算
    const isGameVictory = !!onBackToLobby;
    
    if (!show) return null;
    
    const handleBackToLobby = () => {
        if (isGameVictory && onBackToLobby) {
            // 合成胜利：返回主页
            onBackToLobby();
        } else {
            // 普通胜利弹窗：继续游戏
            onClose?.();
        }
    };
    
    if (isGameVictory) {
        // 合成触发的胜利结算页 - 全屏显示图片
        return (
            <div className="victory-settlement-fullscreen">
                <img 
                    src="/assets/UI/胜利结算页.webp" 
                    alt="胜利结算" 
                    className="victory-settlement-bg"
                />
                <button 
                    className="victory-back-to-lobby-btn" 
                    onClick={handleBackToLobby}
                >
                    返回主页
                </button>
            </div>
        );
    }
    
    // 原有的胜利弹窗
    return (
        <div className="victory-modal-overlay" onClick={onClose}>
            <div className="victory-modal" onClick={(e) => e.stopPropagation()}>
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
                    
                    <button className="victory-close-btn" onClick={onClose}>
                        继续游戏
                    </button>
                </div>
            </div>
        </div>
    );
}

