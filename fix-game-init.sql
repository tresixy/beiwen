-- 修复游戏初始化问题
-- 为现有用户添加起始卡牌和正确的游戏状态

BEGIN;

-- 1. 为所有用户添加起始卡牌（人、石头）
INSERT INTO deck_cards (user_id, card_id, discovered, count)
SELECT 
    u.id as user_id,
    c.id as card_id,
    true as discovered,
    2 as count
FROM users u
CROSS JOIN cards c
WHERE c.is_starter = TRUE 
  AND c.era = '生存时代'
  AND NOT EXISTS (
    SELECT 1 FROM deck_cards dc 
    WHERE dc.user_id = u.id AND dc.card_id = c.id
  )
ON CONFLICT (user_id, card_id) DO NOTHING;

-- 2. 重置手牌为空（让游戏自动发牌）
UPDATE user_game_state 
SET hand_json = '[]'::jsonb
WHERE user_id IN (SELECT id FROM users);

-- 3. 确保所有用户有user_game_state记录
INSERT INTO user_game_state (user_id, era, hand_json, completed_events, unlocked_keys, event_sequence, updated_at)
SELECT 
    id,
    '生存时代',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    NOW()
FROM users
WHERE id NOT IN (SELECT user_id FROM user_game_state)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

-- 验证结果
SELECT 
    u.id,
    u.username,
    u.role,
    COUNT(dc.id) as starter_cards,
    jsonb_array_length(COALESCE(ugs.hand_json, '[]'::jsonb)) as hand_size
FROM users u
LEFT JOIN deck_cards dc ON u.id = dc.user_id AND dc.is_starter = true
LEFT JOIN user_game_state ugs ON u.id = ugs.user_id
GROUP BY u.id, u.username, u.role, ugs.hand_json
ORDER BY u.id;

