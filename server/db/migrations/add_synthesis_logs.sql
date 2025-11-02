-- 记录每一次合成的明细日志（按时间顺序插入）
CREATE TABLE IF NOT EXISTS synthesis_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    inputs_json JSONB NOT NULL,
    output_item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
    output_name VARCHAR(200) NOT NULL,
    recipe_hash VARCHAR(64),
    era VARCHAR(50),
    mode VARCHAR(20),
    ai_used BOOLEAN DEFAULT FALSE,
    ai_model VARCHAR(50),
    prompt TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 常用查询索引
CREATE INDEX IF NOT EXISTS idx_synth_logs_user_created ON synthesis_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_synth_logs_created ON synthesis_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_synth_logs_recipe ON synthesis_logs(recipe_hash);

COMMENT ON TABLE synthesis_logs IS '玩家每次合成的日志，保留输入、输出及上下文信息';
COMMENT ON COLUMN synthesis_logs.inputs_json IS '输入物品/卡牌名称数组（JSON）';
COMMENT ON COLUMN synthesis_logs.output_name IS '当次合成产物名称（冪等保留当时名称）';
COMMENT ON COLUMN synthesis_logs.mode IS '合成模式：ai/auto/rule等';
COMMENT ON COLUMN synthesis_logs.era IS '发生合成时的时代信息';

