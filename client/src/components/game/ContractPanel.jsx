const RESOURCE_ICON = {
    food: '🍖',
    production: '⚙️',
    research: '🔬',
};

const formatEffects = (effects) =>
    Object.entries(effects)
        .filter(([, value]) => value !== 0)
        .map(([key, value]) => {
            const sign = value >= 0 ? '+' : '';
            return `${RESOURCE_ICON[key] ?? ''} ${sign}${value}`;
        })
        .join(' / ');

export function ContractPanel({ open, contract, onChoose, onClose }) {
    if (!open || !contract) {
        return null;
    }

    return (
        <section className="glass-panel contract-panel">
            <div className="panel-header">
                <h3>{contract.name}</h3>
                <button type="button" onClick={onClose}>
                    关闭
                </button>
            </div>
            <p>{contract.description}</p>
            <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
                {contract.choices.map((choice) => (
                    <div key={choice.id} className="contract-choice" onClick={() => onChoose(choice.id)}>
                        <h4>{choice.text}</h4>
                        <p style={{ color: '#4ecdc4', marginTop: '8px' }}>效果：{formatEffects(choice.effects)}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}





