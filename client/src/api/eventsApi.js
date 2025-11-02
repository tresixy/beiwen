// Events系统API

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// 获取events进度概览
export async function getEventsProgress(token) {
  const response = await fetch(`${API_BASE}/events/progress`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get events progress');
  }

  return response.json();
}

// 获取当前激活的event
export async function getActiveEvent(token) {
  const response = await fetch(`${API_BASE}/events/active`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get active event');
  }

  return response.json();
}

// 完成event
export async function completeEvent(token, eventId, key, selectedHex = null) {
  const response = await fetch(`${API_BASE}/events/complete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ eventId, key, selectedHex }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Failed to complete event');
  }

  return response.json();
}

// 重新生成events序列（新游戏）
export async function regenerateEventSequence(token) {
  const response = await fetch(`${API_BASE}/events/regenerate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to regenerate events');
  }

  return response.json();
}




