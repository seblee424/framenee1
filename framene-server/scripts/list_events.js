const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 10000,
});

async function main() {
  const events = await pool.query(
    "SELECT id, title, provider, start_at, end_at, location FROM calendar_events WHERE provider = 'feishu' ORDER BY start_at ASC"
  );
  console.log(`飞书事件 (${events.rows.length}):`);
  events.rows.forEach((r) => {
    console.log(`  #${r.id} "${r.title}" | ${r.start_at} → ${r.end_at} | ${r.location || '-'}`);
  });

  // 再看所有事件
  const all = await pool.query(
    "SELECT provider, COUNT(*) as cnt FROM calendar_events GROUP BY provider"
  );
  console.log('\n事件总数按 provider 分布:');
  all.rows.forEach((r) => console.log(`  ${r.provider}: ${r.cnt}`));

  await pool.end();
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
