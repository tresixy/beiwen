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
            <button type="button" onClick={onBackLobby}>
                返回大厅
            </button>
        </div>
    );
}

