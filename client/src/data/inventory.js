const BASE_ITEMS = [
    {
        id: 'ember-heart',
        name: '余烬之心',
        rarity: 'epic',
        quantity: 1,
        description: '在每次回合结算时，额外获得 +1 研究。',
        icon: '🔥',
    },
    {
        id: 'luna-weave',
        name: '月织丝囊',
        rarity: 'rare',
        quantity: 2,
        description: '可在熔炉中替代任意一张稀有卡。',
        icon: '🌙',
    },
    {
        id: 'echo-seed',
        name: '回声种子',
        rarity: 'uncommon',
        quantity: 5,
        description: '播种后，使相邻地块在下个回合获得 +1 食粮。',
        icon: '🌱',
    },
];

export function createInitialInventory() {
    return BASE_ITEMS.map((item) => ({ ...item }));
}

export function forgeResultToInventoryItem(card) {
    return {
        id: `${card.id}-relic`,
        name: `${card.name} 结晶`,
        rarity: card.rarity,
        quantity: 1,
        description: '由思想熔炉凝结出的独特结晶，可在未来开放功能中使用。',
        icon: '💎',
    };
}








