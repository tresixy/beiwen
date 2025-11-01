const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * 获取用户的所有地块标志
 */
export async function getUserMarkers(token) {
  const response = await fetch(`${API_BASE}/tiles/markers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get user markers');
  }
  return response.json();
}

/**
 * 获取用户的所有高亮地块
 */
export async function getUserHighlights(token) {
  const response = await fetch(`${API_BASE}/tiles/highlights`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get user highlights');
  }
  return response.json();
}

/**
 * 清除所有标志和高亮
 */
export async function clearMarkers(token) {
  const response = await fetch(`${API_BASE}/tiles/clear`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to clear markers');
  }
  return response.json();
}

