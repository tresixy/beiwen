import { useEffect, useRef } from 'react';

export function EscMenu({ isOpen, onClose, onBackToLobby, volume, onVolumeChange }) {
    const menuRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };

        // 延迟添加监听器，避免立即触发
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="esc-menu-overlay">
            <div ref={menuRef} className="esc-menu">
                <div className="esc-menu-header">
                    <h3>⚙️ 菜单</h3>
                    <button 
                        type="button" 
                        className="esc-menu-close"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div className="esc-menu-content">
                    <div className="esc-menu-item">
                        <label>🔊 音量</label>
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={volume}
                            onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                            className="esc-menu-slider"
                        />
                        <span className="esc-menu-value">{volume}%</span>
                    </div>

                    <button 
                        type="button" 
                        className="esc-menu-btn"
                        onClick={onBackToLobby}
                    >
                        🏠 返回主页
                    </button>
                </div>
            </div>
        </div>
    );
}

