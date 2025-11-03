// 完整卡牌配置
// 包含所有时代的卡牌定义

export const CARD_TYPES = {
  KEY: 'key',           // 钥匙卡（解决困境）
  INSPIRATION: 'inspiration',  // 灵感卡
  REWARD: 'reward',     // 奖励卡（通关解锁）
};

export const CARD_RARITIES = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
  RUBY: 'ruby',  // 钥匙卡专用（红色）
};

// 生存时代卡牌
export const SURVIVAL_ERA_CARDS = {
  // 钥匙卡
  keys: [
    { name: '火', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '生存时代', event: '寒冷', description: '解决【寒冷】的关键。人类首次掌握自然力。' },
    { name: '农业', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '生存时代', event: '饥饿', description: '解决【饥饿】的关键。稳定的食物生产体系。' },
    { name: '律法', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '生存时代', event: '纷争', description: '解决【纷争】的关键。将规则固化为文字，形成社会契约。' },
  ],
  // 初始灵感卡
  initial: [
    { name: '人', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '生存时代', description: '文明的主体，一切创造行为的发起者。', isStarter: true },
    { name: '石头', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '生存时代', description: '最原始的工具材料，代表"坚硬"与"改造"。', isStarter: true },
    { name: '水', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '生存时代', description: '生命之源，用于农业灌溉和维持生命。' },
    { name: '木头', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '生存时代', description: '重要的燃料与建材。' },
    { name: '土地', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '生存时代', description: '承载万物，是农业的基础。' },
    { name: '种子', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '生存时代', description: '希望与潜力，从采集到生产的思维转变。' },
    { name: '冲突', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '生存时代', description: '抽象概念，代表对立与矛盾，是秩序诞生的催化剂。' },
    { name: '风', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '生存时代', description: '代表自然的力量。', isDecoy: true },
  ],
  // 解锁灵感卡（通关奖励）
  rewards: [
    { name: '智慧', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.RARE, era: '生存时代', unlockEvent: '寒冷', description: '第一次思维飞跃。学会用火代表人类开始总结规律。' },
    { name: '部落', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.RARE, era: '生存时代', unlockEvent: '饥饿', description: '第一次社会结构飞跃。农业使定居成为可能，人口聚集形成社会。' },
    { name: '价值', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.RARE, era: '生存时代', unlockEvent: '纷争', description: '律法保障了私有财产，使得物品的"价值"可以被公认和衡量。' },
  ],
};

// 城邦时代卡牌
export const CITYSTATE_ERA_CARDS = {
  keys: [
    { name: '文字', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '城邦时代', event: '遗忘', description: '解决【遗忘】的关键。一套成熟的符号系统，用于记录历史、法律和财产，战胜了时间。' },
    { name: '货币', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '城邦时代', event: '隔绝', description: '解决【隔绝】的关键。基于【价值】和【财富】的交换体系，打破了地理的限制。' },
    { name: '城防', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '城邦时代', event: '入侵', description: '解决【入侵】的关键。利用【劳力】和新材料（矿石）构建的防御工事，守护了文明的果实。' },
  ],
  initial: [
    { name: '劳力', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '城邦时代', description: '有组织的劳动。【部落】发展为【城邦】后，集中的人口可以进行更大规模的协作。' },
    { name: '矿石', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '城邦时代', description: '新的资源。比【石头】更具可塑性和价值，是制造更高级工具、货币和武器的基础。' },
    { name: '符号', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '城邦时代', description: '文字的前身。将抽象的【智慧】和【记忆】固化为可见标记，是记录和传承的第一步。' },
    { name: '信仰', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '城邦时代', description: '社会凝聚力。虽然能统一思想，但在解决本时代的物质困境时，并非直接的"钥匙"。', isDecoy: true },
  ],
  rewards: [
    { name: '知识', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.RARE, era: '城邦时代', unlockEvent: '遗忘', description: '系统化的智慧。文字的诞生使经验得以被大规模复制和传承，形成了真正的"知识体系"。' },
    { name: '财富', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.RARE, era: '城邦时代', unlockEvent: '隔绝', description: '价值的积累。商业的出现使【价值】可以被大规模累积和流通，成为驱动社会发展的新动力。' },
    { name: '权力', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.RARE, era: '城邦时代', unlockEvent: '入侵', description: '集中的控制力。为了组织【城防】和管理【财富】，社会必须将决策权集中，形成统治阶级。' },
  ],
};

