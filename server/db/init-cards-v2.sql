-- 完整卡牌系统初始化 v2
-- 包含所有时代的卡牌数据

-- 先清理表（如果需要重置）
-- TRUNCATE TABLE cards CASCADE;

-- 添加 era 字段到 cards 表（如果不存在）
ALTER TABLE cards ADD COLUMN IF NOT EXISTS era VARCHAR(50);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_type VARCHAR(20) DEFAULT 'inspiration';
ALTER TABLE cards ADD COLUMN IF NOT EXISTS unlock_condition VARCHAR(100);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_starter BOOLEAN DEFAULT FALSE;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_decoy BOOLEAN DEFAULT FALSE;

-- 用户生成卡牌支持字段
ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_base_card BOOLEAN DEFAULT TRUE;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'system';

-- 添加唯一约束（移除，允许用户创建同名卡牌）
-- ALTER TABLE cards ADD CONSTRAINT unique_card_name UNIQUE (name);

-- ============================================================
-- 生存时代卡牌
-- ============================================================

-- 钥匙卡
INSERT INTO cards (name, type, rarity, era, card_type, is_base_card, source_type, attrs_json) VALUES
('火', 'key', 'uncommon', '生存时代', 'key', TRUE, 'system_key', '{"description":"解决【寒冷】的关键。人类首次掌握自然力。","event":"寒冷"}'),
('农业', 'key', 'uncommon', '生存时代', 'key', TRUE, 'system_key', '{"description":"解决【饥饿】的关键。稳定的食物生产体系。","event":"饥饿"}'),
('律法', 'key', 'uncommon', '生存时代', 'key', TRUE, 'system_key', '{"description":"解决【纷争】的关键。将规则固化为文字，形成社会契约。","event":"纷争"}')
ON CONFLICT DO NOTHING;

-- 如果卡牌已存在，更新其属性
UPDATE cards SET 
  type = 'key',
  rarity = 'uncommon',
  era = '生存时代',
  card_type = 'key',
  is_base_card = TRUE,
  source_type = 'system_key'
WHERE name IN ('火', '农业', '律法');

-- 更新已存在的卡牌，或保持不变
-- (注释掉重复的INSERT和ON CONFLICT块)

