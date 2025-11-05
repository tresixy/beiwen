import { useEffect, useRef, useState } from 'react';

export function EscMenu({ isOpen, onClose, onBackToLobby, onSaveAndExit, onRestart, volume, onVolumeChange }) {
    const menuRef = useRef(null);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [showRestartDialog, setShowRestartDialog] = useState(false);

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

    const handleRestartClick = () => {
        setShowRestartDialog(true);
    };

    const handleConfirmRestart = () => {
        setShowRestartDialog(false);
        onRestart?.();
        onClose();
    };

    const handleCancelRestart = () => {
        setShowRestartDialog(false);
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
                        <img src="/assets/UI/退出.webp" alt="关闭" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </button>
                </div>

                {!showSaveDialog && !showRestartDialog ? (
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
                            className="esc-menu-btn restart-btn"
                            onClick={handleRestartClick}
                        >
                            🔄 重新开始
                        </button>

                        <button 
                            type="button" 
                            className="esc-menu-btn"
                            onClick={handleBackToLobbyClick}
                            title="退出到菜单"
                        >
                            退出到菜单
                        </button>
                    </div>
                ) : showSaveDialog ? (
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
                ) : (
                    <div className="esc-menu-content">
                        <div className="save-dialog">
                            <h4>🔄 确认重新开始？</h4>
                            <p className="save-dialog-hint">
                                重新开始将会：<br/>
                                • 清空当前手牌<br/>
                                • 重置资源和回合数<br/>
                                • 重新抽取起始手牌<br/>
                                • 保持在当前困境<br/>
                                <br/>
                                <strong>此操作不可撤销！</strong>
                            </p>
                            <div className="save-dialog-buttons">
                                <button 
                                    type="button" 
                                    className="esc-menu-btn danger-btn"
                                    onClick={handleConfirmRestart}
                                >
                                    ✓ 确认重新开始
                                </button>
                                <button 
                                    type="button" 
                                    className="esc-menu-btn cancel-btn"
                                    onClick={handleCancelRestart}
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

