#!/usr/bin/env node

// 简化的卡牌安装脚本
import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/minigame';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

// 步骤1: 添加字段
const addFieldsSQL = `
-- 添加用户生成卡牌支持字段
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
`;

// 步骤2: 添加其他必要字段
const addEraFieldsSQL = `
ALTER TABLE cards ADD COLUMN IF NOT EXISTS era VARCHAR(50);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_type VARCHAR(20) DEFAULT 'inspiration';
ALTER TABLE cards ADD COLUMN IF NOT EXISTS unlock_condition VARCHAR(100);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_starter BOOLEAN DEFAULT FALSE;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_decoy BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_cards_era ON cards(era);
CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(card_type);
CREATE INDEX IF NOT EXISTS idx_cards_starter ON cards(is_starter) WHERE is_starter = TRUE;
`;

// 步骤3: 清理并插入卡牌数据（只包含部分示例）
const insertCardsSQL = `
-- 先清理deck_cards中对基础卡牌的引用
DELETE FROM deck_cards WHERE card_id IN (SELECT id FROM cards WHERE is_base_card = TRUE);

-- 删除旧的基础卡牌（保留用户生成的）
DELETE FROM cards WHERE is_base_card = TRUE;

-- 生存时代 - 钥匙卡
INSERT INTO cards (name, type, rarity, era, card_type, is_base_card, source_type, attrs_json) VALUES
('火', 'key', 'uncommon', '生存时代', 'key', TRUE, 'system_key', '{"description":"解决【寒冷】的关键。人类首次掌握自然力。","event":"寒冷"}'),
('农业', 'key', 'uncommon', '生存时代', 'key', TRUE, 'system_key', '{"description":"解决【饥饿】的关键。稳定的食物生产体系。","event":"饥饿"}'),
('律法', 'key', 'uncommon', '生存时代', 'key', TRUE, 'system_key', '{"description":"解决【纷争】的关键。将规则固化为文字，形成社会契约。","event":"纷争"}');

-- 生存时代 - 灵感卡
INSERT INTO cards (name, type, rarity, era, card_type, is_starter, is_decoy, is_base_card, source_type, attrs_json) VALUES
('人', 'inspiration', 'common', '生存时代', 'inspiration', TRUE, FALSE, TRUE, 'system_starter', '{"description":"文明的主体，一切创造行为的发起者。"}'),
('石头', 'inspiration', 'common', '生存时代', 'inspiration', TRUE, FALSE, TRUE, 'system_starter', '{"description":"最原始的工具材料，代表坚硬与改造。"}'),
('水', 'inspiration', 'common', '生存时代', 'inspiration', FALSE, FALSE, TRUE, 'system', '{"description":"生命之源，用于农业灌溉和维持生命。"}'),
('木头', 'inspiration', 'common', '生存时代', 'inspiration', FALSE, FALSE, TRUE, 'system', '{"description":"重要的燃料与建材。"}'),
('土地', 'inspiration', 'common', '生存时代', 'inspiration', FALSE, FALSE, TRUE, 'system', '{"description":"承载万物，是农业的基础。"}'),
('种子', 'inspiration', 'common', '生存时代', 'inspiration', FALSE, FALSE, TRUE, 'system', '{"description":"希望与潜力，从采集到生产的思维转变。"}'),
('冲突', 'inspiration', 'common', '生存时代', 'inspiration', FALSE, FALSE, TRUE, 'system', '{"description":"抽象概念，代表对立与矛盾，是秩序诞生的催化剂。"}'),
('风', 'inspiration', 'common', '生存时代', 'inspiration', FALSE, TRUE, TRUE, 'system', '{"description":"代表自然的力量。"}');

-- 生存时代 - 奖励卡
INSERT INTO cards (name, type, rarity, era, card_type, unlock_condition, is_base_card, source_type, attrs_json) VALUES
('智慧', 'reward', 'rare', '生存时代', 'reward', '寒冷', TRUE, 'system_reward', '{"description":"第一次思维飞跃。学会用火代表人类开始总结规律。"}'),
('部落', 'reward', 'rare', '生存时代', 'reward', '饥饿', TRUE, 'system_reward', '{"description":"第一次社会结构飞跃。农业使定居成为可能，人口聚集形成社会。"}'),
('价值', 'reward', 'rare', '生存时代', 'reward', '纷争', TRUE, 'system_reward', '{"description":"律法保障了私有财产，使得物品的价值可以被公认和衡量。"}');

-- 城邦时代 - 钥匙卡
INSERT INTO cards (name, type, rarity, era, card_type, is_base_card, source_type, attrs_json) VALUES
('文字', 'key', 'uncommon', '城邦时代', 'key', TRUE, 'system_key', '{"description":"解决【遗忘】的关键。一套成熟的符号系统，用于记录历史、法律和财产，战胜了时间。","event":"遗忘"}'),
('货币', 'key', 'uncommon', '城邦时代', 'key', TRUE, 'system_key', '{"description":"解决【隔绝】的关键。基于价值和财富的交换体系，打破了地理的限制。","event":"隔绝"}'),
('城防', 'key', 'uncommon', '城邦时代', 'key', TRUE, 'system_key', '{"description":"解决【入侵】的关键。利用劳力和新材料构建的防御工事，守护了文明的果实。","event":"入侵"}');

-- 城邦时代 - 灵感卡
INSERT INTO cards (name, type, rarity, era, card_type, is_decoy, is_base_card, source_type, attrs_json) VALUES
('劳力', 'inspiration', 'common', '城邦时代', 'inspiration', FALSE, TRUE, 'system', '{"description":"有组织的劳动。部落发展为城邦后，集中的人口可以进行更大规模的协作。"}'),
('矿石', 'inspiration', 'common', '城邦时代', 'inspiration', FALSE, TRUE, 'system', '{"description":"新的资源。比石头更具可塑性和价值，是制造更高级工具、货币和武器的基础。"}'),
('符号', 'inspiration', 'common', '城邦时代', 'inspiration', FALSE, TRUE, 'system', '{"description":"文字的前身。将抽象的智慧和记忆固化为可见标记，是记录和传承的第一步。"}'),
('信仰', 'inspiration', 'common', '城邦时代', 'inspiration', TRUE, TRUE, 'system', '{"description":"社会凝聚力。虽然能统一思想，但在解决本时代的物质困境时，并非直接的钥匙。"}');

-- 城邦时代 - 奖励卡
INSERT INTO cards (name, type, rarity, era, card_type, unlock_condition, is_base_card, source_type, attrs_json) VALUES
('知识', 'reward', 'rare', '城邦时代', 'reward', '遗忘', TRUE, 'system_reward', '{"description":"系统化的智慧。文字的诞生使经验得以被大规模复制和传承，形成了真正的知识体系。"}'),
('财富', 'reward', 'rare', '城邦时代', 'reward', '隔绝', TRUE, 'system_reward', '{"description":"价值的积累。商业的出现使价值可以被大规模累积和流通，成为驱动社会发展的新动力。"}'),
('权力', 'reward', 'rare', '城邦时代', 'reward', '入侵', TRUE, 'system_reward', '{"description":"集中的控制力。为了组织城防和管理财富，社会必须将决策权集中，形成统治阶级。"}');
`;

