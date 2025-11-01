const CARD_TYPES = ['思想碎片', '虚构原矿', '文明记忆', '元素谱系', '星涌回响', '秘术符码'];
const CARD_TAGS = ['哲学', '原型', '神秘', '工艺', '生态', '灵感'];

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const RARITY_WEIGHTS = [0.38, 0.28, 0.2, 0.1, 0.04];

// 基础元素卡牌
const BASIC_ELEMENTS = [
    { name: '金', type: '元素', rarity: 'common' },
    { name: '木', type: '元素', rarity: 'common' },
    { name: '水', type: '元素', rarity: 'common' },
    { name: '火', type: '元素', rarity: 'common' },
    { name: '土', type: '元素', rarity: 'common' },
    { name: '冲突', type: '概念', rarity: 'common' },
    { name: '人', type: '生命', rarity: 'common' },
    { name: '石头', type: '物质', rarity: 'common' },
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
    // 从基础元素中随机选择，确保至少有金木水火土中的几个
    const elementPool = [...BASIC_ELEMENTS];
    const selected = [];
    
    // 至少选择3个基础元素
    const coreElements = ['金', '木', '水', '火', '土'].slice(0, Math.min(3, size));
    coreElements.forEach(name => {
        const element = elementPool.find(e => e.name === name);
        if (element) {
            selected.push({
                ...element,
                id: `card-${cardIdCursor += 1}`,
            });
        }
    });
    
    // 剩余的从所有基础元素中随机选择
    while (selected.length < size) {
        const randomElement = elementPool[Math.floor(Math.random() * elementPool.length)];
        selected.push({
            ...randomElement,
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

