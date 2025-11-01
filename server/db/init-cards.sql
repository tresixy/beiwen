-- 初始化7张基础卡牌
INSERT INTO cards (name, type, rarity, attrs_json) VALUES
('金', 'element', 'common', '{"description":"坚硬的金属元素"}'),
('木', 'element', 'common', '{"description":"生长的自然之力"}'),
('水', 'element', 'common', '{"description":"流动的生命之源"}'),
('火', 'element', 'common', '{"description":"燃烧的能量"}'),
('土', 'element', 'common', '{"description":"厚重的大地之力"}'),
('风', 'element', 'common', '{"description":"自由的气流"}'),
('雷', 'element', 'common', '{"description":"闪电的力量"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  attrs_json = EXCLUDED.attrs_json;

