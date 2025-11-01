export function ProfessionPanel({
    open,
    choices,
    onSelect,
    onRegenerate,
    onClose,
    onAbandon,
}) {
    if (!open) {
        return null;
    }

    return (
        <section className="glass-panel profession-panel">
            <div className="panel-header">
                <h3>职业觉醒</h3>
                <button type="button" onClick={onClose}>
                    关闭
                </button>
            </div>
            <div className="profession-choices">
                {choices.length === 0 ? (
                    <div className="empty">暂无可选职业，请刷新灵感。</div>
                ) : (
                    choices.map((choice, index) => (
                        <div key={choice.name} className="profession-card" onClick={() => onSelect(index)}>
                            <div className="name">{choice.name}</div>
                            <div className="focus">倾向：{Array.isArray(choice.focus) ? choice.focus.join('、') : '综合'}</div>
                            <div className="desc">{choice.description}</div>
                            <div className="bonus">{choice.bonus}</div>
                        </div>
                    ))
                )}
            </div>
            <div className="profession-footer">
                <button type="button" onClick={onRegenerate}>
                    重新生成
                </button>
                <button type="button" onClick={onAbandon}>
                    暂不转职
                </button>
            </div>
        </section>
    );
}




