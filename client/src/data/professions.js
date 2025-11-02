const PROFESSION_LIBRARY = [
    {
        name: '光谱演算师',
        focus: ['研究', '灵感'],
        description: '善于追踪元素谱系，将灵感映射为可重复的法则。',
        bonus: '研究资源获取 +2，合成时更易出现稀有灵感。',
    },
    {
        name: '契约抄写师',
        focus: ['文明', '秩序'],
        description: '擅长解析社会契约与文明进程，维持熔炉稳定。',
        bonus: '结束回合时稳定生产资源，并有概率触发契约事件。',
    },
    {
        name: '原型雕刻家',
        focus: ['工艺', '原型'],
        description: '以象限几何重构原型，打造兼具美学与功效的造物。',
        bonus: '合成成功率提高，生成卡牌自带额外特性。',
    },
    {
        name: '星象译码员',
        focus: ['星涌', '神秘'],
        description: '通过星象与因果推演，预测下一轮资源涨落。',
        bonus: '每回合结束时可预知并微调资源变化。',
    },
    {
        name: '回声采集者',
        focus: ['灵感', '生态'],
        description: '采集文明回声，让遗忘的故事重新影响世界。',
        bonus: '抽牌额外 +1，并随机刷新一张传说卡概率。',
    },
    {
        name: '熔炉守夜人',
        focus: ['守护', '秩序'],
        description: '守护熔炉运作节奏，确保所有实验都在容许范围内。',
        bonus: '合成失败概率显著下降，熔炉冷却时间缩短。',
    },
];

const shuffle = (list) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

export function generateProfessionChoices(count = 3) {
    return shuffle(PROFESSION_LIBRARY).slice(0, count);
}

export function createProfessionState() {
    return {
        active: null,
        pendingChoices: generateProfessionChoices(),
        carryOver: true,
    };
}







