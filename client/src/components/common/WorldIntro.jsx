export function WorldIntro({ onClose }) {
    return (
        <div className="world-intro-overlay" onClick={onClose}>
            <div className="world-intro-panel" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="world-intro-close" onClick={onClose}>
                    ✕
                </button>
            </div>
        </div>
    );
}


