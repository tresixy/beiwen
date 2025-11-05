const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * 获取用户的卡册（已解锁的卡牌）
 */
export async function getDeckState(token) {
  const response = await fetch(`${API_BASE}/deck/state`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get deck state');
  }
  return response.json();
}

/**
 * 抽牌
 */
export async function drawCards(token, count = 3) {
  const response = await fetch(`${API_BASE}/deck/draw?count=${count}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to draw cards');
  }
  return response.json();
}

/**
 * 更新卡牌类型（将inspiration卡标记为keycard）
 */
export async function updateCardType(token, cardName, cardType, rarity) {
  const response = await fetch(`${API_BASE}/deck/update-card-type`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ cardName, cardType, rarity }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update card type');
  }
  return response.json();
}
