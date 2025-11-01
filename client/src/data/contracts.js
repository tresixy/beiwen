const CONTRACT_TEMPLATES = [
    {
        name: '星链互惠契约',
        description: '通过星链互惠网络交换资源，强化文明共鸣。',
        choices: [
            {
                text: '分享研究情报，换取生产支援',
                effects: { research: -2, production: +4 },
            },
            {
                text: '维持资源平衡，稳态推进',
                effects: { food: +2, production: +2 },
            },
        ],
    },
    {
        name: '月潮协定',
        description: '跟随月潮节律调配资源，换取短期产能爆发。',
        choices: [
            {
                text: '献出贮备粮食，换取灵感泉涌',
                effects: { food: -3, research: +5 },
            },
            {
                text: '保持现状，稳住当下局面',
                effects: { food: +1, production: +1 },
            },
        ],
    },
    {
        name: '虚空同盟契约',
        description: '与虚空同盟签署互信协议，获得未知增益。',
        choices: [
            {
                text: '承担风险，换取强力支援',
                effects: { production: +5, research: -1 },
            },
            {
                text: '拒绝条款，坚持自主',
                effects: { food: +2 },
            },
        ],
    },
];

let contractCursor = 0;

const wrapEffects = (effects) => {
    const result = { food: 0, production: 0, research: 0 };
    Object.entries(effects).forEach(([key, value]) => {
        result[key] = value;
    });
    return result;
};

export function createContract() {
    const template = CONTRACT_TEMPLATES[contractCursor % CONTRACT_TEMPLATES.length];
    contractCursor += 1;

    return {
        id: `contract-${contractCursor}`,
        name: template.name,
        description: template.description,
        choices: template.choices.map((choice, index) => ({
            id: `choice-${index}`,
            text: choice.text,
            effects: wrapEffects(choice.effects),
        })),
    };
}




