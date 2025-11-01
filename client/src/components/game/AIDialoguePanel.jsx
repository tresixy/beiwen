import { useEffect, useState } from 'react';

export function AIDialoguePanel({ open, cards, onClose, onSubmit }) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [aiIdeas, setAiIdeas] = useState(null);
    const [selectedIdea, setSelectedIdea] = useState(null);

    useEffect(() => {
        if (!open || cards.length < 2) {
            // 关闭时重置状态
            if (!open) {
                setName('');
                setAiIdeas(null);
                setSelectedIdea(null);
                setLoading(false);
            }
            return;
        }

        const cardNames = cards.map(card => card.name);
        setName(`${cardNames[0]}+${cardNames[1]}`);
        setAiIdeas(null);
        setSelectedIdea(null);
        setLoading(true);
        
        // 触发AI对话
        const triggerAIDialogue = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setLoading(false);
                    return;
                }

                const tempName = `${cardNames[0]}+${cardNames[1]}`;
                
                // 使用预览模式获取AI建议，不保存到数据库
                const response = await fetch('/api/synthesize', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        inputs: cardNames,
                        name: tempName,
                        mode: 'ai',
                        preview: true,
                    }),
                });

                if (!response.ok) {
                    throw new Error('AI建议获取失败');
                }

                const data = await response.json();
                
                if (data.ideas && data.ideas.length > 0) {
                    setAiIdeas(data.ideas);
                    setSelectedIdea(0);
                    // 自动选择第一个想法作为默认名称
                    const firstIdeaName = data.ideas[0]?.results?.split('。')[0] || data.output?.name || tempName;
                    setName(firstIdeaName);
                } else if (data.output?.name) {
                    setName(data.output.name);
                }
            } catch (err) {
                console.error('AI对话失败:', err);
                // 如果AI失败，使用默认名称
                setName(`${cardNames[0]}+${cardNames[1]}`);
            } finally {
                setLoading(false);
            }
        };

        triggerAIDialogue();
    }, [open, cards]);

    const handleSubmit = () => {
        if (!name.trim()) {
            return;
        }
        onSubmit?.(name.trim(), selectedIdea !== null ? aiIdeas?.[selectedIdea] : null);
    };

    if (!open) {
        return null;
    }

    return (
        <div className="ai-dialogue-panel">
            <div className="ai-dialogue-panel__overlay" onClick={onClose} />
            <div className="ai-dialogue-panel__content">
                <div className="ai-dialogue-panel__header">
                    <h3>AI融合对话</h3>
                    <button type="button" onClick={onClose}>✕</button>
                </div>
                
                <div className="ai-dialogue-panel__cards">
                    {cards.map((card, index) => (
                        <div key={card.id} className="ai-dialogue-panel__card">
                            <div className="ai-dialogue-panel__card-name">{card.name}</div>
                            <div className="ai-dialogue-panel__card-type">{card.type}</div>
                        </div>
                    ))}
                    <div className="ai-dialogue-panel__arrow">+</div>
                </div>

                {loading ? (
                    <div className="ai-dialogue-panel__loading">
                        <div className="ai-dialogue-panel__loading-text">AI正在思考融合的可能性...</div>
                    </div>
                ) : aiIdeas && aiIdeas.length > 0 ? (
                    <div className="ai-dialogue-panel__ideas">
                        <div className="ai-dialogue-panel__ideas-title">AI提供的融合想法：</div>
                        {aiIdeas.map((idea, index) => (
                            <div
                                key={index}
                                className={`ai-dialogue-panel__idea ${selectedIdea === index ? 'selected' : ''}`}
                                onClick={() => {
                                    setSelectedIdea(index);
                                    setName(idea.results?.split('。')[0] || name);
                                }}
                            >
                                <div className="ai-dialogue-panel__idea-text">{idea.results}</div>
                            </div>
                        ))}
                    </div>
                ) : null}

                <div className="ai-dialogue-panel__input">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="为融合结果命名"
                        disabled={loading}
                    />
                </div>

                <div className="ai-dialogue-panel__actions">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || !name.trim()}
                        className="ai-dialogue-panel__submit"
                    >
                        确认融合
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="ai-dialogue-panel__cancel"
                    >
                        取消
                    </button>
                </div>
            </div>
        </div>
    );
}

