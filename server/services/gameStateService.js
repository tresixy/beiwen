import pool from '../db/connection.js';
import logger from '../utils/logger.js';
import { getResources } from '../gameplay/resourceService.js';
import { getInventory } from './inventoryService.js';
import { getProfessionState } from './professionService.js';
import { getDeckState } from '../gameplay/deckService.js';

// 获取完整游戏状态
export async function getGameState(userId) {
  try {
    // 并行获取各个模块的数据
    const [resources, inventory, profession, deck, contract, hand] = await Promise.all([
      getResources(userId),
      getInventory(userId),
      getProfessionState(userId),
      getDeckState(userId),
      getActiveContract(userId),
      getPlayerHand(userId),
    ]);

    logger.info({ userId }, 'Game state loaded');

    return {
      resources,
      inventory,
      profession,
      deck,
      contract,
      hand: hand || [],
    };
  } catch (err) {
    logger.error({ err, userId }, 'GetGameState error');
    throw err;
  }
}

// 获取玩家手牌
async function getPlayerHand(userId) {
  try {
    const result = await pool.query(
      'SELECT hand_json FROM user_game_state WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return [];
    }
    
    return result.rows[0].hand_json || [];
  } catch (err) {
    // 如果表不存在，返回空数组
    if (err.code === '42P01') {
      return [];
    }
    throw err;
  }
}

// 保存玩家手牌
export async function savePlayerHand(userId, hand) {
  try {
    await pool.query(
      `INSERT INTO user_game_state (user_id, hand_json, updated_at) 
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET hand_json = $2, updated_at = NOW()`,
      [userId, JSON.stringify(hand)]
    );
    
    logger.info({ userId, handSize: hand.length }, 'Player hand saved');
    return true;
  } catch (err) {
    logger.error({ err, userId }, 'SavePlayerHand error');
    throw err;
  }
}

// 获取当前激活的契约
async function getActiveContract(userId) {
  try {
    const result = await pool.query(
      'SELECT contract_json FROM user_game_state WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0 || !result.rows[0].contract_json) {
      return null;
    }
    
    return result.rows[0].contract_json;
  } catch (err) {
    if (err.code === '42P01') {
      return null;
    }
    throw err;
  }
}

// 保存契约状态
export async function saveContractState(userId, contract) {
  try {
    await pool.query(
      `INSERT INTO user_game_state (user_id, contract_json, updated_at) 
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET contract_json = $2, updated_at = NOW()`,
      [userId, JSON.stringify(contract)]
    );
    
    logger.info({ userId }, 'Contract state saved');
    return true;
  } catch (err) {
    logger.error({ err, userId }, 'SaveContractState error');
    throw err;
  }
}

// 清空契约
export async function clearContract(userId) {
  try {
    await pool.query(
      `INSERT INTO user_game_state (user_id, contract_json, updated_at) 
       VALUES ($1, NULL, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET contract_json = NULL, updated_at = NOW()`,
      [userId]
    );
    
    logger.info({ userId }, 'Contract cleared');
    return true;
  } catch (err) {
    logger.error({ err, userId }, 'ClearContract error');
    throw err;
  }
}

