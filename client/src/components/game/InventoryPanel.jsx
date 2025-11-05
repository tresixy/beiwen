import { useState, useMemo } from 'react';
import { CardSvg } from './CardSvg.jsx';

const CARDS_PER_PAGE = 6; // 2行3列

export function InventoryPanel({ open, cardBook, onClose }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [pageType, setPageType] = useState('items'); // 'items' 或 'keys'

    // 区分钥匙卡和普通卡牌
    const filteredCards = useMemo(() => {
        const allCards = Array.isArray(cardBook?.cards) ? cardBook.cards : [];
        if (pageType === 'keys') {
            return allCards.filter(card => {
                const cardType = card.card_type || card.type;
                return cardType === 'key';
            });
        } else {
            return allCards.filter(card => {
                const cardType = card.card_type || card.type;
                return cardType !== 'key';
            });
        }
    }, [cardBook, pageType]);

    const totalPages = Math.max(1, Math.ceil(filteredCards.length / CARDS_PER_PAGE));
    const startIdx = currentPage * CARDS_PER_PAGE;
    const endIdx = startIdx + CARDS_PER_PAGE;
    const currentCards = filteredCards.slice(startIdx, endIdx);

    if (!open) {
        return null;
    }

    const handlePrevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages - 1) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handleSwitchToKeys = () => {
        setPageType('keys');
        setCurrentPage(0);
    };

    const handleSwitchToItems = () => {
        setPageType('items');
        setCurrentPage(0);
    };

    const backgroundClass = pageType === 'keys' ? 'inventory-page-keys' : 'inventory-page-items';

    return (
        <div className="inventory-overlay" onClick={onClose}>
            <div className="inventory-container" onClick={(e) => e.stopPropagation()}>
                {/* 左侧切换按钮 */}
                <div className="inventory-page-toggle">
                    <button
                        type="button"
                        className={`inventory-toggle-btn inventory-toggle-up ${pageType === 'items' ? 'active' : ''}`}
                        onClick={handleSwitchToItems}
                        title="普通卡"
                    >
                        普通卡
                    </button>
                    <button
                        type="button"
                        className={`inventory-toggle-btn inventory-toggle-down ${pageType === 'keys' ? 'active' : ''}`}
                        onClick={handleSwitchToKeys}
                        title="关键钥匙卡"
                    >
                        关键钥匙卡
                    </button>
                </div>

                {/* 主背包页面 */}
                <div className={`inventory-page ${backgroundClass}`}>
                    {/* 关闭按钮 */}
                    <button type="button" className="inventory-close-btn" onClick={onClose}>
                        <img src="/assets/UI/退出.webp" alt="关闭" />
                    </button>

                    {/* 卡牌网格 - 2行3列 */}
                    <div className="inventory-card-grid">
                        {currentCards.length === 0 ? (
                            <div className="inventory-empty-msg">
                                {pageType === 'keys' ? '暂无钥匙卡' : '暂无收集的卡牌'}
                            </div>
                        ) : (
                            currentCards.map((card, idx) => (
                                <div key={card.id || `${card.name}-${idx}`} className="inventory-card-slot">
                                    <CardSvg 
                                        card={card} 
                                        className="inventory-card-svg"
                                    />
                                </div>
                            ))
                        )}
                    </div>

                    {/* 左侧翻页按钮 */}
                    <button
                        type="button"
                        className="inventory-page-btn inventory-page-prev"
                        onClick={handlePrevPage}
                        disabled={currentPage === 0}
                    >
                        <img src="/assets/UI/左箭头.webp" alt="上一页" />
                    </button>

                    {/* 右侧翻页按钮 */}
                    <button
                        type="button"
                        className="inventory-page-btn inventory-page-next"
                        onClick={handleNextPage}
                        disabled={currentPage >= totalPages - 1}
                    >
                        <img src="/assets/UI/右箭头.webp" alt="下一页" />
                    </button>
                </div>
            </div>
        </div>
    );
}






