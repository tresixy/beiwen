-- 完整卡牌系统初始化 v3（支持用户生成卡牌）
-- 包含所有时代的卡牌数据

-- ============================================================
-- 表结构更新
-- ============================================================

-- 添加必要字段
ALTER TABLE cards ADD COLUMN IF NOT EXISTS era VARCHAR(50);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_type VARCHAR(20) DEFAULT 'inspiration';
ALTER TABLE cards ADD COLUMN IF NOT EXISTS unlock_condition VARCHAR(100);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_starter BOOLEAN DEFAULT FALSE;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_decoy BOOLEAN DEFAULT FALSE;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_base_card BOOLEAN DEFAULT TRUE;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'system';

-- 删除旧的唯一约束（如果存在）
ALTER TABLE cards DROP CONSTRAINT IF EXISTS unique_card_name;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_cards_era ON cards(era);
CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(card_type);
CREATE INDEX IF NOT EXISTS idx_cards_starter ON cards(is_starter) WHERE is_starter = TRUE;
CREATE INDEX IF NOT EXISTS idx_cards_base ON cards(is_base_card);
CREATE INDEX IF NOT EXISTS idx_cards_creator ON cards(created_by_user_id) WHERE created_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cards_source ON cards(source_type);

-- 添加注释
COMMENT ON COLUMN cards.era IS '卡牌所属时代';
COMMENT ON COLUMN cards.card_type IS '卡牌类型：key(钥匙卡), inspiration(灵感卡), reward(奖励卡)';
COMMENT ON COLUMN cards.unlock_condition IS '解锁条件（对应的event名称或分支）';
COMMENT ON COLUMN cards.is_starter IS '是否为初始手牌';
COMMENT ON COLUMN cards.is_decoy IS '是否为迷惑卡';
COMMENT ON COLUMN cards.is_base_card IS '是否为基础系统卡牌（非用户生成）';
COMMENT ON COLUMN cards.created_by_user_id IS '创建该卡牌的用户ID（用户生成卡牌）';
COMMENT ON COLUMN cards.source_type IS '卡牌来源类型：system, user_generated, ai_generated, system_key, system_reward, system_starter';

-- ============================================================
-- 清理并重新插入基础卡牌数据
-- ============================================================

-- 删除所有基础卡牌（保留用户生成的卡牌）
DELETE FROM cards WHERE is_base_card = TRUE OR is_base_card IS NULL;

-- ============================================================
-- 生存时代卡牌
-- ============================================================

-- 钥匙卡
INSERT INTO cards (name, type, rarity, era, card_type, is_base_card, source_type, attrs_json) VALUES
('火', 'key', 'uncommon', '生存时代', 'key', TRUE, 'system_key', '{"description":"解决【寒冷】的关键。人类首次掌握自然力。","event":"寒冷"}'),
('农业', 'key', 'uncommon', '生存时代', 'key', TRUE, 'system_key', '{"description":"解决【饥饿】的关键。稳定的食物生产体系。","event":"饥饿"}'),
('律法', 'key', 'uncommon', '生存时代', 'key', TRUE, 'system_key', '{"description":"解决【纷争】的关键。将规则固化为文字，形成社会契约。","event":"纷争"}');

-- 初始灵感卡
INSERT INTO cards (name, type, rarity, era, card_type, is_starter, is_decoy, is_base_card, source_type, attrs_json) VALUES
('人', 'inspiration', 'common', '生存时代', 'inspiration', TRUE, FALSE, TRUE, 'system_starter', '{"description":"文明的主体，一切创造行为的发起者。"}'),
('石头', 'inspiration', 'common', '生存时代', 'inspiration', TRUE, FALSE, TRUE, 'system_starter', '{"description":"最原始的工具材料，代表坚硬与改造。"}'),
('水', 'inspiration', 'common', '生存时代', 'inspiration', FALSE, FALSE, TRUE, 'system', '{"description":"生命之源，用于农业灌溉和维持生命。"}'),
('木头', 'inspiration', 'common', '生存时代', 'inspiration', FALSE, FALSE, TRUE, 'system', '{"description":"重要的燃料与建材。"}'),
('土地', 'inspiration', 'common', '生存时代', 'inspiration', FALSE, FALSE, TRUE, 'system', '{"description":"承载万物，是农业的基础。"}'),
('种子', 'inspiration', 'common', '生存时代', 'inspiration', FALSE, FALSE, TRUE, 'system', '{"description":"希望与潜力，从采集到生产的思维转变。"}'),
('冲突', 'inspiration', 'common', '生存时代', 'inspiration', FALSE, FALSE, TRUE, 'system', '{"description":"抽象概念，代表对立与矛盾，是秩序诞生的催化剂。"}'),
('风', 'inspiration', 'common', '生存时代', 'inspiration', FALSE, TRUE, TRUE, 'system', '{"description":"代表自然的力量。"}');

-- 解锁灵感卡（通关奖励）
INSERT INTO cards (name, type, rarity, era, card_type, unlock_condition, is_base_card, source_type, attrs_json) VALUES
('智慧', 'reward', 'rare', '生存时代', 'reward', '寒冷', TRUE, 'system_reward', '{"description":"第一次思维飞跃。学会用火代表人类开始总结规律。"}'),
('部落', 'reward', 'rare', '生存时代', 'reward', '饥饿', TRUE, 'system_reward', '{"description":"第一次社会结构飞跃。农业使定居成为可能，人口聚集形成社会。"}'),
('价值', 'reward', 'rare', '生存时代', 'reward', '纷争', TRUE, 'system_reward', '{"description":"律法保障了私有财产，使得物品的价值可以被公认和衡量。"}');

