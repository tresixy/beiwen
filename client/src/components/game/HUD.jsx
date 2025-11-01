const RESOURCE_LIST = [
    { key: 'food', icon: '🍖', label: '食粮' },
    { key: 'production', icon: '⚙️', label: '生产' },
    { key: 'research', icon: '🔬', label: '研究' },
];

export function HUD({
    resources,
    pulses,
    turn,
    user,
    onShowGuide,
}) {
    return (
        <header className="hud">
            <div className="resources">
                {RESOURCE_LIST.map(({ key, icon }) => (
                    <div key={key} className={`resource-chip${pulses[key] ? ' bump' : ''}`}>
                        <span className="icon" aria-label={key}>
                            {icon}
                        </span>
                        <span className="value">{resources[key]}</span>
                    </div>
                ))}
            </div>
            <div className="turn-info">回合 {turn}</div>
            <div className="hud-user">
                <span>{user?.username ?? '旅者'}</span>
            </div>
            <button 
                type="button" 
                className="hud-guide-btn"
                onClick={onShowGuide}
                title="游玩指南"
            >
                ❓
            </button>
        </header>
    );
}




