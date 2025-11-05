-- 编年史日志表：记录AI生成的文明发展史
CREATE TABLE IF NOT EXISTS chronicle_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    synthesis_log_id INTEGER REFERENCES synthesis_logs(id) ON DELETE SET NULL,
    current_dilemma VARCHAR(200),
    created_card_name VARCHAR(200) NOT NULL,
    available_concepts TEXT[],
    narrative_so_far TEXT,
    log_entry TEXT NOT NULL,
    ai_model VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 索引优化查询
CREATE INDEX IF NOT EXISTS idx_chronicle_user_created ON chronicle_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chronicle_synthesis ON chronicle_logs(synthesis_log_id);

COMMENT ON TABLE chronicle_logs IS '文明编年史日志，AI生成的史官记录';
COMMENT ON COLUMN chronicle_logs.log_entry IS 'AI生成的编年史条目';
COMMENT ON COLUMN chronicle_logs.narrative_so_far IS '生成时的完整编年史摘要';
COMMENT ON COLUMN chronicle_logs.available_concepts IS '生成时可用的概念列表';

