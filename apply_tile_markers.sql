-- ============================================
-- 地块标志与高亮系统数据库迁移脚本
-- ============================================
-- 用途：为游戏添加地块标志放置和永久高亮功能
-- 执行方式：psql -U minigame_user -d minigame_db -f apply_tile_markers.sql
-- ============================================

BEGIN;

-- 创建地块标志表
CREATE TABLE IF NOT EXISTS tile_markers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    q INTEGER NOT NULL,
    r INTEGER NOT NULL,
    marker_type VARCHAR(50) NOT NULL,
    event_name VARCHAR(100),
    image_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, q, r)
);

CREATE INDEX IF NOT EXISTS idx_tile_markers_user ON tile_markers(user_id);
CREATE INDEX IF NOT EXISTS idx_tile_markers_coords ON tile_markers(user_id, q, r);

-- 添加标志区域表（记录已高亮的地块组）
CREATE TABLE IF NOT EXISTS highlighted_tiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    q INTEGER NOT NULL,
    r INTEGER NOT NULL,
    event_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, q, r)
);

CREATE INDEX IF NOT EXISTS idx_highlighted_tiles_user ON highlighted_tiles(user_id);
CREATE INDEX IF NOT EXISTS idx_highlighted_tiles_coords ON highlighted_tiles(user_id, q, r);

COMMIT;

-- 验证
SELECT 
    'tile_markers' as table_name, 
    COUNT(*) as record_count 
FROM tile_markers
UNION ALL
SELECT 
    'highlighted_tiles' as table_name, 
    COUNT(*) as record_count 
FROM highlighted_tiles;

