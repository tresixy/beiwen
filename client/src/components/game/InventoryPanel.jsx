const rarityColor = {
    common: 'rgba(207, 210, 216, 0.9)',
    uncommon: 'rgba(144, 238, 198, 0.9)',
    rare: 'rgba(129, 200, 255, 0.9)',
    epic: 'rgba(207, 170, 255, 0.9)',
    legendary: 'rgba(255, 204, 128, 0.9)',
};

export function InventoryPanel({ open, items, onClose }) {
    if (!open) {
        return null;
    }

    return (
        <div className="inventory-overlay">
            <div className="inventory-panel glass-panel">
                <div className="panel-header">
                    <h3>背包</h3>
                    <button type="button" onClick={onClose}>
                        关闭
                    </button>
                </div>
                <div className="inventory-grid">
                    {items.length === 0 ? (
                        <div className="inventory-empty">你的背包还很轻盈，尝试去熔炉中创造些什么吧。</div>
                    ) : (
                        items.map((item) => (
                            <div key={item.id} className="inventory-card">
                                <div className="inventory-icon" aria-hidden>{item.icon || '📦'}</div>
                                <div className="inventory-info">
                                    <div className="inventory-name">{item.name}</div>
                                    <div
                                        className="inventory-rarity"
                                        style={{ backgroundColor: rarityColor[item.rarity] || rarityColor.common }}
                                    >
                                        {item.rarity}
                                    </div>
                                    <div className="inventory-qty">数量：{item.quantity}</div>
                                    <div className="inventory-desc">{item.description}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}




