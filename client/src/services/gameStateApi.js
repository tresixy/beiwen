import { apiRequest } from './api.js';

// 获取完整游戏状态
export async function getGameState(token) {
  return apiRequest('/api/game/state', { token });
}

// 保存手牌
export async function saveHand(token, hand) {
  return apiRequest('/api/game/hand', {
    method: 'POST',
    token,
    body: { hand },
  });
}

// 保存契约状态
export async function saveContract(token, contract) {
  return apiRequest('/api/game/contract', {
    method: 'POST',
    token,
    body: { contract },
  });
}

// 清空契约
export async function clearContract(token) {
  return apiRequest('/api/game/contract', {
    method: 'DELETE',
    token,
  });
}

// 结束回合
export async function endTurn(token) {
  return apiRequest('/api/turn/end', {
    method: 'POST',
    token,
  });
}

// 获取资源
export async function getResources(token) {
  return apiRequest('/api/turn/resources', { token });
}

// 抽牌
export async function drawCards(token, count = 3) {
  return apiRequest(`/api/deck/draw?count=${count}`, { token });
}

// 获取背包
export async function getInventory(token) {
  return apiRequest('/api/inventory', { token });
}

// 选择职业
export async function chooseProfession(token, professionId) {
  return apiRequest('/api/profession/choose', {
    method: 'POST',
    token,
    body: { professionId },
  });
}

// 选择契约
export async function chooseContract(token, contractId) {
  return apiRequest('/api/contract/choose', {
    method: 'POST',
    token,
    body: { contractId },
  });
}