-- 初始灵感卡
INSERT INTO cards (name, type, rarity, era, card_type, is_starter, is_decoy, attrs_json) VALUES
('人', 'inspiration', 'common', '生存时代', 'inspiration', TRUE, FALSE, '{"description":"文明的主体，一切创造行为的发起者。"}'),
('石头', 'inspiration', 'common', '生存时代', 'inspiration', TRUE, FALSE, '{"description":"最原始的工具材料，代表坚硬与改造。"}'),
('水', 'inspiration', 'common', '生存时代', 'inspiration', FALSE, FALSE, '{"description":"生命之源，用于农业灌溉和维持生命。"}'),
('木头', 'inspiration', 'common', '生存时代', 'inspiration', FALSE, FALSE, '{"description":"重要的燃料与建材。"}'),
('土地', 'inspiration', 'common', '生存时代', 'inspiration', FALSE, FALSE, '{"description":"承载万物，是农业的基础。"}'),
('种子', 'inspiration', 'common', '生存时代', 'inspiration', FALSE, FALSE, '{"description":"希望与潜力，从采集到生产的思维转变。"}'),
('冲突', 'inspiration', 'common', '生存时代', 'inspiration', FALSE, FALSE, '{"description":"抽象概念，代表对立与矛盾，是秩序诞生的催化剂。"}'),
('风', 'inspiration', 'common', '生存时代', 'inspiration', FALSE, TRUE, '{"description":"代表自然的力量。"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  is_starter = EXCLUDED.is_starter,
  is_decoy = EXCLUDED.is_decoy,
  attrs_json = EXCLUDED.attrs_json;

-- 解锁灵感卡（通关奖励）
INSERT INTO cards (name, type, rarity, era, card_type, unlock_condition, attrs_json) VALUES
('智慧', 'reward', 'rare', '生存时代', 'reward', '寒冷', '{"description":"第一次思维飞跃。学会用火代表人类开始总结规律。"}'),
('部落', 'reward', 'rare', '生存时代', 'reward', '饥饿', '{"description":"第一次社会结构飞跃。农业使定居成为可能，人口聚集形成社会。"}'),
('价值', 'reward', 'rare', '生存时代', 'reward', '纷争', '{"description":"律法保障了私有财产，使得物品的价值可以被公认和衡量。"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  unlock_condition = EXCLUDED.unlock_condition,
  attrs_json = EXCLUDED.attrs_json;

-- ============================================================
-- 城邦时代卡牌
-- ============================================================

INSERT INTO cards (name, type, rarity, era, card_type, attrs_json) VALUES
('文字', 'key', 'uncommon', '城邦时代', 'key', '{"description":"解决【遗忘】的关键。一套成熟的符号系统，用于记录历史、法律和财产，战胜了时间。","event":"遗忘"}'),
('货币', 'key', 'uncommon', '城邦时代', 'key', '{"description":"解决【隔绝】的关键。基于价值和财富的交换体系，打破了地理的限制。","event":"隔绝"}'),
('城防', 'key', 'uncommon', '城邦时代', 'key', '{"description":"解决【入侵】的关键。利用劳力和新材料构建的防御工事，守护了文明的果实。","event":"入侵"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  attrs_json = EXCLUDED.attrs_json;

INSERT INTO cards (name, type, rarity, era, card_type, is_decoy, attrs_json) VALUES
('劳力', 'inspiration', 'common', '城邦时代', 'inspiration', FALSE, '{"description":"有组织的劳动。部落发展为城邦后，集中的人口可以进行更大规模的协作。"}'),
('矿石', 'inspiration', 'common', '城邦时代', 'inspiration', FALSE, '{"description":"新的资源。比石头更具可塑性和价值，是制造更高级工具、货币和武器的基础。"}'),
('符号', 'inspiration', 'common', '城邦时代', 'inspiration', FALSE, '{"description":"文字的前身。将抽象的智慧和记忆固化为可见标记，是记录和传承的第一步。"}'),
('信仰', 'inspiration', 'common', '城邦时代', 'inspiration', TRUE, '{"description":"社会凝聚力。虽然能统一思想，但在解决本时代的物质困境时，并非直接的钥匙。"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  is_decoy = EXCLUDED.is_decoy,
  attrs_json = EXCLUDED.attrs_json;

INSERT INTO cards (name, type, rarity, era, card_type, unlock_condition, attrs_json) VALUES
('知识', 'reward', 'rare', '城邦时代', 'reward', '遗忘', '{"description":"系统化的智慧。文字的诞生使经验得以被大规模复制和传承，形成了真正的知识体系。"}'),
('财富', 'reward', 'rare', '城邦时代', 'reward', '隔绝', '{"description":"价值的积累。商业的出现使价值可以被大规模累积和流通，成为驱动社会发展的新动力。"}'),
('权力', 'reward', 'rare', '城邦时代', 'reward', '入侵', '{"description":"集中的控制力。为了组织城防和管理财富，社会必须将决策权集中，形成统治阶级。"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  unlock_condition = EXCLUDED.unlock_condition,
  attrs_json = EXCLUDED.attrs_json;

-- ============================================================
-- 分野时代卡牌
-- ============================================================

INSERT INTO cards (name, type, rarity, era, card_type, attrs_json) VALUES
('官僚体系', 'key', 'rare', '分野时代', 'key', '{"description":"解决【方向的迷惘】的关键（秩序路线）。建立系统化的管理架构。","event":"方向的迷惘","branch":"order"}'),
('宗教', 'key', 'rare', '分野时代', 'key', '{"description":"解决【方向的迷惘】的关键（信仰路线）。建立精神信仰体系。","event":"方向的迷惘","branch":"faith"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  attrs_json = EXCLUDED.attrs_json;

INSERT INTO cards (name, type, rarity, era, card_type, is_decoy, attrs_json) VALUES
('秩序', 'inspiration', 'common', '分野时代', 'inspiration', FALSE, '{"description":"规范与系统。建立井然有序的社会结构。"}'),
('虔诚', 'inspiration', 'common', '分野时代', 'inspiration', FALSE, '{"description":"对信仰的执着与追求。"}'),
('仪式', 'inspiration', 'common', '分野时代', 'inspiration', FALSE, '{"description":"神圣的程序与规则。"}'),
('等级', 'inspiration', 'common', '分野时代', 'inspiration', FALSE, '{"description":"社会阶层的划分。"}'),
('欲望', 'inspiration', 'common', '分野时代', 'inspiration', TRUE, '{"description":"人类的追求与野心。"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  is_decoy = EXCLUDED.is_decoy,
  attrs_json = EXCLUDED.attrs_json;

INSERT INTO cards (name, type, rarity, era, card_type, unlock_condition, attrs_json) VALUES
('统治', 'reward', 'epic', '分野时代', 'reward', 'branch:order', '{"description":"系统化的权力管理。解锁帝国时代。","nextEra":"帝国时代"}'),
('神权', 'reward', 'epic', '分野时代', 'reward', 'branch:faith', '{"description":"神圣的权威。解锁信仰时代。","nextEra":"信仰时代"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  unlock_condition = EXCLUDED.unlock_condition,
  attrs_json = EXCLUDED.attrs_json;

-- ============================================================
-- 帝国时代卡牌
-- ============================================================

INSERT INTO cards (name, type, rarity, era, card_type, attrs_json) VALUES
('道路', 'key', 'rare', '帝国时代', 'key', '{"description":"解决【广袤的疆域】的关键。连接帝国的血脉。","event":"广袤的疆域"}'),
('史诗', 'key', 'rare', '帝国时代', 'key', '{"description":"解决【涣散的人心】的关键。凝聚民族认同的传说。","event":"涣散的人心"}'),
('远洋航行', 'key', 'rare', '帝国时代', 'key', '{"description":"解决【无尽的欲望】的关键。探索未知的世界。","event":"无尽的欲望"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  attrs_json = EXCLUDED.attrs_json;

INSERT INTO cards (name, type, rarity, era, card_type, is_decoy, attrs_json) VALUES
('军团', 'inspiration', 'common', '帝国时代', 'inspiration', FALSE, '{"description":"有组织的军事力量。"}'),
('工程', 'inspiration', 'common', '帝国时代', 'inspiration', FALSE, '{"description":"大规模的建设能力。"}'),
('疆域', 'inspiration', 'common', '帝国时代', 'inspiration', FALSE, '{"description":"广阔的领土范围。"}'),
('征服', 'inspiration', 'common', '帝国时代', 'inspiration', FALSE, '{"description":"扩张的野心与行动。"}'),
('荣耀', 'inspiration', 'common', '帝国时代', 'inspiration', FALSE, '{"description":"帝国的威望与荣誉。"}'),
('和平', 'inspiration', 'common', '帝国时代', 'inspiration', TRUE, '{"description":"暂时的稳定与安宁。"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  is_decoy = EXCLUDED.is_decoy,
  attrs_json = EXCLUDED.attrs_json;

INSERT INTO cards (name, type, rarity, era, card_type, unlock_condition, attrs_json) VALUES
('秩序', 'reward', 'rare', '帝国时代', 'reward', '广袤的疆域', '{"description":"帝国的统一管理。"}'),
('认同', 'reward', 'rare', '帝国时代', 'reward', '涣散的人心', '{"description":"民族意识的觉醒。"}'),
('探索', 'reward', 'rare', '帝国时代', 'reward', '无尽的欲望', '{"description":"对未知世界的追求。"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  unlock_condition = EXCLUDED.unlock_condition,
  attrs_json = EXCLUDED.attrs_json;

-- ============================================================
-- 理性时代卡牌
-- ============================================================

INSERT INTO cards (name, type, rarity, era, card_type, attrs_json) VALUES
('印刷术', 'key', 'rare', '理性时代', 'key', '{"description":"解决【知识的囚笼】的关键。使知识能够大规模传播。","event":"知识的囚笼"}'),
('启蒙思想', 'key', 'rare', '理性时代', 'key', '{"description":"解决【帝国的黄昏】的关键。新的社会理念。","event":"帝国的黄昏"}'),
('蒸汽机', 'key', 'rare', '理性时代', 'key', '{"description":"解决【停滞的生产】的关键。工业革命的开端。","event":"停滞的生产"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  attrs_json = EXCLUDED.attrs_json;

INSERT INTO cards (name, type, rarity, era, card_type, is_decoy, attrs_json) VALUES
('技艺', 'inspiration', 'common', '理性时代', 'inspiration', FALSE, '{"description":"精湛的工艺技术。"}'),
('机械', 'inspiration', 'common', '理性时代', 'inspiration', FALSE, '{"description":"复杂的机器装置。"}'),
('理性', 'inspiration', 'common', '理性时代', 'inspiration', FALSE, '{"description":"逻辑思维的力量。"}'),
('观察', 'inspiration', 'common', '理性时代', 'inspiration', FALSE, '{"description":"仔细研究的方法。"}'),
('传统', 'inspiration', 'common', '理性时代', 'inspiration', TRUE, '{"description":"旧有的习惯与规范。"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  is_decoy = EXCLUDED.is_decoy,
  attrs_json = EXCLUDED.attrs_json;

INSERT INTO cards (name, type, rarity, era, card_type, unlock_condition, attrs_json) VALUES
('传播', 'reward', 'rare', '理性时代', 'reward', '知识的囚笼', '{"description":"信息的广泛流通。"}'),
('平等', 'reward', 'rare', '理性时代', 'reward', '帝国的黄昏', '{"description":"打破等级的理念。"}'),
('效率', 'reward', 'rare', '理性时代', 'reward', '停滞的生产', '{"description":"生产力的革命性提升。"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  unlock_condition = EXCLUDED.unlock_condition,
  attrs_json = EXCLUDED.attrs_json;

-- ============================================================
-- 信仰时代卡牌
-- ============================================================

INSERT INTO cards (name, type, rarity, era, card_type, attrs_json) VALUES
('圣典', 'key', 'rare', '信仰时代', 'key', '{"description":"解决【精神的虚空】的关键。记录神意的唯一真理。","event":"精神的虚空"}'),
('艺术', 'key', 'rare', '信仰时代', 'key', '{"description":"解决【理念的传播】的关键。让信众感受神的光辉。","event":"理念的传播"}'),
('教权', 'key', 'rare', '信仰时代', 'key', '{"description":"解决【异端的挑战】的关键。定义唯一的正确。","event":"异端的挑战"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  attrs_json = EXCLUDED.attrs_json;

INSERT INTO cards (name, type, rarity, era, card_type, is_decoy, attrs_json) VALUES
('经文', 'inspiration', 'common', '信仰时代', 'inspiration', FALSE, '{"description":"神圣的文字记录。"}'),
('圣物', 'inspiration', 'common', '信仰时代', 'inspiration', FALSE, '{"description":"承载神力的物品。"}'),
('布道', 'inspiration', 'common', '信仰时代', 'inspiration', FALSE, '{"description":"传播神的教诲。"}'),
('神迹', 'inspiration', 'common', '信仰时代', 'inspiration', FALSE, '{"description":"超自然的显现。"}'),
('怀疑', 'inspiration', 'common', '信仰时代', 'inspiration', TRUE, '{"description":"对信仰的质疑。"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  is_decoy = EXCLUDED.is_decoy,
  attrs_json = EXCLUDED.attrs_json;

INSERT INTO cards (name, type, rarity, era, card_type, unlock_condition, attrs_json) VALUES
('正统', 'reward', 'rare', '信仰时代', 'reward', '精神的虚空', '{"description":"统一的教义体系。"}'),
('感召', 'reward', 'rare', '信仰时代', 'reward', '理念的传播', '{"description":"精神的感化力量。"}'),
('裁决', 'reward', 'rare', '信仰时代', 'reward', '异端的挑战', '{"description":"判定正邪的权力。"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  unlock_condition = EXCLUDED.unlock_condition,
  attrs_json = EXCLUDED.attrs_json;

-- ============================================================
-- 启蒙时代卡牌
-- ============================================================

INSERT INTO cards (name, type, rarity, era, card_type, attrs_json) VALUES
('科学方法', 'key', 'epic', '启蒙时代', 'key', '{"description":"解决【蒙昧的阴影】的关键。照亮未知的光。","event":"蒙昧的阴影"}'),
('人权宣言', 'key', 'epic', '启蒙时代', 'key', '{"description":"解决【神权的枷锁】的关键。凡人决定自己的命运。","event":"神权的枷锁"}'),
('电力', 'key', 'epic', '启蒙时代', 'key', '{"description":"解决【自然的伟力】的关键。驾驭雷霆的力量。","event":"自然的伟力"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  attrs_json = EXCLUDED.attrs_json;

INSERT INTO cards (name, type, rarity, era, card_type, is_decoy, attrs_json) VALUES
('实验', 'inspiration', 'uncommon', '启蒙时代', 'inspiration', FALSE, '{"description":"通过试验验证真理。"}'),
('逻辑', 'inspiration', 'uncommon', '启蒙时代', 'inspiration', FALSE, '{"description":"严密的推理方法。"}'),
('自然法则', 'inspiration', 'uncommon', '启蒙时代', 'inspiration', FALSE, '{"description":"宇宙运行的规律。"}'),
('自由', 'inspiration', 'uncommon', '启蒙时代', 'inspiration', FALSE, '{"description":"个体的独立与解放。"}'),
('革命', 'inspiration', 'uncommon', '启蒙时代', 'inspiration', FALSE, '{"description":"推翻旧秩序的力量。"}'),
('秩序', 'inspiration', 'common', '启蒙时代', 'inspiration', TRUE, '{"description":"稳定的社会结构。"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  is_decoy = EXCLUDED.is_decoy,
  attrs_json = EXCLUDED.attrs_json;

INSERT INTO cards (name, type, rarity, era, card_type, unlock_condition, attrs_json) VALUES
('真理', 'reward', 'epic', '启蒙时代', 'reward', '蒙昧的阴影', '{"description":"科学揭示的客观规律。"}'),
('民主', 'reward', 'epic', '启蒙时代', 'reward', '神权的枷锁', '{"description":"人民的统治。"}'),
('能量', 'reward', 'epic', '启蒙时代', 'reward', '自然的伟力', '{"description":"可控制的自然力量。"}')
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  rarity = EXCLUDED.rarity,
  era = EXCLUDED.era,
  card_type = EXCLUDED.card_type,
  unlock_condition = EXCLUDED.unlock_condition,
  attrs_json = EXCLUDED.attrs_json;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_cards_era ON cards(era);
CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(card_type);
CREATE INDEX IF NOT EXISTS idx_cards_starter ON cards(is_starter) WHERE is_starter = TRUE;
CREATE INDEX IF NOT EXISTS idx_cards_base ON cards(is_base_card);
CREATE INDEX IF NOT EXISTS idx_cards_creator ON cards(created_by_user_id) WHERE created_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cards_source ON cards(source_type);

-- 注释
COMMENT ON COLUMN cards.era IS '卡牌所属时代';
COMMENT ON COLUMN cards.card_type IS '卡牌类型：key(钥匙卡), inspiration(灵感卡), reward(奖励卡)';
COMMENT ON COLUMN cards.unlock_condition IS '解锁条件（对应的event名称或分支）';
COMMENT ON COLUMN cards.is_starter IS '是否为初始手牌';
COMMENT ON COLUMN cards.is_decoy IS '是否为迷惑卡';
COMMENT ON COLUMN cards.is_base_card IS '是否为基础系统卡牌（非用户生成）';
COMMENT ON COLUMN cards.created_by_user_id IS '创建该卡牌的用户ID（用户生成卡牌）';
COMMENT ON COLUMN cards.source_type IS '卡牌来源类型：system, user_generated, ai_generated, system_key, system_reward, system_starter';

