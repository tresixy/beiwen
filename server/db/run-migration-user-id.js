import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('开始执行 user_id 迁移...');
    
    const migrationSQL = readFileSync(
      path.join(__dirname, 'migrations', 'add_user_id.sql'),
      'utf8'
    );

    await pool.query(migrationSQL);

    console.log('✅ user_id 迁移完成');
    
    // 检查结果
    const result = await pool.query(
      'SELECT id, user_id, email FROM users LIMIT 5'
    );
    
    console.log('\n示例用户（前5个）：');
    result.rows.forEach(user => {
      console.log(`  - ID: ${user.id}, user_id: ${user.user_id}, email: ${user.email}`);
    });
    
    const countResult = await pool.query(
      'SELECT COUNT(*) as total, COUNT(user_id) as with_user_id FROM users'
    );
    console.log(`\n总用户数: ${countResult.rows[0].total}`);
    console.log(`已生成 user_id: ${countResult.rows[0].with_user_id}`);

  } catch (err) {
    console.error('❌ 迁移失败:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

