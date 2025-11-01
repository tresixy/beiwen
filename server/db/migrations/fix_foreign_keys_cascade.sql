-- 修复外键约束，添加级联删除
-- 这样删除用户时会自动清理关联数据

-- 1. items 表 - created_by 改为 SET NULL（保留物品，但创建者设为NULL）
ALTER TABLE items 
DROP CONSTRAINT IF EXISTS items_created_by_fkey,
ADD CONSTRAINT items_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES users(id) 
    ON DELETE SET NULL;

-- 2. deck_cards 表 - user_id 改为 CASCADE（删除用户的卡牌）
ALTER TABLE deck_cards 
DROP CONSTRAINT IF EXISTS deck_cards_user_id_fkey,
ADD CONSTRAINT deck_cards_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE;

-- 3. entities 表 - user_id 改为 CASCADE（删除用户的实体）
ALTER TABLE entities 
DROP CONSTRAINT IF EXISTS entities_user_id_fkey,
ADD CONSTRAINT entities_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE;

-- 4. events_log 表 - user_id 改为 CASCADE（删除用户的事件日志）
ALTER TABLE events_log 
DROP CONSTRAINT IF EXISTS events_log_user_id_fkey,
ADD CONSTRAINT events_log_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE;

-- 5. inventories 表 - user_id 改为 CASCADE（删除用户的背包）
ALTER TABLE inventories 
DROP CONSTRAINT IF EXISTS inventories_user_id_fkey,
ADD CONSTRAINT inventories_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE;

-- 6. projects 表 - user_id 改为 CASCADE（删除用户的项目）
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_user_id_fkey,
ADD CONSTRAINT projects_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE;

-- 7. resources 表 - user_id 改为 CASCADE（删除用户的资源）
ALTER TABLE resources 
DROP CONSTRAINT IF EXISTS resources_user_id_fkey,
ADD CONSTRAINT resources_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE;

-- 8. world_tiles 表 - user_id 改为 CASCADE（删除用户的地块）
ALTER TABLE world_tiles 
DROP CONSTRAINT IF EXISTS world_tiles_user_id_fkey,
ADD CONSTRAINT world_tiles_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE;

-- 注意: 
-- - highlighted_tiles 和 tile_markers 已经是 CASCADE
-- - user_game_state 已经是 CASCADE
-- - cards 的 created_by_user_id 已经是 SET NULL

COMMIT;

