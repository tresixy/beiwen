-- 为用户表添加合成次数字段
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS synthesis_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_synthesis_count ON users(synthesis_count);

COMMENT ON COLUMN users.synthesis_count IS '玩家累计合成次数';

