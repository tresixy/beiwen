import pool from '../db/connection.js';
import logger from '../utils/logger.js';
import path from 'path';
import fs from 'fs';

// 六边形方向（用于邻近地块计算）
const HEX_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

/**
 * 获取指定地块的所有邻近地块
 */
export function getNeighbors(q, r) {
  return HEX_DIRECTIONS.map(dir => ({
    q: q + dir.q,
    r: r + dir.r,
  }));
}

/**
 * 获取指定半径内的所有地块
 */
export function getTilesInRadius(centerQ, centerR, radius) {
  const tiles = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      tiles.push({ q: centerQ + q, r: centerR + r });
    }
  }
  return tiles;
}

/**
 * 随机选择周围的地块（包括中心地块）
 */
export function getRandomNearbyTiles(centerQ, centerR, minCount = 1, maxCount = 5) {
  // 获取1-2格范围内的所有地块
  const radius = Math.random() < 0.5 ? 1 : 2;
  const allTiles = getTilesInRadius(centerQ, centerR, radius);
  
  // 随机选择数量
  const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
  
  // 打乱并选择
  const shuffled = allTiles.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * 查找标志对应的图片文件
 */
export function findMarkerImage(markerName) {
  const assetsDir = path.join(process.cwd(), 'client', 'public', 'assets', '2d');
  const extensions = ['.png', '.jpg', '.webp', '.jpeg'];
  
  for (const ext of extensions) {
    const filePath = path.join(assetsDir, `${markerName}${ext}`);
    if (fs.existsSync(filePath)) {
      return `/assets/2d/${markerName}${ext}`;
    }
  }
  
  logger.warn({ markerName, assetsDir }, 'Marker image not found');
  return null;
}

/**
 * 在地块上放置标志
 */
export async function placeMarker(userId, q, r, markerType, eventName = null) {
  const imagePath = findMarkerImage(markerType);
  
  try {
    const result = await pool.query(
      `INSERT INTO tile_markers (user_id, q, r, marker_type, event_name, image_path)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, q, r) 
       DO UPDATE SET marker_type = $4, event_name = $5, image_path = $6, created_at = NOW()
       RETURNING *`,
      [userId, q, r, markerType, eventName, imagePath]
    );
    
    return result.rows[0];
  } catch (err) {
    logger.error({ err, userId, q, r, markerType }, 'Failed to place marker');
    throw err;
  }
}

/**
 * 高亮地块
 */
export async function highlightTile(userId, q, r, eventName = null) {
  try {
    const result = await pool.query(
      `INSERT INTO highlighted_tiles (user_id, q, r, event_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, q, r) DO NOTHING
       RETURNING *`,
      [userId, q, r, eventName]
    );
    
    return result.rows[0];
  } catch (err) {
    logger.error({ err, userId, q, r }, 'Failed to highlight tile');
    throw err;
  }
}

/**
 * 完成事件后放置标志并高亮地块
 */
export async function markEventCompletion(userId, selectedQ, selectedR, markerType, eventName, isFullVictory = true) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 根据是否完全胜利选择地块
    let tilesToMark;
    if (isFullVictory) {
      // 完全胜利：标记所有半径2范围内的地块
      tilesToMark = getTilesInRadius(selectedQ, selectedR, 2);
    } else {
      // 部分胜利：随机选择部分地块
      tilesToMark = getRandomNearbyTiles(selectedQ, selectedR, 1, 5);
    }
    
    logger.info({ 
      userId, 
      selectedQ, 
      selectedR, 
      markerType, 
      eventName,
      isFullVictory,
      tileCount: tilesToMark.length 
    }, 'Marking tiles for event completion');
    
    // 在第一个地块（中心地块）放置标志
    const imagePath = findMarkerImage(markerType);
    await client.query(
      `INSERT INTO tile_markers (user_id, q, r, marker_type, event_name, image_path)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, q, r) 
       DO UPDATE SET marker_type = $4, event_name = $5, image_path = $6, created_at = NOW()`,
      [userId, selectedQ, selectedR, markerType, eventName, imagePath]
    );
    
    // 高亮所有选中的地块
    for (const tile of tilesToMark) {
      await client.query(
        `INSERT INTO highlighted_tiles (user_id, q, r, event_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, q, r) DO NOTHING`,
        [userId, tile.q, tile.r, eventName]
      );
    }
    
    await client.query('COMMIT');
    
    return {
      markerPlaced: { q: selectedQ, r: selectedR, type: markerType, imagePath },
      highlightedTiles: tilesToMark,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, userId, selectedQ, selectedR, markerType }, 'Failed to mark event completion');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 获取用户的所有标志
 */
export async function getUserMarkers(userId) {
  try {
    const result = await pool.query(
      `SELECT q, r, marker_type, event_name, image_path, created_at
       FROM tile_markers
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [userId]
    );
    
    return result.rows;
  } catch (err) {
    logger.error({ err, userId }, 'Failed to get user markers');
    throw err;
  }
}

/**
 * 获取用户的所有高亮地块
 */
export async function getUserHighlightedTiles(userId) {
  try {
    const result = await pool.query(
      `SELECT q, r, event_name, created_at
       FROM highlighted_tiles
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [userId]
    );
    
    return result.rows;
  } catch (err) {
    logger.error({ err, userId }, 'Failed to get user highlighted tiles');
    throw err;
  }
}

/**
 * 清除用户的所有标志和高亮（用于重置游戏）
 */
export async function clearUserMarkers(userId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    await client.query('DELETE FROM tile_markers WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM highlighted_tiles WHERE user_id = $1', [userId]);
    
    await client.query('COMMIT');
    
    logger.info({ userId }, 'Cleared all user markers and highlights');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, userId }, 'Failed to clear user markers');
    throw err;
  } finally {
    client.release();
  }
}

