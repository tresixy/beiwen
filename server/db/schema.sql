-- 创建数据库表

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    profession_json JSONB DEFAULT '{}',
    synthesis_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS profession_json JSONB DEFAULT '{}';
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS synthesis_count INTEGER DEFAULT 0;

-- 物品表
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    tier INTEGER DEFAULT 1,
    attrs_json JSONB DEFAULT '{}',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 背包表
CREATE TABLE IF NOT EXISTS inventories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id),
    slots_json JSONB DEFAULT '[]',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- AI合成配方表
CREATE TABLE IF NOT EXISTS ai_recipes (
    id SERIAL PRIMARY KEY,
    recipe_hash VARCHAR(64) UNIQUE NOT NULL,
    inputs_json JSONB NOT NULL,
    output_item_id INTEGER REFERENCES items(id),
    prompt TEXT,
    model VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 图片表
CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES items(id),
    provider VARCHAR(50),
    prompt TEXT,
    image_url TEXT,
    seed VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 卡牌表
CREATE TABLE IF NOT EXISTS cards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    rarity VARCHAR(20) DEFAULT 'common',
    attrs_json JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 用户卡牌表
CREATE TABLE IF NOT EXISTS deck_cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    card_id INTEGER REFERENCES cards(id),
    discovered BOOLEAN DEFAULT FALSE,
    count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, card_id)
);

-- 蓝图表
CREATE TABLE IF NOT EXISTS blueprints (
    id SERIAL PRIMARY KEY,
    formula_json JSONB NOT NULL,
    hint TEXT,
    reward_card_id INTEGER REFERENCES cards(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 世界地块表
CREATE TABLE IF NOT EXISTS world_tiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    biome VARCHAR(50) DEFAULT 'plains',
    data_json JSONB DEFAULT '{}',
    UNIQUE(user_id, x, y)
);

-- 实体表（单位/建筑）
CREATE TABLE IF NOT EXISTS entities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    kind VARCHAR(20) NOT NULL,
    card_id INTEGER REFERENCES cards(id),
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    attrs_json JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 资源表
CREATE TABLE IF NOT EXISTS resources (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    food INTEGER DEFAULT 0,
    production INTEGER DEFAULT 0,
    research INTEGER DEFAULT 0,
    turn INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 项目表（宏伟工程）
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    progress INTEGER DEFAULT 0,
    required_production INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 事件日志表
CREATE TABLE IF NOT EXISTS events_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    payload_json JSONB DEFAULT '{}',
    turn INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 用户游戏状态表（用于存储手牌、契约等临时状态）
CREATE TABLE IF NOT EXISTS user_game_state (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    hand_json JSONB DEFAULT '[]',
    contract_json JSONB DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_ai_recipes_hash ON ai_recipes(recipe_hash);
CREATE INDEX IF NOT EXISTS idx_entities_user ON entities(user_id, x, y);
CREATE INDEX IF NOT EXISTS idx_deck_cards_user ON deck_cards(user_id, card_id);
CREATE INDEX IF NOT EXISTS idx_user_game_state_user ON user_game_state(user_id);

-- 插入初始卡牌数据
INSERT INTO cards (name, type, rarity, attrs_json) VALUES
('火焰', 'element', 'common', '{"power": 1, "element": "fire"}'),
('水流', 'element', 'common', '{"power": 1, "element": "water"}'),
('泥土', 'element', 'common', '{"power": 1, "element": "earth"}'),
('空气', 'element', 'common', '{"power": 1, "element": "air"}'),
('石头', 'material', 'common', '{"durability": 2}'),
('木材', 'material', 'common', '{"durability": 1, "fuel": 1}'),
('金属', 'material', 'uncommon', '{"durability": 3}'),
('能量', 'concept', 'uncommon', '{"power": 2}')
ON CONFLICT DO NOTHING;

