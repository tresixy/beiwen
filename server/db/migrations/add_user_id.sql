-- 为用户表添加 user_id 字段
-- user_id 格式：usr_xxxxxx（6位随机字符）

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS user_id VARCHAR(20) UNIQUE;

-- 为现有用户生成 user_id
DO $$
DECLARE
    user_record RECORD;
    new_user_id VARCHAR(20);
    max_attempts INTEGER := 10;
    attempt INTEGER;
    id_exists BOOLEAN;
BEGIN
    FOR user_record IN SELECT id FROM users WHERE user_id IS NULL LOOP
        attempt := 0;
        LOOP
            -- 生成格式：usr_ + 6位随机字符
            new_user_id := 'usr_' || lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
            
            -- 检查是否已存在
            SELECT EXISTS(SELECT 1 FROM users WHERE user_id = new_user_id) INTO id_exists;
            
            IF NOT id_exists THEN
                UPDATE users SET user_id = new_user_id WHERE id = user_record.id;
                EXIT;
            END IF;
            
            attempt := attempt + 1;
            IF attempt >= max_attempts THEN
                RAISE EXCEPTION 'Failed to generate unique user_id for user %', user_record.id;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);

-- 添加注释
COMMENT ON COLUMN users.user_id IS '用户唯一标识符，格式：usr_xxxxxx';

