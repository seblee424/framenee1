const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 10000,
});

async function main() {
  const t = await pool.query(
    'SELECT user_id, feishu_user_id, created_at, token_expires_at FROM feishu_calendar_tokens ORDER BY created_at DESC LIMIT 3'
  );
  console.log('=== 飞书 Token ===');
  t.rows.forEach((r) => {
    const exp = new Date(r.token_expires_at);
    const now = new Date();
    const valid = exp > now;
    console.log(`  user_id=${r.user_id}, feishu_user_id=${r.feishu_user_id}, created=${r.created_at}, expires=${r.token_expires_at}, valid=${valid}`);
  });

  const e = await pool.query("SELECT COUNT(*) as cnt FROM calendar_events WHERE provider = 'feishu'");
  console.log('feishu 事件数:', e.rows[0].cnt);

  await pool.end();
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
