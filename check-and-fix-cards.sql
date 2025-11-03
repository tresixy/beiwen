-- 检查和修复用户卡牌问题

-- 1. 检查数据库中有哪些生存时代的灵感卡
SELECT '=== 生存时代灵感卡 ===' as info;
SELECT id, name, card_type, is_starter, is_base_card 
FROM cards 
WHERE era = '生存时代' AND card_type = 'inspiration'
ORDER BY is_starter DESC, name;

-- 2. 检查所有用户的 deck_cards 状态
SELECT '=== 用户已解锁的生存时代灵感卡 ===' as info;
SELECT u.id, u.username, c.name, dc.discovered, dc.count
FROM users u
LEFT JOIN deck_cards dc ON u.id = dc.user_id
LEFT JOIN cards c ON dc.card_id = c.id AND c.era = '生存时代' AND c.card_type = 'inspiration'
WHERE u.role != 'admin'
ORDER BY u.id, c.name;

-- 3. 为所有用户补充缺失的生存时代灵感卡
SELECT '=== 开始修复：为所有用户补充生存时代灵感卡 ===' as info;

INSERT INTO deck_cards (user_id, card_id, discovered, count, updated_at)
SELECT 
    u.id as user_id,
    c.id as card_id,
    TRUE as discovered,
    CASE 
        WHEN c.is_starter = TRUE THEN 2
        ELSE 1
    END as count,
    NOW() as updated_at
FROM users u
CROSS JOIN cards c
WHERE u.role != 'admin'
  AND c.era = '生存时代' 
  AND c.card_type = 'inspiration'
  AND c.is_base_card = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM deck_cards dc 
    WHERE dc.user_id = u.id AND dc.card_id = c.id
  )
ON CONFLICT (user_id, card_id) 
DO UPDATE SET 
  discovered = TRUE,
  count = GREATEST(deck_cards.count, EXCLUDED.count),
  updated_at = NOW();

-- 4. 再次检查修复结果
SELECT '=== 修复后的结果 ===' as info;
SELECT u.id, u.username, COUNT(dc.id) as total_cards
FROM users u
LEFT JOIN deck_cards dc ON u.id = dc.user_id
LEFT JOIN cards c ON dc.card_id = c.id AND c.era = '生存时代' AND c.card_type = 'inspiration'
WHERE u.role != 'admin'
GROUP BY u.id, u.username
ORDER BY u.id;

