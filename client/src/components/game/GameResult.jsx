export function GameResult({ result, score, era, onRestart, onBackToLobby }) {
    const isVictory = result === 'victory';

    return (
        <div className="game-result-overlay">
            <div className={`game-result-panel ${isVictory ? 'victory' : 'defeat'}`}>
                <div className="result-info">
                    <div className="result-score">
                        <span className="score-label">最终得分</span>
                        <span className="score-value">{score}</span>
                    </div>
                    <div className="result-era">
                        <span className="era-label">抵达时代</span>
                        <span className="era-value">{era}</span>
                    </div>
                </div>
                <div className="result-actions">
                    <button 
                        type="button" 
                        className="result-btn restart-btn"
                        onClick={onRestart}
                    >
                        🔄 再来一局
                    </button>
                    <button 
                        type="button" 
                        className="result-btn lobby-btn lobby-btn-img"
                        onClick={onBackToLobby}
                        title="返回主页"
                    >
                        <img src="/assets/UI/退出.webp" alt="返回主页" />
                    </button>
                </div>
            </div>
        </div>
    );
}


