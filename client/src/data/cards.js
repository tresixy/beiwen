const CARD_TYPES = ['思想碎片', '虚构原矿', '文明记忆', '元素谱系', '星涌回响', '秘术符码'];
const CARD_TAGS = ['哲学', '原型', '神秘', '工艺', '生态', '灵感'];

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const RARITY_WEIGHTS = [0.38, 0.28, 0.2, 0.1, 0.04];

// ============================================
// 已废弃：前端硬编码的卡牌数据
// 所有卡牌数据现在从数据库加载
// ============================================

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

// 已废弃：不再使用前端创建初始手牌
// 所有手牌从服务器通过 /api/deck/draw 获取
export function createInitialHand(size = 5) {
    console.error('createInitialHand 已废弃，请使用服务器 API: /api/deck/draw');
    return [];
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

// 已废弃：不再使用前端获取卡牌池
// 所有卡牌数据从服务器 API 获取
export function getCardsByEra(eraName) {
    console.error('getCardsByEra 已废弃，请使用服务器 API: /api/cards/era/' + eraName);
    return [];
}

// 已废弃：不再使用前端获取起始卡牌
// 用户卡牌从 /api/deck/state 获取
export function getStarterCards() {
    console.error('getStarterCards 已废弃，请使用服务器 API: /api/deck/state');
    return [];
}

