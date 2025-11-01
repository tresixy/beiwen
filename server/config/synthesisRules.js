// 时代卡牌合成规则
// 定义各时代关键卡牌的合成配方

// 生存时代合成规则
export const SURVIVAL_ERA_RECIPES = [
  // 钥匙卡合成
  {
    inputs: ['木头', '石头'],
    output: { name: '火', tier: 2, attrs: { element: 'fire', keyCard: true, solves: '寒冷' } }
  },
  {
    inputs: ['种子', '土地'],
    output: { name: '农业', tier: 2, attrs: { production: true, keyCard: true, solves: '饥饿' } }
  },
  {
    inputs: ['种子', '水'],
    output: { name: '农业', tier: 2, attrs: { production: true, keyCard: true, solves: '饥饿' } }
  },
  {
    inputs: ['冲突', '智慧'],
    output: { name: '律法', tier: 2, attrs: { social: true, keyCard: true, solves: '纷争' } }
  },
  // 辅助合成
  {
    inputs: ['人', '石头'],
    output: { name: '工具', tier: 1, attrs: { tool: true } }
  },
  {
    inputs: ['火', '木头'],
    output: { name: '篝火', tier: 2, attrs: { warmth: true, light: true } }
  },
];

// 城邦时代合成规则
export const CITYSTATE_ERA_RECIPES = [
  // 钥匙卡合成
  {
    inputs: ['符号', '知识'],
    output: { name: '文字', tier: 3, attrs: { communication: true, keyCard: true, solves: '遗忘' } }
  },
  {
    inputs: ['符号', '智慧'],
    output: { name: '文字', tier: 3, attrs: { communication: true, keyCard: true, solves: '遗忘' } }
  },
  {
    inputs: ['矿石', '价值'],
    output: { name: '货币', tier: 3, attrs: { trade: true, keyCard: true, solves: '隔绝' } }
  },
  {
    inputs: ['财富', '价值'],
    output: { name: '货币', tier: 3, attrs: { trade: true, keyCard: true, solves: '隔绝' } }
  },
  {
    inputs: ['劳力', '矿石'],
    output: { name: '城防', tier: 3, attrs: { defense: true, keyCard: true, solves: '入侵' } }
  },
  {
    inputs: ['劳力', '石头'],
    output: { name: '城防', tier: 3, attrs: { defense: true, keyCard: true, solves: '入侵' } }
  },
  // 辅助合成
  {
    inputs: ['部落', '劳力'],
    output: { name: '城邦', tier: 3, attrs: { settlement: true } }
  },
  {
    inputs: ['矿石', '火'],
    output: { name: '青铜', tier: 3, attrs: { material: 'metal' } }
  },
];

// 分野时代合成规则
export const DIVERGENCE_ERA_RECIPES = [
  // 钥匙卡合成（分支）
  {
    inputs: ['秩序', '权力'],
    output: { name: '官僚体系', tier: 4, attrs: { governance: true, keyCard: true, solves: '方向的迷惘', branch: 'order' } }
  },
  {
    inputs: ['等级', '权力'],
    output: { name: '官僚体系', tier: 4, attrs: { governance: true, keyCard: true, solves: '方向的迷惘', branch: 'order' } }
  },
  {
    inputs: ['虔诚', '信仰'],
    output: { name: '宗教', tier: 4, attrs: { spiritual: true, keyCard: true, solves: '方向的迷惘', branch: 'faith' } }
  },
  {
    inputs: ['仪式', '信仰'],
    output: { name: '宗教', tier: 4, attrs: { spiritual: true, keyCard: true, solves: '方向的迷惘', branch: 'faith' } }
  },
];

// 帝国时代合成规则
export const EMPIRE_ERA_RECIPES = [
  // 钥匙卡合成
  {
    inputs: ['工程', '疆域'],
    output: { name: '道路', tier: 5, attrs: { infrastructure: true, keyCard: true, solves: '广袤的疆域' } }
  },
  {
    inputs: ['工程', '统治'],
    output: { name: '道路', tier: 5, attrs: { infrastructure: true, keyCard: true, solves: '广袤的疆域' } }
  },
  {
    inputs: ['荣耀', '征服'],
    output: { name: '史诗', tier: 5, attrs: { culture: true, keyCard: true, solves: '涣散的人心' } }
  },
  {
    inputs: ['荣耀', '知识'],
    output: { name: '史诗', tier: 5, attrs: { culture: true, keyCard: true, solves: '涣散的人心' } }
  },
  {
    inputs: ['探索', '工程'],
    output: { name: '远洋航行', tier: 5, attrs: { exploration: true, keyCard: true, solves: '无尽的欲望' } }
  },
  {
    inputs: ['疆域', '财富'],
    output: { name: '远洋航行', tier: 5, attrs: { exploration: true, keyCard: true, solves: '无尽的欲望' } }
  },
  // 辅助合成
  {
    inputs: ['军团', '道路'],
    output: { name: '罗马军团', tier: 6, attrs: { military: true, elite: true } }
  },
];

