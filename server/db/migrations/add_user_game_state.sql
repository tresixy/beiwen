-- 用户游戏状态表（用于存储手牌、契约等临时状态）
CREATE TABLE IF NOT EXISTS user_game_state (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    hand_json JSONB DEFAULT '[]',
    contract_json JSONB DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_game_state_user ON user_game_state(user_id);

COMMENT ON TABLE user_game_state IS '用户游戏临时状态';
COMMENT ON COLUMN user_game_state.hand_json IS '玩家手牌';
COMMENT ON COLUMN user_game_state.contract_json IS '当前激活的契约';

