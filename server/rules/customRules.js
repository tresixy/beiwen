// 自定义合成规则（覆盖AI）
// 规则格式：{ inputs: [name1, name2], output: {name, tier, attrs} }

export const customRules = [
  {
    inputs: ['火焰', '水流'],
    output: {
      name: '蒸汽',
      tier: 2,
      attrs: { power: 2, element: 'steam', temp: 'hot' }
    }
  },
  {
    inputs: ['泥土', '水流'],
    output: {
      name: '泥浆',
      tier: 2,
      attrs: { element: 'mud', sticky: true }
    }
  },
  {
    inputs: ['火焰', '泥土'],
    output: {
      name: '陶器',
      tier: 2,
      attrs: { durability: 2, material: 'ceramic' }
    }
  },
  {
    inputs: ['石头', '火焰'],
    output: {
      name: '熔炉',
      tier: 3,
      attrs: { building: true, production: 2 }
    }
  },
  {
    inputs: ['木材', '石头'],
    output: {
      name: '斧头',
      tier: 2,
      attrs: { tool: true, power: 2 }
    }
  },
  {
    inputs: ['金属', '火焰'],
    output: {
      name: '钢铁',
      tier: 3,
      attrs: { durability: 5, material: 'steel' }
    }
  },
  {
    inputs: ['能量', '金属'],
    output: {
      name: '机器',
      tier: 4,
      attrs: { building: true, production: 5, automated: true }
    }
  },
];

export function findCustomRule(inputNames) {
  const sortedInputs = inputNames.slice().sort();
  
  for (const rule of customRules) {
    const sortedRuleInputs = rule.inputs.slice().sort();
    if (JSON.stringify(sortedInputs) === JSON.stringify(sortedRuleInputs)) {
      return rule.output;
    }
  }
  
  return null;
}