// 理性时代合成规则
export const REASON_ERA_RECIPES = [
  // 钥匙卡合成
  {
    inputs: ['技艺', '机械'],
    output: { name: '印刷术', tier: 6, attrs: { technology: true, keyCard: true, solves: '知识的囚笼' } }
  },
  {
    inputs: ['传播', '技艺'],
    output: { name: '印刷术', tier: 6, attrs: { technology: true, keyCard: true, solves: '知识的囚笼' } }
  },
  {
    inputs: ['理性', '平等'],
    output: { name: '启蒙思想', tier: 6, attrs: { philosophy: true, keyCard: true, solves: '帝国的黄昏' } }
  },
  {
    inputs: ['知识', '平等'],
    output: { name: '启蒙思想', tier: 6, attrs: { philosophy: true, keyCard: true, solves: '帝国的黄昏' } }
  },
  {
    inputs: ['机械', '效率'],
    output: { name: '蒸汽机', tier: 6, attrs: { technology: true, power: 10, keyCard: true, solves: '停滞的生产' } }
  },
  {
    inputs: ['火', '机械'],
    output: { name: '蒸汽机', tier: 6, attrs: { technology: true, power: 10, keyCard: true, solves: '停滞的生产' } }
  },
  // 辅助合成
  {
    inputs: ['观察', '理性'],
    output: { name: '科学', tier: 5, attrs: { knowledge: true } }
  },
];

// 信仰时代合成规则
export const FAITH_ERA_RECIPES = [
  // 钥匙卡合成
  {
    inputs: ['经文', '神权'],
    output: { name: '圣典', tier: 6, attrs: { religious: true, keyCard: true, solves: '精神的虚空' } }
  },
  {
    inputs: ['虔诚', '文字'],
    output: { name: '圣典', tier: 6, attrs: { religious: true, keyCard: true, solves: '精神的虚空' } }
  },
  {
    inputs: ['布道', '感召'],
    output: { name: '艺术', tier: 6, attrs: { culture: true, keyCard: true, solves: '理念的传播' } }
  },
  {
    inputs: ['圣物', '感召'],
    output: { name: '艺术', tier: 6, attrs: { culture: true, keyCard: true, solves: '理念的传播' } }
  },
  {
    inputs: ['神权', '裁决'],
    output: { name: '教权', tier: 6, attrs: { authority: true, keyCard: true, solves: '异端的挑战' } }
  },
  {
    inputs: ['正统', '权力'],
    output: { name: '教权', tier: 6, attrs: { authority: true, keyCard: true, solves: '异端的挑战' } }
  },
  // 辅助合成
  {
    inputs: ['仪式', '圣物'],
    output: { name: '圣礼', tier: 5, attrs: { religious: true, ritual: true } }
  },
];

// 启蒙时代合成规则
export const ENLIGHTENMENT_ERA_RECIPES = [
  // 钥匙卡合成
  {
    inputs: ['实验', '逻辑'],
    output: { name: '科学方法', tier: 8, attrs: { science: true, keyCard: true, solves: '蒙昧的阴影' } }
  },
  {
    inputs: ['观察', '逻辑'],
    output: { name: '科学方法', tier: 8, attrs: { science: true, keyCard: true, solves: '蒙昧的阴影' } }
  },
  {
    inputs: ['自由', '平等'],
    output: { name: '人权宣言', tier: 8, attrs: { politics: true, keyCard: true, solves: '神权的枷锁' } }
  },
  {
    inputs: ['革命', '平等'],
    output: { name: '人权宣言', tier: 8, attrs: { politics: true, keyCard: true, solves: '神权的枷锁' } }
  },
  {
    inputs: ['自然法则', '实验'],
    output: { name: '电力', tier: 8, attrs: { technology: true, power: 20, keyCard: true, solves: '自然的伟力' } }
  },
  {
    inputs: ['能量', '实验'],
    output: { name: '电力', tier: 8, attrs: { technology: true, power: 20, keyCard: true, solves: '自然的伟力' } }
  },
  // 辅助合成
  {
    inputs: ['真理', '传播'],
    output: { name: '百科全书', tier: 7, attrs: { knowledge: true, comprehensive: true } }
  },
  {
    inputs: ['电力', '机械'],
    output: { name: '电动机', tier: 8, attrs: { technology: true, power: 15 } }
  },
];

// 合并所有规则
export const ALL_SYNTHESIS_RULES = [
  ...SURVIVAL_ERA_RECIPES,
  ...CITYSTATE_ERA_RECIPES,
  ...DIVERGENCE_ERA_RECIPES,
  ...EMPIRE_ERA_RECIPES,
  ...REASON_ERA_RECIPES,
  ...FAITH_ERA_RECIPES,
  ...ENLIGHTENMENT_ERA_RECIPES,
];

// 根据时代获取规则
export function getRecipesByEra(eraName) {
  const eraMap = {
    '生存时代': SURVIVAL_ERA_RECIPES,
    '城邦时代': CITYSTATE_ERA_RECIPES,
    '分野时代': DIVERGENCE_ERA_RECIPES,
    '帝国时代': EMPIRE_ERA_RECIPES,
    '理性时代': REASON_ERA_RECIPES,
    '信仰时代': FAITH_ERA_RECIPES,
    '启蒙时代': ENLIGHTENMENT_ERA_RECIPES,
  };
  return eraMap[eraName] || [];
}

// 查找合成规则（兼容原有customRules接口）
export function findSynthesisRule(inputNames) {
  const sortedInputs = inputNames.slice().sort();
  
  for (const rule of ALL_SYNTHESIS_RULES) {
    const ruleInputs = rule.inputs.slice().sort();
    if (sortedInputs.length === ruleInputs.length &&
        sortedInputs.every((name, idx) => name === ruleInputs[idx])) {
      return rule.output;
    }
  }
  
  return null;
}

