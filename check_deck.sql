-- 检查用户的可抽取卡牌
SELECT 
    c.name,
    c.card_type,
    c.is_base_card,
    dc.count,
    dc.discovered
FROM deck_cards dc
JOIN cards c ON dc.card_id = c.id
WHERE dc.user_id = (SELECT id FROM users LIMIT 1)  -- 查第一个用户
  AND c.card_type = 'inspiration'
  AND c.is_base_card = TRUE
ORDER BY c.name;