// 分野时代卡牌
export const DIVERGENCE_ERA_CARDS = {
  keys: [
    { name: '官僚体系', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '分野时代', event: '方向的迷惘', description: '解决【方向的迷惘】的关键（秩序路线）。建立系统化的管理架构。', branch: 'order' },
    { name: '宗教', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '分野时代', event: '方向的迷惘', description: '解决【方向的迷惘】的关键（信仰路线）。建立精神信仰体系。', branch: 'faith' },
  ],
  initial: [
    { name: '秩序', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '分野时代', description: '规范与系统。建立井然有序的社会结构。' },
    { name: '虔诚', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '分野时代', description: '对信仰的执着与追求。' },
    { name: '仪式', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '分野时代', description: '神圣的程序与规则。' },
    { name: '等级', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '分野时代', description: '社会阶层的划分。' },
    { name: '欲望', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '分野时代', description: '人类的追求与野心。', isDecoy: true },
  ],
  rewards: [
    { name: '统治', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.EPIC, era: '分野时代', unlockBranch: 'order', description: '系统化的权力管理。解锁帝国时代。' },
    { name: '神权', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.EPIC, era: '分野时代', unlockBranch: 'faith', description: '神圣的权威。解锁信仰时代。' },
  ],
};

// 帝国时代卡牌
export const EMPIRE_ERA_CARDS = {
  keys: [
    { name: '道路', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '帝国时代', event: '广袤的疆域', description: '解决【广袤的疆域】的关键。连接帝国的血脉。' },
    { name: '史诗', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '帝国时代', event: '涣散的人心', description: '解决【涣散的人心】的关键。凝聚民族认同的传说。' },
    { name: '远洋航行', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '帝国时代', event: '无尽的欲望', description: '解决【无尽的欲望】的关键。探索未知的世界。' },
  ],
  initial: [
    { name: '军团', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '帝国时代', description: '有组织的军事力量。' },
    { name: '工程', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '帝国时代', description: '大规模的建设能力。' },
    { name: '疆域', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '帝国时代', description: '广阔的领土范围。' },
    { name: '征服', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '帝国时代', description: '扩张的野心与行动。' },
    { name: '荣耀', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '帝国时代', description: '帝国的威望与荣誉。' },
    { name: '和平', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '帝国时代', description: '暂时的稳定与安宁。', isDecoy: true },
  ],
  rewards: [
    { name: '秩序', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.RARE, era: '帝国时代', unlockEvent: '广袤的疆域', description: '帝国的统一管理。' },
    { name: '认同', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.RARE, era: '帝国时代', unlockEvent: '涣散的人心', description: '民族意识的觉醒。' },
    { name: '探索', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.RARE, era: '帝国时代', unlockEvent: '无尽的欲望', description: '对未知世界的追求。' },
  ],
};

// 理性时代卡牌
export const REASON_ERA_CARDS = {
  keys: [
    { name: '印刷术', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '理性时代', event: '知识的囚笼', description: '解决【知识的囚笼】的关键。使知识能够大规模传播。' },
    { name: '启蒙思想', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '理性时代', event: '帝国的黄昏', description: '解决【帝国的黄昏】的关键。新的社会理念。' },
    { name: '蒸汽机', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '理性时代', event: '停滞的生产', description: '解决【停滞的生产】的关键。工业革命的开端。' },
  ],
  initial: [
    { name: '技艺', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '理性时代', description: '精湛的工艺技术。' },
    { name: '机械', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '理性时代', description: '复杂的机器装置。' },
    { name: '理性', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '理性时代', description: '逻辑思维的力量。' },
    { name: '观察', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '理性时代', description: '仔细研究的方法。' },
    { name: '传统', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '理性时代', description: '旧有的习惯与规范。', isDecoy: true },
  ],
  rewards: [
    { name: '传播', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.RARE, era: '理性时代', unlockEvent: '知识的囚笼', description: '信息的广泛流通。' },
    { name: '平等', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.RARE, era: '理性时代', unlockEvent: '帝国的黄昏', description: '打破等级的理念。' },
    { name: '效率', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.RARE, era: '理性时代', unlockEvent: '停滞的生产', description: '生产力的革命性提升。' },
  ],
};

// 信仰时代卡牌
export const FAITH_ERA_CARDS = {
  keys: [
    { name: '圣典', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '信仰时代', event: '精神的虚空', description: '解决【精神的虚空】的关键。记录神意的唯一真理。' },
    { name: '艺术', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '信仰时代', event: '理念的传播', description: '解决【理念的传播】的关键。让信众感受神的光辉。' },
    { name: '教权', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '信仰时代', event: '异端的挑战', description: '解决【异端的挑战】的关键。定义唯一的"正确"。' },
  ],
  initial: [
    { name: '经文', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '信仰时代', description: '神圣的文字记录。' },
    { name: '圣物', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '信仰时代', description: '承载神力的物品。' },
    { name: '布道', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '信仰时代', description: '传播神的教诲。' },
    { name: '神迹', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '信仰时代', description: '超自然的显现。' },
    { name: '怀疑', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '信仰时代', description: '对信仰的质疑。', isDecoy: true },
  ],
  rewards: [
    { name: '正统', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.RARE, era: '信仰时代', unlockEvent: '精神的虚空', description: '统一的教义体系。' },
    { name: '感召', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.RARE, era: '信仰时代', unlockEvent: '理念的传播', description: '精神的感化力量。' },
    { name: '裁决', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.RARE, era: '信仰时代', unlockEvent: '异端的挑战', description: '判定正邪的权力。' },
  ],
};

