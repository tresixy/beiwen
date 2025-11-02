export function EventCrisisPanel({ event, onComplete, onClose }) {
    if (!event) return null;

    return (
        <div className="event-crisis-overlay" onClick={onClose}>
            <div className="event-crisis-panel" onClick={(e) => e.stopPropagation()}>
                <div className="event-crisis-content">
                    <h2 className="event-crisis-title">{event.name}</h2>
                    <p className="event-crisis-description">{event.description}</p>
                    <div className="event-crisis-actions">
                        <button 
                            type="button" 
                            className="crisis-btn"
                            onClick={onComplete}
                        >
                            应对危机
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


