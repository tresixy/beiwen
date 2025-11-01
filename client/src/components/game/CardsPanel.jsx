export function CardsPanel({ cards, selectedIds, onToggle, onDraw }) {
    return (
        <section className="glass-panel">
            <div className="panel-header">
                <h3>手牌</h3>
                <button type="button" onClick={onDraw}>
                    抽牌
                </button>
            </div>
            <div className="card-grid">
                {cards.map((card) => {
                    const selected = selectedIds.includes(card.id);
                    return (
                        <div
                            key={card.id}
                            className={`card${selected ? ' selected' : ''}`}
                            onClick={() => onToggle(card.id)}
                        >
                            <div>
                                <div className="card-name">{card.name}</div>
                                <div className="card-type">{card.type}</div>
                            </div>
                            <div className={`card-rarity ${card.rarity}`}>{card.rarity}</div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

