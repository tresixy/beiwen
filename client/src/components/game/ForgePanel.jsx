import { FORGE_LOADING_MESSAGES } from '../../data/cards.js';

const EmptyState = () => (
    <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '16px 0' }}>
        请选择至少两张卡牌后开启熔炉。
    </div>
);

export function ForgePanel({
    open,
    selectedCards,
    forgeName,
    onChangeName,
    onSubmit,
    onClose,
    loading,
    currentMessage,
}) {
    if (!open) {
        return null;
    }

    const disabled = loading || selectedCards.length < 2;

    return (
        <section className="glass-panel forge-panel">
            <div className="panel-header">
                <h3>思想熔炉</h3>
                <button type="button" onClick={onClose} disabled={loading}>
                    关闭
                </button>
            </div>
            <div className="card-grid" style={{ marginBottom: '12px' }}>
                {selectedCards.length === 0 ? (
                    <EmptyState />
                ) : (
                    selectedCards.map((card) => (
                        <div key={card.id} className="card">
                            <div>
                                <div className="card-name">{card.name}</div>
                                <div className="card-type">{card.type}</div>
                            </div>
                            <div className={`card-rarity ${card.rarity}`}>{card.rarity}</div>
                        </div>
                    ))
                )}
            </div>
            <input
                type="text"
                value={forgeName}
                placeholder="为新卡牌命名"
                onChange={(event) => onChangeName(event.target.value)}
                disabled={loading}
            />
            <button type="button" className="primary" onClick={onSubmit} disabled={disabled}>
                {loading ? '合成中…' : '开始合成'}
            </button>
            {loading ? (
                <div className="forge-loading">
                    <div className="animation" />
                    <div className="forge-loading-message">{currentMessage || FORGE_LOADING_MESSAGES[0]}</div>
                </div>
            ) : null}
        </section>
    );
}





