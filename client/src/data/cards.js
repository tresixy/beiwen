const CARD_TYPES = ['思想碎片', '虚构原矿', '文明记忆', '元素谱系', '星涌回响', '秘术符码'];
const CARD_TAGS = ['哲学', '原型', '神秘', '工艺', '生态', '灵感'];

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const RARITY_WEIGHTS = [0.38, 0.28, 0.2, 0.1, 0.04];

// 生存时代初始卡牌（游戏开始时发放）
const STARTER_CARDS = [
    { name: '人', type: 'inspiration', rarity: 'common', era: '生存时代' },
    { name: '石头', type: 'inspiration', rarity: 'common', era: '生存时代' },
];

// 生存时代基础卡牌池
const SURVIVAL_ERA_CARDS = [
    { name: '水', type: 'inspiration', rarity: 'common', era: '生存时代' },
    { name: '木头', type: 'inspiration', rarity: 'common', era: '生存时代' },
    { name: '土地', type: 'inspiration', rarity: 'common', era: '生存时代' },
    { name: '种子', type: 'inspiration', rarity: 'common', era: '生存时代' },
    { name: '冲突', type: 'inspiration', rarity: 'common', era: '生存时代' },
    { name: '风', type: 'inspiration', rarity: 'common', era: '生存时代' },
];

// 兼容旧代码的基础元素定义
const BASIC_ELEMENTS = [
    ...STARTER_CARDS,
    ...SURVIVAL_ERA_CARDS,
];

let cardIdCursor = 0;

const randomItem = (list) => list[Math.floor(Math.random() * list.length)];

const randomRarity = () => {
    const roll = Math.random();
    let accumulator = 0;
    for (let index = 0; index < RARITY_WEIGHTS.length; index += 1) {
        accumulator += RARITY_WEIGHTS[index];
        if (roll <= accumulator) {
            return RARITIES[index];
        }
    }
    return RARITIES.at(-1);
};

export const FORGE_LOADING_MESSAGES = [
    '唤醒熔炉核心…',
    '收集元素记忆…',
    '调谐能量脉络…',
    '等待灵感汇聚…',
];

export function createCard(overrides = {}) {
    const rarity = overrides.rarity || randomRarity();
    const type = overrides.type || randomItem(CARD_TYPES);
    const tag = randomItem(CARD_TAGS);
    const id = overrides.id ?? `card-${cardIdCursor += 1}`;

    return {
        id,
        name: overrides.name || `${tag}·${type}`,
        type: overrides.type || type,
        rarity,
    };
}

export function createInitialHand(size = 5) {
    // 新卡牌系统：从生存时代卡牌中选择初始手牌
    const selected = [];
    
    // 先加入2张起始卡（人、石头）
    STARTER_CARDS.forEach(card => {
        selected.push({
            ...card,
            id: `card-${cardIdCursor += 1}`,
        });
    });
    
    // 从生存时代卡牌池中随机选择剩余卡牌
    const poolCopy = [...SURVIVAL_ERA_CARDS];
    while (selected.length < size && poolCopy.length > 0) {
        const randomIndex = Math.floor(Math.random() * poolCopy.length);
        const card = poolCopy.splice(randomIndex, 1)[0];
        selected.push({
            ...card,
            id: `card-${cardIdCursor += 1}`,
        });
    }
    
    return selected.slice(0, size);
}

export function upgradeRarity(cards) {
    const maxIndex = cards.reduce((max, card) => {
        const index = RARITIES.indexOf(card.rarity);
        return index > max ? index : max;
    }, 0);

    const bonus = cards.length >= 3 ? 1 : 0;
    const target = Math.min(maxIndex + bonus, RARITIES.length - 1);
    return RARITIES[target];
}

export function forgeCards(selectedCards, name) {
    if (!Array.isArray(selectedCards) || selectedCards.length < 2) {
        throw new Error('熔炉需要至少两张卡牌');
    }

    const rarity = upgradeRarity(selectedCards);
    return createCard({ rarity, name });
}

// 根据时代获取卡牌池
export function getCardsByEra(eraName) {
    // TODO: 实现从服务器获取时代卡牌
    // 目前返回基础卡牌作为默认
    return BASIC_ELEMENTS;
}

// 获取起始卡牌
export function getStarterCards() {
    return STARTER_CARDS.map(card => ({
        ...card,
        id: `card-${cardIdCursor += 1}`,
    }));
}

