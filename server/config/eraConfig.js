// 时代配置
export const ERAS = [
  { name: '生存时代', order: 1, description: '人类文明的萌芽期，为生存而奋斗' },
  { name: '城邦时代', order: 2, description: '人类开始建立稳定的定居点和社会组织' },
  { name: '分野时代', order: 3, description: '文明面临方向性的选择' },
  { name: '帝国时代', order: 4, description: '文明扩张至广袤的疆域' },
  { name: '理性时代', order: 5, description: '理性与科学的兴起' },
  { name: '信仰时代', order: 6, description: '精神信仰的体系化' },
  { name: '启蒙时代', order: 7, description: '人类文明的觉醒与突破' },
];

// 获取时代顺序
export function getEraOrder(eraName) {
  const era = ERAS.find(e => e.name === eraName);
  return era ? era.order : 0;
}

// 检查时代是否已解锁
export function canAccessEra(currentEra, targetEra) {
  return getEraOrder(currentEra) >= getEraOrder(targetEra);
}

// 科技层级定义（根据时代限制可合成的物品）
export const TECH_TIERS = {
  '生存时代': {
    maxTier: 2,
    allowedConcepts: ['火', '工具', '食物', '庇护所', '简单工具', '采集', '狩猎'],
    forbiddenConcepts: ['电力', '机器', '核能', '火药', '钢铁', '引擎', '科技', '机械', '金属冶炼'],
  },
  '城邦时代': {
    maxTier: 4,
    allowedConcepts: ['建筑', '农业', '律法', '文字', '货币', '贸易', '防御', '石器', '陶器', '青铜'],
    forbiddenConcepts: ['电力', '机器', '核能', '火药', '引擎', '科技', '机械', '工业'],
  },
  '分野时代': {
    maxTier: 5,
    allowedConcepts: ['官僚', '宗教', '组织', '体系', '铁器', '战术'],
    forbiddenConcepts: ['电力', '机器', '核能', '引擎', '工业', '现代科技'],
  },
  '帝国时代': {
    maxTier: 6,
    allowedConcepts: ['道路', '史诗', '远洋', '帝国', '军事', '建筑工程', '钢铁', '火药'],
    forbiddenConcepts: ['电力', '机器', '核能', '引擎', '工业革命', '现代科技'],
  },
  '理性时代': {
    maxTier: 7,
    allowedConcepts: ['印刷', '启蒙', '蒸汽', '机械', '工业', '科学'],
    forbiddenConcepts: ['电力', '核能', '电子', '计算机', '太空'],
  },
  '信仰时代': {
    maxTier: 7,
    allowedConcepts: ['圣典', '艺术', '教权', '神学', '哲学'],
    forbiddenConcepts: ['核能', '电子', '计算机', '太空'],
  },
  '启蒙时代': {
    maxTier: 10,
    allowedConcepts: ['科学方法', '人权', '电力', '现代科技', '化学', '生物学', '物理学'],
    forbiddenConcepts: ['核能', '太空旅行', '量子计算'],
  },
};

// 检查物品是否被时代限制
export function isTechAllowed(itemName, itemTier, itemAttrs, currentEra) {
  const config = TECH_TIERS[currentEra];
  if (!config) return true;

  // 检查tier限制
  if (itemTier > config.maxTier) {
    return { allowed: false, reason: `当前时代(${currentEra})的科技水平无法制造如此高级的物品` };
  }

  // 检查禁止的概念
  const itemText = itemName.toLowerCase() + ' ' + JSON.stringify(itemAttrs).toLowerCase();
  for (const forbidden of config.forbiddenConcepts) {
    if (itemText.includes(forbidden.toLowerCase())) {
      return { allowed: false, reason: `"${forbidden}"在${currentEra}还未出现` };
    }
  }

  return { allowed: true };
}

