import { useMemo } from 'react';
import { CardSvg } from './CardSvg.jsx';
import './KeyCardRevealModal.css';

// 所有官方 key card 名称列表
const OFFICIAL_KEY_CARDS = [
    '火', '农业', '律法', '文字', '货币', '城防',
    '道路', '商业', '宗教', '史诗', '圣典', '教权',
    '印刷术', '艺术', '远洋航行', '官僚体系', '蒸汽机', '电力',
    '科学方法', '启蒙思想', '人权宣言', '计算机', '脑机接口', '全球协作',
    '可持续发展', '曲率引擎', '太空电梯', '冯诺依曼探针', '集体意识同步', '数字永生', '创世纪数据库'
];

export function KeyCardRevealModal({ show, keyCard, onNext }) {
    if (!show || !keyCard) return null;
    
    // 检测并提取官方 key card 名称
    const officialKeyCard = useMemo(() => {
        const cardName = keyCard.name || '';
        
        // 检查是否包含某个官方 key card 名称
        for (const officialName of OFFICIAL_KEY_CARDS) {
            if (cardName.includes(officialName) || cardName === officialName) {
                // 构造标准的 key card 对象
                return {
                    id: keyCard.id,
                    name: officialName, // 使用官方名称
                    type: 'key',
                    card_type: 'key',
                    rarity: 'ruby',
                    attrs: keyCard.attrs || {}
                };
            }
        }
        
        // 如果没有匹配到，返回原始卡牌
        return keyCard;
    }, [keyCard]);
    
    return (
        <div className="keycard-reveal-overlay">
            <div className="keycard-reveal-container">
                <div className="keycard-reveal-glow"></div>
                
                <div className="keycard-reveal-card">
                    <CardSvg 
                        card={officialKeyCard} 
                        className="keycard-reveal-image"
                    />
                </div>
                
                <div className="keycard-reveal-info">
                    <h2 className="keycard-reveal-title">🔑 获得钥匙卡！</h2>
                    <p className="keycard-reveal-name">{officialKeyCard.name}</p>
                    {officialKeyCard.attrs?.description && (
                        <p className="keycard-reveal-description">{officialKeyCard.attrs.description}</p>
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

