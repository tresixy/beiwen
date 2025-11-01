import pool from '../db/connection.js';
import logger from '../utils/logger.js';

// 社会契约模板
const contracts = [
  {
    id: 1,
    name: '集体主义',
    description: '强调集体利益高于个人',
    choices: [
      { id: 1, text: '完全集体化', effects: { food: 20, production: 10, research: -5 } },
      { id: 2, text: '温和改革', effects: { food: 10, production: 5 } },
      { id: 3, text: '维持现状', effects: {} },
    ],
  },
  {
    id: 2,
    name: '技术革新',
    description: '是否全面拥抱新技术',
    choices: [
      { id: 1, text: '激进创新', effects: { research: 30, production: -10 } },
      { id: 2, text: '稳健发展', effects: { research: 15, production: 5 } },
      { id: 3, text: '保守传统', effects: { production: 10, research: -5 } },
    ],
  },
  {
    id: 3,
    name: '资源分配',
    description: '如何分配有限的资源',
    choices: [
      { id: 1, text: '投资生产', effects: { production: 20 } },
      { id: 2, text: '储备粮食', effects: { food: 30 } },
      { id: 3, text: '发展科技', effects: { research: 20 } },
    ],
  },
];

// 获取可用契约
export async function getAvailableContract(userId, turn) {
  try {
    // 每10回合出现一个契约
    if (turn % 10 !== 0 || turn === 0) {
      return null;
    }
    
    // 随机选择一个契约
    const contract = contracts[Math.floor(Math.random() * contracts.length)];
    
    return contract;
  } catch (err) {
    logger.error({ err, userId, turn }, 'GetAvailableContract error');
    throw err;
  }
}

// 选择契约
export async function chooseContract(userId, contractId, choiceId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) {
      throw new Error('Contract not found');
    }
    
    const choice = contract.choices.find(c => c.id === choiceId);
    if (!choice) {
      throw new Error('Choice not found');
    }
    
    // 应用效果
    const effects = choice.effects;
    
    if (effects.food) {
      await client.query(
        'UPDATE resources SET food = food + $2 WHERE user_id = $1',
        [userId, effects.food]
      );
    }
    if (effects.production) {
      await client.query(
        'UPDATE resources SET production = production + $2 WHERE user_id = $1',
        [userId, effects.production]
      );
    }
    if (effects.research) {
      await client.query(
        'UPDATE resources SET research = research + $2 WHERE user_id = $1',
        [userId, effects.research]
      );
    }
    
    // 记录选择
    await client.query(
      `INSERT INTO events_log (user_id, type, payload_json)
       VALUES ($1, 'contract', $2)`,
      [userId, JSON.stringify({ contractId, choiceId, contract: contract.name, choice: choice.text, effects })]
    );
    
    await client.query('COMMIT');
    
    logger.info({ userId, contractId, choiceId, effects }, 'Contract chosen');
    
    return {
      applied: true,
      effects,
      choice: choice.text,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, userId, contractId, choiceId }, 'ChooseContract error');
    throw err;
  } finally {
    client.release();
  }
}