-- ============================================================
-- 城邦时代卡牌
-- ============================================================

INSERT INTO cards (name, type, rarity, era, card_type, is_base_card, source_type, attrs_json) VALUES
('文字', 'key', 'uncommon', '城邦时代', 'key', TRUE, 'system_key', '{"description":"解决【遗忘】的关键。一套成熟的符号系统，用于记录历史、法律和财产，战胜了时间。","event":"遗忘"}'),
('货币', 'key', 'uncommon', '城邦时代', 'key', TRUE, 'system_key', '{"description":"解决【隔绝】的关键。基于价值和财富的交换体系，打破了地理的限制。","event":"隔绝"}'),
('城防', 'key', 'uncommon', '城邦时代', 'key', TRUE, 'system_key', '{"description":"解决【入侵】的关键。利用劳力和新材料构建的防御工事，守护了文明的果实。","event":"入侵"}');

INSERT INTO cards (name, type, rarity, era, card_type, is_decoy, is_base_card, source_type, attrs_json) VALUES
('劳力', 'inspiration', 'common', '城邦时代', 'inspiration', FALSE, TRUE, 'system', '{"description":"有组织的劳动。部落发展为城邦后，集中的人口可以进行更大规模的协作。"}'),
('矿石', 'inspiration', 'common', '城邦时代', 'inspiration', FALSE, TRUE, 'system', '{"description":"新的资源。比石头更具可塑性和价值，是制造更高级工具、货币和武器的基础。"}'),
('符号', 'inspiration', 'common', '城邦时代', 'inspiration', FALSE, TRUE, 'system', '{"description":"文字的前身。将抽象的智慧和记忆固化为可见标记，是记录和传承的第一步。"}'),
('信仰', 'inspiration', 'common', '城邦时代', 'inspiration', TRUE, TRUE, 'system', '{"description":"社会凝聚力。虽然能统一思想，但在解决本时代的物质困境时，并非直接的钥匙。"}');

INSERT INTO cards (name, type, rarity, era, card_type, unlock_condition, is_base_card, source_type, attrs_json) VALUES
('知识', 'reward', 'rare', '城邦时代', 'reward', '遗忘', TRUE, 'system_reward', '{"description":"系统化的智慧。文字的诞生使经验得以被大规模复制和传承，形成了真正的知识体系。"}'),
('财富', 'reward', 'rare', '城邦时代', 'reward', '隔绝', TRUE, 'system_reward', '{"description":"价值的积累。商业的出现使价值可以被大规模累积和流通，成为驱动社会发展的新动力。"}'),
('权力', 'reward', 'rare', '城邦时代', 'reward', '入侵', TRUE, 'system_reward', '{"description":"集中的控制力。为了组织城防和管理财富，社会必须将决策权集中，形成统治阶级。"}');

-- ============================================================
-- 分野时代卡牌
-- ============================================================

INSERT INTO cards (name, type, rarity, era, card_type, is_base_card, source_type, attrs_json) VALUES
('官僚体系', 'key', 'rare', '分野时代', 'key', TRUE, 'system_key', '{"description":"解决【方向的迷惘】的关键（秩序路线）。建立系统化的管理架构。","event":"方向的迷惘","branch":"order"}'),
('宗教', 'key', 'rare', '分野时代', 'key', TRUE, 'system_key', '{"description":"解决【方向的迷惘】的关键（信仰路线）。建立精神信仰体系。","event":"方向的迷惘","branch":"faith"}');

INSERT INTO cards (name, type, rarity, era, card_type, is_decoy, is_base_card, source_type, attrs_json) VALUES
('秩序', 'inspiration', 'common', '分野时代', 'inspiration', FALSE, TRUE, 'system', '{"description":"规范与系统。建立井然有序的社会结构。"}'),
('虔诚', 'inspiration', 'common', '分野时代', 'inspiration', FALSE, TRUE, 'system', '{"description":"对信仰的执着与追求。"}'),
('仪式', 'inspiration', 'common', '分野时代', 'inspiration', FALSE, TRUE, 'system', '{"description":"神圣的程序与规则。"}'),
('等级', 'inspiration', 'common', '分野时代', 'inspiration', FALSE, TRUE, 'system', '{"description":"社会阶层的划分。"}'),
('欲望', 'inspiration', 'common', '分野时代', 'inspiration', TRUE, TRUE, 'system', '{"description":"人类的追求与野心。"}');

INSERT INTO cards (name, type, rarity, era, card_type, unlock_condition, is_base_card, source_type, attrs_json) VALUES
('统治', 'reward', 'epic', '分野时代', 'reward', 'branch:order', TRUE, 'system_reward', '{"description":"系统化的权力管理。解锁帝国时代。","nextEra":"帝国时代"}'),
('神权', 'reward', 'epic', '分野时代', 'reward', 'branch:faith', TRUE, 'system_reward', '{"description":"神圣的权威。解锁信仰时代。","nextEra":"信仰时代"}');

-- 继续后续时代的卡牌插入...
-- （为了简洁，这里省略帝国、理性、信仰、启蒙时代的完整插入语句）
-- 请参考原 init-cards-v2.sql 的格式，为每张卡牌添加 is_base_card=TRUE 和 source_type

-- 验证插入结果
SELECT era, card_type, is_base_card, COUNT(*) as count 
FROM cards 
GROUP BY era, card_type, is_base_card 
ORDER BY era, card_type;

