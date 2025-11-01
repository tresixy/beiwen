-- 添加用户生成卡牌支持字段
-- 扩展 cards 表以支持用户创建的卡牌

-- 添加新字段
ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_base_card BOOLEAN DEFAULT FALSE;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'system';

-- 添加注释
COMMENT ON COLUMN cards.is_base_card IS '是否为基础系统卡牌（非用户生成）';
COMMENT ON COLUMN cards.created_by_user_id IS '创建该卡牌的用户ID（用户生成卡牌）';
COMMENT ON COLUMN cards.source_type IS '卡牌来源类型：system, user_generated, ai_generated, event_reward';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_cards_base ON cards(is_base_card);
CREATE INDEX IF NOT EXISTS idx_cards_creator ON cards(created_by_user_id) WHERE created_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cards_source ON cards(source_type);

-- 将现有的所有卡牌标记为基础卡牌
UPDATE cards SET is_base_card = TRUE, source_type = 'system' 
WHERE is_base_card IS NULL OR is_base_card = FALSE;

-- 为已有的起始卡、钥匙卡、奖励卡设置正确的来源类型
UPDATE cards SET source_type = 'system_key' WHERE card_type = 'key';
UPDATE cards SET source_type = 'system_reward' WHERE card_type = 'reward';
UPDATE cards SET source_type = 'system_starter' WHERE is_starter = TRUE;
