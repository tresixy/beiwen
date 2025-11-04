import { CardSvg } from './CardSvg.jsx';
import './KeyCardRevealModal.css';

export function KeyCardRevealModal({ show, keyCard, onNext }) {
    if (!show || !keyCard) return null;
    
    return (
        <div className="keycard-reveal-overlay">
            <div className="keycard-reveal-container">
                <div className="keycard-reveal-glow"></div>
                
                <div className="keycard-reveal-card">
                    <CardSvg 
                        card={keyCard} 
                        className="keycard-reveal-image"
                    />
                </div>
                
                <div className="keycard-reveal-info">
                    <h2 className="keycard-reveal-title">🔑 获得钥匙卡！</h2>
                    <p className="keycard-reveal-name">{keyCard.name}</p>
                    {keyCard.attrs?.description && (
                        <p className="keycard-reveal-description">{keyCard.attrs.description}</p>
                    )}
                </div>
                
                <button 
                    className="keycard-reveal-next-btn" 
                    onClick={onNext}
                >
                    下一步
                </button>
            </div>
        </div>
    );
}

