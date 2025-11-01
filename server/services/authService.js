import argon2 from 'argon2';
import pool from '../db/connection.js';
import { generateToken } from '../utils/security.js';
import logger from '../utils/logger.js';

export async function register({ email, username, password }) {
  try {
    const passwordHash = await argon2.hash(password);
    
    const result = await pool.query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username, created_at',
      [email, username, passwordHash]
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
    
    // 初始化7张基础卡牌（取前7张）
    const cards = await pool.query('SELECT id, name FROM cards ORDER BY id LIMIT 7');
    
    for (const card of cards.rows) {
      await pool.query(
        'INSERT INTO deck_cards (user_id, card_id, discovered, count) VALUES ($1, $2, true, 1) ON CONFLICT DO NOTHING',
        [user.id, card.id]
      );
    }
    
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
  try {
    // 检查邮箱是否已存在
    const result = await pool.query(
      'SELECT id, email, username, password_hash FROM users WHERE email = $1',
      [email]
    );
    
    let user;
    
    if (result.rows.length === 0) {
      // 如果没有提供密码，则自动注册（保持向后兼容）
      if (!password) {
        // 首次出现的邮箱，自动注册
        const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(2, 8);
        const passwordHash = await argon2.hash(Math.random().toString(36));
        
        const insertResult = await pool.query(
          'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username, created_at',
          [email, username, passwordHash]
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
        
        // 初始化7张基础卡牌（取前7张）
        const cards = await pool.query('SELECT id, name FROM cards ORDER BY id LIMIT 7');
        
        for (const card of cards.rows) {
          await pool.query(
            'INSERT INTO deck_cards (user_id, card_id, discovered, count) VALUES ($1, $2, true, 1) ON CONFLICT DO NOTHING',
            [user.id, card.id]
          );
        }
        
        logger.info({ userId: user.id, email }, 'User auto-registered on first login');
      } else {
        // 如果提供了密码但用户不存在，抛出错误
        throw new Error('User not found');
      }
    } else {
      // 用户存在，验证密码
      const dbUser = result.rows[0];
      
      // 如果提供了密码，进行验证
      if (password) {
        const passwordMatch = await argon2.verify(dbUser.password_hash, password);
        if (!passwordMatch) {
          throw new Error('Invalid password');
        }
      }
      // 如果没有提供密码，保持向后兼容（仅用于开发环境）
      
      user = {
        id: dbUser.id,
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
        email: user.email,
        username: user.username,
      },
      token,
    };
  } catch (err) {
    logger.error({ err, email }, 'Login error');
    throw err;
  }
}

export async function getMe(userId) {
  try {
    const result = await pool.query(
      'SELECT id, email, username, created_at FROM users WHERE id = $1',
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

