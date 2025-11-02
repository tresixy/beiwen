export function BottomControls({ onOpenForge, onOpenContract, onEndTurn, onShowInventory, onShowCardBook, onBackLobby }) {
    return (
        <div className="bottom-controls">
            <button type="button" onClick={onOpenForge}>
                合成
            </button>
            <button type="button" onClick={onOpenContract}>
                契约
            </button>
            <button type="button" onClick={onEndTurn}>
                结束回合
            </button>
            <button type="button" onClick={onShowInventory}>
                背包
            </button>
            <button type="button" onClick={onShowCardBook}>
                卡册
            </button>
            <button type="button" onClick={onBackLobby} className="btn-back-lobby" title="返回大厅">
                <img src="/assets/UI/退出.webp" alt="返回大厅" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
            </button>
        </div>
    );
}

