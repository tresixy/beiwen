import { useEffect } from 'react';
import './VictoryModal.css';

export function VictoryModal({ show, onClose, eventName, reward, cardsAdded = [] }) {
    useEffect(() => {
        if (show) {
            // 3秒后自动关闭
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);
    
    if (!show) return null;
    
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

