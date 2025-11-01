import { useState, useEffect, useCallback } from 'react';
import '../../styles/playerArchivesPanel.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export function PlayerArchivesPanel({ token, onClose, onBack }) {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [playerDetail, setPlayerDetail] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());

    const loadPlayers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(
                `${API_BASE}/player-archives/list?page=${page}&limit=20&search=${encodeURIComponent(search)}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '加载失败');
            }
            
            const data = await response.json();
            setPlayers(data.players);
            setTotalPages(data.pagination.totalPages);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token, page, search]);

    useEffect(() => {
        loadPlayers();
    }, [loadPlayers]);

    const loadPlayerDetail = async (userId) => {
        try {
            const response = await fetch(
                `${API_BASE}/player-archives/${userId}/detail`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '加载详情失败');
            }
            
            const data = await response.json();
            setPlayerDetail(data);
            setSelectedPlayer(userId);
        } catch (err) {
            alert(`加载详情失败: ${err.message}`);
        }
    };

    const deletePlayer = async (userId) => {
        const player = players.find(p => p.id === userId);
        if (!confirm(`确定要删除玩家 ${player?.username} 的所有存档数据吗？此操作不可恢复！`)) {
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE}/player-archives/${userId}`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '删除失败');
            }
            
            alert('删除成功');
            setSelectedPlayer(null);
            setPlayerDetail(null);
            loadPlayers();
        } catch (err) {
            alert(`删除失败: ${err.message}`);
        }
    };

    const batchDelete = async () => {
        if (selectedIds.size === 0) {
            alert('请先选择要删除的玩家');
            return;
        }

        if (!confirm(`确定要删除选中的 ${selectedIds.size} 个玩家的所有存档数据吗？此操作不可恢复！`)) {
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE}/player-archives/batch-delete`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ userIds: Array.from(selectedIds) }),
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '批量删除失败');
            }
            
            const data = await response.json();
            alert(data.message);
            setSelectedIds(new Set());
            setSelectedPlayer(null);
            setPlayerDetail(null);
            loadPlayers();
        } catch (err) {
            alert(`批量删除失败: ${err.message}`);
        }
    };

    const resetPlayer = async (userId) => {
        const player = players.find(p => p.id === userId);
        if (!confirm(`确定要重置玩家 ${player?.username} 的游戏进度吗？账号将保留，但所有游戏数据将被清空。`)) {
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE}/player-archives/${userId}/reset`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '重置失败');
            }
            
            alert('重置成功');
            loadPlayers();
            if (selectedPlayer === userId) {
                loadPlayerDetail(userId);
            }
        } catch (err) {
            alert(`重置失败: ${err.message}`);
        }
    };

    const toggleSelect = (userId) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(userId)) {
            newSet.delete(userId);
        } else {
            newSet.add(userId);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === players.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(players.map(p => p.id)));
        }
    };

    return (
        <div className="player-archives-panel">
            <div className="panel-header">
                {onBack && <button onClick={onBack} className="back-btn">← 返回</button>}
                <h2>玩家存档管理</h2>
                {onClose && <button onClick={onClose} className="close-btn">×</button>}
            </div>

            <div className="panel-content">
                <div className="players-section">
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="搜索用户名或邮箱..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setPage(1);
                                    loadPlayers();
                                }
                            }}
                        />
                        <button onClick={() => { setPage(1); loadPlayers(); }}>搜索</button>
                    </div>

                    <div className="batch-actions">
                        <label>
                            <input
                                type="checkbox"
                                checked={selectedIds.size === players.length && players.length > 0}
                                onChange={toggleSelectAll}
                            />
                            全选
                        </label>
                        <button 
                            onClick={batchDelete} 
                            disabled={selectedIds.size === 0}
                            className="danger-btn"
                        >
                            批量删除 ({selectedIds.size})
                        </button>
                    </div>

                    {loading && <div className="loading">加载中...</div>}
                    {error && <div className="error">{error}</div>}

                    {!loading && !error && (
                        <>
                            <div className="players-list">
                                {players.map(player => (
                                    <div
                                        key={player.id}
                                        className={`player-item ${selectedPlayer === player.id ? 'active' : ''}`}
                                    >
                                        <label className="player-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(player.id)}
                                                onChange={() => toggleSelect(player.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </label>
                                        <div 
                                            className="player-info"
                                            onClick={() => loadPlayerDetail(player.id)}
                                        >
                                            <div className="player-name">
                                                {player.username}
                                                {player.role === 'admin' && <span className="admin-badge">管理员</span>}
                                            </div>
                                            <div className="player-meta">
                                                {player.email}
                                            </div>
                                            <div className="player-stats">
                                                <span>时代: {player.era}</span>
                                                <span>卡牌: {player.totalCards}</span>
                                                <span>标志: {player.totalMarkers}</span>
                                            </div>
                                            <div className="player-date">
                                                注册: {new Date(player.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pagination">
                                <button 
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    上一页
                                </button>
                                <span>第 {page} / {totalPages} 页</span>
                                <button 
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    下一页
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {playerDetail && (
                    <div className="player-detail-section">
                        <h3>
                            {playerDetail.user.username} 的存档详情
                        </h3>

                        <div className="detail-actions">
                            <button onClick={() => resetPlayer(playerDetail.user.id)} className="warning-btn">
                                重置进度
                            </button>
                            <button onClick={() => deletePlayer(playerDetail.user.id)} className="danger-btn">
                                删除存档
                            </button>
                        </div>

                        <div className="detail-content">
                            <section>
                                <h4>基本信息</h4>
                                <div className="info-grid">
                                    <div><strong>用户名:</strong> {playerDetail.user.username}</div>
                                    <div><strong>邮箱:</strong> {playerDetail.user.email}</div>
                                    <div><strong>角色:</strong> {playerDetail.user.role}</div>
                                    <div><strong>注册时间:</strong> {new Date(playerDetail.user.createdAt).toLocaleString()}</div>
                                </div>
                            </section>

                            <section>
                                <h4>游戏状态</h4>
                                <div className="info-grid">
                                    <div><strong>当前时代:</strong> {playerDetail.gameState.era}</div>
                                    <div><strong>已完成Events:</strong> {playerDetail.gameState.completedEvents.length}</div>
                                    <div><strong>激活Event ID:</strong> {playerDetail.gameState.activeEventId || '无'}</div>
                                    <div><strong>手牌数量:</strong> {playerDetail.gameState.hand.length}</div>
                                    <div><strong>最后游玩:</strong> {playerDetail.gameState.lastPlayed ? new Date(playerDetail.gameState.lastPlayed).toLocaleString() : '从未'}</div>
                                </div>
                            </section>

                            <section>
                                <h4>统计数据</h4>
                                <div className="info-grid">
                                    <div><strong>总卡牌:</strong> {playerDetail.statistics.totalCards}</div>
                                    <div><strong>灵感卡:</strong> {playerDetail.statistics.cardsByType.inspiration}</div>
                                    <div><strong>钥匙卡:</strong> {playerDetail.statistics.cardsByType.key}</div>
                                    <div><strong>奖励卡:</strong> {playerDetail.statistics.cardsByType.reward}</div>
                                    <div><strong>地块标志:</strong> {playerDetail.statistics.totalMarkers}</div>
                                    <div><strong>高亮地块:</strong> {playerDetail.statistics.totalHighlights}</div>
                                </div>
                            </section>

                            <section>
                                <h4>卡牌收藏 ({playerDetail.cards.length})</h4>
                                <div className="cards-list">
                                    {playerDetail.cards.slice(0, 50).map((card, idx) => (
                                        <div key={idx} className="card-item">
                                            <span className={`card-rarity ${card.rarity}`}>{card.name}</span>
                                            <span className="card-count">×{card.count}</span>
                                            <span className="card-type">{card.card_type}</span>
                                        </div>
                                    ))}
                                    {playerDetail.cards.length > 50 && (
                                        <div className="card-more">还有 {playerDetail.cards.length - 50} 张卡牌...</div>
                                    )}
                                </div>
                            </section>

                            <section>
                                <h4>地块标志 ({playerDetail.markers.length})</h4>
                                <div className="markers-list">
                                    {playerDetail.markers.slice(0, 20).map((marker, idx) => (
                                        <div key={idx} className="marker-item">
                                            <span>({marker.q}, {marker.r})</span>
                                            <span className="marker-type">{marker.marker_type}</span>
                                            <span className="marker-event">{marker.event_name}</span>
                                        </div>
                                    ))}
                                    {playerDetail.markers.length > 20 && (
                                        <div className="marker-more">还有 {playerDetail.markers.length - 20} 个标志...</div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

