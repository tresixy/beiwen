import pool from '../db/connection.js';
import logger from '../utils/logger.js';

// 蓝图模板
const blueprintTemplates = [
  {
    formula: ['火焰', '石头'],
    hint: '高温与坚硬的结合',
    reward: '熔炉',
  },
  {
    formula: ['木材', '金属'],
    hint: '自然与工业的融合',
    reward: '工具',
  },
  {
    formula: ['能量', '水流'],
    hint: '动力与流动',
    reward: '水车',
  },
];

// 获取当前蓝图
export async function getCurrentBlueprints(userId) {
  try {
    // 简单返回所有蓝图模板
    const hints = blueprintTemplates.map((bp, index) => ({
      id: index + 1,
      hint: bp.hint,
      formula: bp.formula.map((item, i) => i === 0 ? item : '???'), // 只显示第一个
      reward: bp.reward,
    }));
    
    return hints;
  } catch (err) {
    logger.error({ err, userId }, 'GetCurrentBlueprints error');
    throw err;
  }
}

// 检查蓝图完成
export async function checkBlueprintCompletion(inputNames) {
  try {
    for (const bp of blueprintTemplates) {
      const sortedFormula = bp.formula.slice().sort();
      const sortedInputs = inputNames.slice().sort();
      
      if (JSON.stringify(sortedFormula) === JSON.stringify(sortedInputs)) {
        return {
          completed: true,
          blueprint: bp,
        };
      }
    }
    
    return { completed: false };
  } catch (err) {
    logger.error({ err, inputNames }, 'CheckBlueprintCompletion error');
    throw err;
  }
}

