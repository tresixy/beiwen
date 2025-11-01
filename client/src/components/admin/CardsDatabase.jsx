import { useCallback, useEffect, useState } from 'react';
import './CardsDatabase.css';

const API_BASE = '/api/cards-database';

const ERA_OPTIONS = [
  '生存时代',
  '城邦时代',
  '分野时代',
  '帝国时代',
  '理性时代',
  '信仰时代',
  '启蒙时代',
];

const CARD_TYPE_OPTIONS = [
  { value: 'key', label: '钥匙卡' },
  { value: 'inspiration', label: '灵感卡' },
  { value: 'reward', label: '奖励卡' },
];

const RARITY_OPTIONS = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export function CardsDatabase({ token, onBack }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [eraFilter, setEraFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [stats, setStats] = useState({ baseCards: 0, userGeneratedCards: 0 });
  const [editingCard, setEditingCard] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({});

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      if (eraFilter) params.append('era', eraFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (sourceFilter) params.append('source', sourceFilter);

      const response = await fetch(`${API_BASE}?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('获取卡牌列表失败');
      }

      const data = await response.json();
      setCards(data.cards);
      setTotalPages(data.pagination.pages);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, page, eraFilter, typeFilter, sourceFilter]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleCreate = () => {
    setFormData({
      name: '',
      type: 'inspiration',
      rarity: 'common',
      era: '生存时代',
      card_type: 'inspiration',
      unlock_condition: '',
      is_starter: false,
      is_decoy: false,
      attrs_json: { description: '' },
    });
    setShowCreateModal(true);
  };

  const handleEdit = (card) => {
    setFormData({
      ...card,
      attrs_json: card.attrs_json || { description: '' },
    });
    setEditingCard(card);
  };

  const handleDelete = async (cardId, cardName) => {
    if (!confirm(`确定要删除卡牌"${cardName}"吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/${cardId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '删除失败');
      }

      alert('删除成功');
      fetchCards();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editingCard ? `${API_BASE}/${editingCard.id}` : API_BASE;
      const method = editingCard ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '保存失败');
      }

      alert(editingCard ? '更新成功' : '创建成功');
      setEditingCard(null);
      setShowCreateModal(false);
      fetchCards();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancel = () => {
    setEditingCard(null);
    setShowCreateModal(false);
    setFormData({});
  };

  const updateFormField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateAttrsDescription = (description) => {
    setFormData((prev) => ({
      ...prev,
      attrs_json: { ...prev.attrs_json, description },
    }));
  };

  return (
    <div className="cards-database">
      <div className="cards-database-header">
        <h1>卡牌数据库管理</h1>
        <button className="btn-back" onClick={onBack}>
          返回大厅
        </button>
      </div>

      <div className="cards-database-stats">
        <div className="stat-card">
          <span className="stat-label">基础卡牌</span>
          <span className="stat-value">{stats.baseCards}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">用户生成</span>
          <span className="stat-value">{stats.userGeneratedCards}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">总计</span>
          <span className="stat-value">{stats.baseCards + stats.userGeneratedCards}</span>
        </div>
      </div>

      <div className="cards-database-controls">
        <button className="btn-create" onClick={handleCreate}>
          + 创建新卡牌
        </button>

        <div className="filters">
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">全部来源</option>
            <option value="base">基础卡牌</option>
            <option value="user_generated">用户生成</option>
          </select>

          <select
            value={eraFilter}
            onChange={(e) => {
              setEraFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">全部时代</option>
            {ERA_OPTIONS.map((era) => (
              <option key={era} value={era}>
                {era}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">全部类型</option>
            {CARD_TYPE_OPTIONS.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <>
          <div className="cards-table-container">
            <table className="cards-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>名称</th>
                  <th>来源</th>
                  <th>创建者</th>
                  <th>类型</th>
                  <th>稀有度</th>
                  <th>时代</th>
                  <th>卡牌类型</th>
                  <th>解锁条件</th>
                  <th>初始卡</th>
                  <th>迷惑卡</th>
                  <th>描述</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => (
                  <tr key={card.id} className={card.is_base_card ? 'base-card-row' : 'user-card-row'}>
                    <td>{card.id}</td>
                    <td className="card-name">{card.name}</td>
                    <td>
                      <span className={`source-badge ${card.is_base_card ? 'base' : 'user'}`}>
                        {card.is_base_card ? '基础' : '用户'}
                      </span>
                    </td>
                    <td className="creator-name">
                      {card.creator_name || '-'}
                    </td>
                    <td>{card.type}</td>
                    <td>
                      <span className={`rarity rarity-${card.rarity}`}>
                        {card.rarity}
                      </span>
                    </td>
                    <td>{card.era || '-'}</td>
                    <td>
                      {CARD_TYPE_OPTIONS.find((t) => t.value === card.card_type)?.label ||
                        card.card_type}
                    </td>
                    <td>{card.unlock_condition || '-'}</td>
                    <td>{card.is_starter ? '✓' : ''}</td>
                    <td>{card.is_decoy ? '✓' : ''}</td>
                    <td className="card-description">
                      {card.attrs_json?.description || '-'}
                    </td>
                    <td className="actions">
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(card)}
                      >
                        编辑
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(card.id, card.name)}
                        disabled={!card.is_base_card && card.created_by_user_id}
                        title={!card.is_base_card && card.created_by_user_id ? '用户生成卡牌需谨慎删除' : ''}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                上一页
              </button>
              <span>
                第 {page} / {totalPages} 页
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      {(showCreateModal || editingCard) && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingCard ? '编辑卡牌' : '创建新卡牌'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <label>
                  名称 *
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => updateFormField('name', e.target.value)}
                  />
                </label>

                <label>
                  类型 *
                  <input
                    type="text"
                    required
                    value={formData.type || ''}
                    onChange={(e) => updateFormField('type', e.target.value)}
                    placeholder="如: element, material, concept"
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  稀有度 *
                  <select
                    required
                    value={formData.rarity || 'common'}
                    onChange={(e) => updateFormField('rarity', e.target.value)}
                  >
                    {RARITY_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  时代
                  <select
                    value={formData.era || ''}
                    onChange={(e) => updateFormField('era', e.target.value)}
                  >
                    <option value="">无</option>
                    {ERA_OPTIONS.map((era) => (
                      <option key={era} value={era}>
                        {era}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  卡牌类型
                  <select
                    value={formData.card_type || 'inspiration'}
                    onChange={(e) =>
                      updateFormField('card_type', e.target.value)
                    }
                  >
                    {CARD_TYPE_OPTIONS.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  解锁条件
                  <input
                    type="text"
                    value={formData.unlock_condition || ''}
                    onChange={(e) =>
                      updateFormField('unlock_condition', e.target.value)
                    }
                    placeholder="如: 寒冷, branch:order"
                  />
                </label>
              </div>

              <div className="form-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_starter || false}
                    onChange={(e) =>
                      updateFormField('is_starter', e.target.checked)
                    }
                  />
                  初始手牌
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_decoy || false}
                    onChange={(e) =>
                      updateFormField('is_decoy', e.target.checked)
                    }
                  />
                  迷惑卡
                </label>
              </div>

              <div className="form-row full-width">
                <label>
                  描述
                  <textarea
                    rows="3"
                    value={formData.attrs_json?.description || ''}
                    onChange={(e) => updateAttrsDescription(e.target.value)}
                    placeholder="卡牌的描述信息"
                  />
                </label>
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancel}>
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  {editingCard ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