async function install() {
  console.log('🚀 开始安装卡牌系统...\n');
  
  try {
    console.log('步骤 1/3: 添加用户生成卡牌支持字段...');
    await pool.query(addFieldsSQL);
    console.log('✅ 字段添加成功\n');
    
    console.log('步骤 2/3: 添加时代相关字段...');
    await pool.query(addEraFieldsSQL);
    console.log('✅ 时代字段添加成功\n');
    
    console.log('步骤 3/3: 插入卡牌数据（生存时代+城邦时代）...');
    await pool.query(insertCardsSQL);
    console.log('✅ 卡牌数据插入成功\n');
    
    // 统计
    const result = await pool.query(`
      SELECT era, card_type, COUNT(*) as count
      FROM cards
      WHERE is_base_card = TRUE
      GROUP BY era, card_type
      ORDER BY era, card_type
    `);
    
    console.log('📊 卡牌统计:');
    console.table(result.rows);
    
    console.log('\n✅ 卡牌系统安装完成！');
    console.log('\n💡 提示: 当前只安装了生存时代和城邦时代的卡牌');
    console.log('   如需完整安装所有时代，请运行完整的迁移脚本\n');
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ 安装失败:', err.message);
    console.error(err);
    await pool.end();
    process.exit(1);
  }
}

install();

