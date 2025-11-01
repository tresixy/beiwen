-- 将所有钥匙卡的rarity更新为ruby（红色）
-- 根据游戏设计文档：所有的钥匙卡都是红色的，类型为 Ruby

UPDATE cards 
SET rarity = 'ruby' 
WHERE card_type = 'key' OR type = 'key';

-- 确保所有灵感卡保持为common（白色）
UPDATE cards 
SET rarity = 'common' 
WHERE card_type = 'inspiration' AND is_base_card = TRUE AND rarity != 'common';

COMMENT ON COLUMN cards.rarity IS '稀有度：common(白色-灵感卡), ruby(红色-钥匙卡), rare(蓝色-生成卡), uncommon, epic, legendary';


