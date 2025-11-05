import argon2 from 'argon2';
import pool from '../db/connection.js';
import { generateToken } from '../utils/security.js';
import { generateUniqueUserId } from '../utils/userIdGenerator.js';
import logger from '../utils/logger.js';

export async function register({ email, username, password }) {
  try {
    const passwordHash = await argon2.hash(password);
    const userId = await generateUniqueUserId();
    
    const result = await pool.query(
      'INSERT INTO users (user_id, email, username, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, user_id, email, username, created_at',
      [userId, email, username, passwordHash]
    );
    
    const user = result.rows[0];
    
    // 初始化背包
    await pool.query(
      'INSERT INTO inventories (user_id, slots_json) VALUES ($1, $2)',
      [user.id, JSON.stringify(Array(20).fill(null))]
    );
    
    // 初始化资源
    await pool.query(
      'INSERT INTO resources (user_id, food, production, research) VALUES ($1, 10, 10, 5)',
      [user.id]
    );

    // 初始化职业状态
    const initialProfessionState = {
      active: null,
      history: [],
      carryOver: true,
      pendingChoices: [],
      lastOfferedTurn: null,
    };
    await pool.query(
      'UPDATE users SET profession_json = $2 WHERE id = $1',
      [user.id, JSON.stringify(initialProfessionState)]
    );
    
    // 初始化生存时代的起始卡（人、石头）- 数量为2
    const starterCards = await pool.query(
      `SELECT id, name FROM cards 
       WHERE is_starter = TRUE AND era = '生存时代' 
       ORDER BY id`
    );
    
    for (const card of starterCards.rows) {
      await pool.query(
        'INSERT INTO deck_cards (user_id, card_id, discovered, count) VALUES ($1, $2, true, 2) ON CONFLICT DO NOTHING',
        [user.id, card.id]
      );
    }
    
    // 解锁生存时代的所有基础灵感卡（非起始卡，数量为1）
    const eraCards = await pool.query(
      `SELECT id, name FROM cards 
       WHERE era = '生存时代' 
       AND card_type = 'inspiration' 
       AND is_starter = FALSE 
       AND is_base_card = TRUE
       ORDER BY id`
    );
    
    for (const card of eraCards.rows) {
      await pool.query(
        'INSERT INTO deck_cards (user_id, card_id, discovered, count) VALUES ($1, $2, true, 1) ON CONFLICT DO NOTHING',
        [user.id, card.id]
      );
    }
    
    // 初始化游戏状态（会在首次访问时通过getEventState自动生成Event序列）
    await pool.query(
      `INSERT INTO user_game_state (user_id, era, hand_json, unlocked_keys, completed_events, updated_at) 
       VALUES ($1, '生存时代', '[]', '[]', '[]', NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id]
    );
    
    const token = generateToken(user.id);
    
    logger.info({ userId: user.id }, 'User registered');
    
    return { user, token };
  } catch (err) {
    logger.error({ err, email, username }, 'Register error');
    if (err.constraint === 'users_email_key') {
      throw new Error('Email already exists');
    }
    if (err.constraint === 'users_username_key') {
      throw new Error('Username already exists');
    }
    throw new Error('Registration failed');
  }
}

export async function login({ email, password }) {
  // 清理输入：去除前后空格
  const cleanEmail = email.trim();
  const cleanPassword = password.trim();
  
  logger.info({ email: cleanEmail, passwordLength: cleanPassword.length }, '[Login] 登录请求');
  
  try {
    // 检查邮箱是否已存在
    const result = await pool.query(
      'SELECT id, user_id, email, username, password_hash FROM users WHERE email = $1',
      [cleanEmail]
    );
    
    logger.info({ email: cleanEmail, found: result.rows.length > 0 }, '[Login] 用户查询结果');
    
    let user;
    
    if (result.rows.length === 0) {
      // 首次出现的邮箱，使用提供的密码注册新账号
      const username = cleanEmail.split('@')[0] + '_' + Math.random().toString(36).substring(2, 8);
      const passwordHash = await argon2.hash(cleanPassword);
      const userId = await generateUniqueUserId();
      
      const insertResult = await pool.query(
        'INSERT INTO users (user_id, email, username, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, user_id, email, username, created_at',
        [userId, cleanEmail, username, passwordHash]
      );
      
      user = insertResult.rows[0];
      
      // 初始化背包
      await pool.query(
        'INSERT INTO inventories (user_id, slots_json) VALUES ($1, $2)',
        [user.id, JSON.stringify(Array(20).fill(null))]
      );
      
      // 初始化资源
      await pool.query(
        'INSERT INTO resources (user_id, food, production, research) VALUES ($1, 10, 10, 5)',
        [user.id]
      );

      // 初始化职业状态
      const initialProfessionState = {
        active: null,
        history: [],
        carryOver: true,
        pendingChoices: [],
        lastOfferedTurn: null,
      };
      await pool.query(
        'UPDATE users SET profession_json = $2 WHERE id = $1',
        [user.id, JSON.stringify(initialProfessionState)]
      );
      
      // 初始化生存时代的起始卡（人、石头）- 数量为2
      const starterCards = await pool.query(
        `SELECT id, name FROM cards 
         WHERE is_starter = TRUE AND era = '生存时代' 
         ORDER BY id`
      );
      
      for (const card of starterCards.rows) {
        await pool.query(
          'INSERT INTO deck_cards (user_id, card_id, discovered, count) VALUES ($1, $2, true, 2) ON CONFLICT DO NOTHING',
          [user.id, card.id]
        );
      }
      
      // 解锁生存时代的所有基础灵感卡（非起始卡，数量为1）
      const eraCards = await pool.query(
        `SELECT id, name FROM cards 
         WHERE era = '生存时代' 
         AND card_type = 'inspiration' 
         AND is_starter = FALSE 
         AND is_base_card = TRUE
         ORDER BY id`
      );
      
      for (const card of eraCards.rows) {
        await pool.query(
          'INSERT INTO deck_cards (user_id, card_id, discovered, count) VALUES ($1, $2, true, 1) ON CONFLICT DO NOTHING',
          [user.id, card.id]
        );
      }
      
      // 初始化游戏状态（会在首次访问时通过getEventState自动生成Event序列）
      await pool.query(
        `INSERT INTO user_game_state (user_id, era, hand_json, unlocked_keys, completed_events, updated_at) 
         VALUES ($1, '生存时代', '[]', '[]', '[]', NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      );
      
      logger.info({ userId: user.id, email: cleanEmail }, 'User registered with email and password');
    } else {
      // 用户存在，验证密码
      const dbUser = result.rows[0];
      
      logger.info({ 
        userId: dbUser.id, 
        email: dbUser.email,
        passwordLength: cleanPassword.length,
        hashPreview: dbUser.password_hash.substring(0, 30)
      }, '[Login] 验证密码');
      
      const passwordMatch = await argon2.verify(dbUser.password_hash, cleanPassword);
      
      logger.info({ 
        userId: dbUser.id, 
        passwordMatch 
      }, '[Login] 密码验证结果');
      
      if (!passwordMatch) {
        throw new Error('密码错误，请联系管理员重置密码');
      }
      
      user = {
        id: dbUser.id,
        user_id: dbUser.user_id,
        email: dbUser.email,
        username: dbUser.username,
        created_at: dbUser.created_at,
      };
      
      logger.info({ userId: user.id }, 'User logged in');
    }
    
    const token = generateToken(user.id);
    
    return {
      user: {
        id: user.id,
        user_id: user.user_id,
        email: user.email,
        username: user.username,
      },
      token,
    };
  } catch (err) {
    logger.error({ err, email: cleanEmail }, 'Login error');
    throw err;
  }
}

export async function getMe(userId) {
  try {
    const result = await pool.query(
      'SELECT id, user_id, email, username, created_at FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    
    return result.rows[0];
  } catch (err) {
    logger.error({ err, userId }, 'GetMe error');
    throw err;
  }
}