// 启蒙时代卡牌
export const ENLIGHTENMENT_ERA_CARDS = {
  keys: [
    { name: '科学方法', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '启蒙时代', event: '蒙昧的阴影', description: '解决【蒙昧的阴影】的关键。照亮未知的光。' },
    { name: '人权宣言', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '启蒙时代', event: '神权的枷锁', description: '解决【神权的枷锁】的关键。凡人决定自己的命运。' },
    { name: '电力', type: CARD_TYPES.KEY, rarity: CARD_RARITIES.RUBY, era: '启蒙时代', event: '自然的伟力', description: '解决【自然的伟力】的关键。驾驭雷霆的力量。' },
  ],
  initial: [
    { name: '实验', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.UNCOMMON, era: '启蒙时代', description: '通过试验验证真理。' },
    { name: '逻辑', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.UNCOMMON, era: '启蒙时代', description: '严密的推理方法。' },
    { name: '自然法则', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.UNCOMMON, era: '启蒙时代', description: '宇宙运行的规律。' },
    { name: '自由', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.UNCOMMON, era: '启蒙时代', description: '个体的独立与解放。' },
    { name: '革命', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.UNCOMMON, era: '启蒙时代', description: '推翻旧秩序的力量。' },
    { name: '秩序', type: CARD_TYPES.INSPIRATION, rarity: CARD_RARITIES.COMMON, era: '启蒙时代', description: '稳定的社会结构。', isDecoy: true },
  ],
  rewards: [
    { name: '真理', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.EPIC, era: '启蒙时代', unlockEvent: '蒙昧的阴影', description: '科学揭示的客观规律。' },
    { name: '民主', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.EPIC, era: '启蒙时代', unlockEvent: '神权的枷锁', description: '人民的统治。' },
    { name: '能量', type: CARD_TYPES.REWARD, rarity: CARD_RARITIES.EPIC, era: '启蒙时代', unlockEvent: '自然的伟力', description: '可控制的自然力量。' },
  ],
};

// 导出所有卡牌配置
export const ALL_CARDS = [
  ...SURVIVAL_ERA_CARDS.keys,
  ...SURVIVAL_ERA_CARDS.initial,
  ...SURVIVAL_ERA_CARDS.rewards,
  ...CITYSTATE_ERA_CARDS.keys,
  ...CITYSTATE_ERA_CARDS.initial,
  ...CITYSTATE_ERA_CARDS.rewards,
  ...DIVERGENCE_ERA_CARDS.keys,
  ...DIVERGENCE_ERA_CARDS.initial,
  ...DIVERGENCE_ERA_CARDS.rewards,
  ...EMPIRE_ERA_CARDS.keys,
  ...EMPIRE_ERA_CARDS.initial,
  ...EMPIRE_ERA_CARDS.rewards,
  ...REASON_ERA_CARDS.keys,
  ...REASON_ERA_CARDS.initial,
  ...REASON_ERA_CARDS.rewards,
  ...FAITH_ERA_CARDS.keys,
  ...FAITH_ERA_CARDS.initial,
  ...FAITH_ERA_CARDS.rewards,
  ...ENLIGHTENMENT_ERA_CARDS.keys,
  ...ENLIGHTENMENT_ERA_CARDS.initial,
  ...ENLIGHTENMENT_ERA_CARDS.rewards,
];

// 按时代获取卡牌
export function getCardsByEra(eraName) {
  const eraMap = {
    '生存时代': SURVIVAL_ERA_CARDS,
    '城邦时代': CITYSTATE_ERA_CARDS,
    '分野时代': DIVERGENCE_ERA_CARDS,
    '帝国时代': EMPIRE_ERA_CARDS,
    '理性时代': REASON_ERA_CARDS,
    '信仰时代': FAITH_ERA_CARDS,
    '启蒙时代': ENLIGHTENMENT_ERA_CARDS,
  };
  return eraMap[eraName] || null;
}

// 获取初始手牌（游戏开始时）
export function getStarterCards() {
  return ALL_CARDS.filter(card => card.isStarter === true);
}

// 获取时代初始卡牌（进入该时代时可用）
export function getEraInitialCards(eraName) {
  const eraCards = getCardsByEra(eraName);
  if (!eraCards) return [];
  return [...eraCards.initial];
}

// 获取钥匙卡
export function getEraKeyCards(eraName) {
  const eraCards = getCardsByEra(eraName);
  if (!eraCards) return [];
  return [...eraCards.keys];
}

// 根据卡牌名称查找卡牌
export function findCardByName(name) {
  return ALL_CARDS.find(card => card.name === name);
}

// 检查是否为迷惑卡
export function isDecoyCard(name) {
  const card = findCardByName(name);
  return card?.isDecoy === true;
}

