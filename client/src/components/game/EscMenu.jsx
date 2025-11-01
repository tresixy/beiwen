import { useEffect, useRef, useState } from 'react';

export function EscMenu({ isOpen, onClose, onBackToLobby, onSaveAndExit, volume, onVolumeChange }) {
    const menuRef = useRef(null);
    const [showSaveDialog, setShowSaveDialog] = useState(false);

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

    const handleBackToLobbyClick = () => {
        setShowSaveDialog(true);
    };

    const handleSaveAndExit = () => {
        setShowSaveDialog(false);
        onSaveAndExit?.(true); // 保存并退出
    };

    const handleExitWithoutSave = () => {
        setShowSaveDialog(false);
        onSaveAndExit?.(false); // 不保存退出
    };

    const handleCancelExit = () => {
        setShowSaveDialog(false);
    };

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

                {!showSaveDialog ? (
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
                            onClick={handleBackToLobbyClick}
                        >
                            🏠 返回主页
                        </button>
                    </div>
                ) : (
                    <div className="esc-menu-content">
                        <div className="save-dialog">
                            <h4>💾 是否保存游戏进度？</h4>
                            <p className="save-dialog-hint">
                                保存：下次进入时继续当前进度<br/>
                                不保存：下次进入时重新开始
                            </p>
                            <div className="save-dialog-buttons">
                                <button 
                                    type="button" 
                                    className="esc-menu-btn save-btn"
                                    onClick={handleSaveAndExit}
                                >
                                    💾 保存并退出
                                </button>
                                <button 
                                    type="button" 
                                    className="esc-menu-btn danger-btn"
                                    onClick={handleExitWithoutSave}
                                >
                                    🚫 不保存退出
                                </button>
                                <button 
                                    type="button" 
                                    className="esc-menu-btn cancel-btn"
                                    onClick={handleCancelExit}
                                >
                                    ← 取消
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

