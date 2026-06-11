const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 10000,
});

async function main() {
  const t = await pool.query(
    'SELECT user_id, feishu_user_id, created_at FROM feishu_calendar_tokens ORDER BY created_at DESC LIMIT 5'
  );
  console.log('=== feishu_calendar_tokens ===');
  t.rows.forEach((r) => console.log(r.user_id, r.feishu_user_id, r.created_at));
  if (!t.rows.length) console.log('(无记录)');

  const u = await pool.query(
    "SELECT id, name, feishu_name FROM users WHERE feishu_calendar_connected = true LIMIT 5"
  );
  console.log('=== feishu 已连接用户 ===');
  u.rows.forEach((r) => console.log(r.id, r.name, r.feishu_name));
  if (!u.rows.length) console.log('(无)');

  const e = await pool.query(
    "SELECT COUNT(*) as cnt FROM calendar_events WHERE provider = 'feishu'"
  );
  console.log('calendar_events feishu 事件数:', e.rows[0].cnt);

  await pool.end();
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
