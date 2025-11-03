import { useState, useMemo, useEffect } from 'react';

const CARDS_PER_PAGE = 9;

const rarityColor = {
    common: 'rgba(207, 210, 216, 0.9)',
    ruby: 'rgba(220, 20, 60, 0.9)',
    uncommon: 'rgba(144, 238, 198, 0.9)',
    rare: 'rgba(129, 200, 255, 0.9)',
    epic: 'rgba(207, 170, 255, 0.9)',
    legendary: 'rgba(255, 204, 128, 0.9)',
};

export function CardBookPanel({ open, cardBook, onClose }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [filterRarity, setFilterRarity] = useState('all');

    // ESC键退出
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    const cards = Array.isArray(cardBook?.cards) ? cardBook.cards : [];
    const totalCollected = cardBook?.totalCollected ?? 0;

    const filteredCards = useMemo(() => {
        if (filterRarity === 'all') {
            return cards;
        }
        return cards.filter(card => card.rarity === filterRarity);
    }, [cards, filterRarity]);

    const totalPages = Math.ceil(filteredCards.length / CARDS_PER_PAGE);
    const startIdx = currentPage * CARDS_PER_PAGE;
    const endIdx = startIdx + CARDS_PER_PAGE;
    const currentCards = filteredCards.slice(startIdx, endIdx);

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

    const handleFilterChange = (rarity) => {
        setFilterRarity(rarity);
        setCurrentPage(0);
    };

    if (!open) {
        return null;
    }

    return (
        <div className="card-book-overlay">
            <div className="card-book">
                <div className="book-spine-left"></div>
                <div className="book-spine-right"></div>
                
                <div className="book-page book-page-left">
                    <div className="book-header">
                        <h3>卡牌图鉴</h3>
                        <button type="button" className="book-close-btn" onClick={onClose}>
                            ✕
                        </button>
                    </div>
                    
                    <div className="book-stats">
                        <div className="book-stat">
                            <span className="stat-label">收藏种类</span>
                            <span className="stat-value">{cards.length}</span>
                        </div>
                        <div className="book-stat">
                            <span className="stat-label">总获得数</span>
                            <span className="stat-value">{totalCollected}</span>
                        </div>
                    </div>

                    <div className="book-filters">
                        <button 
                            className={`filter-btn ${filterRarity === 'all' ? 'active' : ''}`}
                            onClick={() => handleFilterChange('all')}
                        >
                            全部
                        </button>
                        <button 
                            className={`filter-btn ${filterRarity === 'legendary' ? 'active' : ''}`}
                            onClick={() => handleFilterChange('legendary')}
                            style={{ color: '#ffcc80' }}
                        >
                            传说
                        </button>
                        <button 
                            className={`filter-btn ${filterRarity === 'epic' ? 'active' : ''}`}
                            onClick={() => handleFilterChange('epic')}
                            style={{ color: '#cfaaff' }}
                        >
                            史诗
                        </button>
                        <button 
                            className={`filter-btn ${filterRarity === 'rare' ? 'active' : ''}`}
                            onClick={() => handleFilterChange('rare')}
                            style={{ color: '#81c8ff' }}
                        >
                            稀有
                        </button>
                        <button 
                            className={`filter-btn ${filterRarity === 'uncommon' ? 'active' : ''}`}
                            onClick={() => handleFilterChange('uncommon')}
                            style={{ color: '#90eec6' }}
                        >
                            罕见
                        </button>
                        <button 
                            className={`filter-btn ${filterRarity === 'common' ? 'active' : ''}`}
                            onClick={() => handleFilterChange('common')}
                            style={{ color: '#cfd2d8' }}
                        >
                            普通
                        </button>
                    </div>
                </div>

                <div className="book-page book-page-right">
                    <div className="book-card-grid">
                        {currentCards.length === 0 ? (
                            <div className="book-empty">
                                {filterRarity === 'all' 
                                    ? '你的图鉴空空如也，快去收集卡牌吧！'
                                    : `暂无${filterRarity}品质卡牌`}
                            </div>
                        ) : (
                            currentCards.map((card) => (
                                <div 
                                    key={`${card.name}-${card.type}-${card.rarity}`} 
                                    className="book-card"
                                    style={{
                                        backgroundColor: card.image_url ? 'transparent' : (rarityColor[card.rarity] || rarityColor.common)
                                    }}
                                >
                                    {card.image_url && (
                                        <img 
                                            src={card.image_url} 
                                            alt={card.name}
                                            className="book-card-image"
                                        />
                                    )}
                                    <div className="book-card-content">
                                        <div className="book-card-name">{card.name}</div>
                                        <div className="book-card-rarity">{card.rarity}</div>
                                        <div className="book-card-type">{card.type}</div>
                                        <div className="book-card-count">×{card.count}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="book-pagination">
                        <button 
                            type="button" 
                            className="page-btn"
                            onClick={handlePrevPage}
                            disabled={currentPage === 0}
                        >
                            ‹ 上页
                        </button>
                        <span className="page-info">
                            {totalPages > 0 ? `${currentPage + 1} / ${totalPages}` : '0 / 0'}
                        </span>
                        <button 
                            type="button" 
                            className="page-btn"
                            onClick={handleNextPage}
                            disabled={currentPage >= totalPages - 1 || totalPages === 0}
                        >
                            下页 ›
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

