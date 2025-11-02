import { useEffect, useState } from 'react';

export function EraUpgradeNotification({ era, onClose }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 300);
        }, 3000);
        
        return () => clearTimeout(timer);
    }, [onClose]);

    if (!visible) return null;

    return (
        <div className="era-upgrade-notification">
            <div className="era-upgrade-content">
                <div className="era-upgrade-text">
                    <div className="era-name">{era}</div>
                </div>
            </div>
        </div>
    );
}


