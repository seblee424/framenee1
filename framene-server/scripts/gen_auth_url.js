require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 10000,
});

async function main() {
  const state = uuidv4();
  const userId = 5;
  
  // 存入 state
  await pool.query(
    `INSERT INTO feishu_auth_states (user_id, state, expires_at) VALUES ($1, $2, NOW() + INTERVAL '5 minutes')`,
    [userId, state]
  );
  
  const redirectUri = process.env.FEISHU_CALLBACK_URL || 'https://snub-cataract-launder.ngrok-free.dev/api/auth/feishu-callback';
  const appId = process.env.FEISHU_APP_ID;
  
  const authUrl = `https://open.feishu.cn/open-apis/authen/v1/index?redirect_uri=${encodeURIComponent(redirectUri)}&app_id=${appId}&scope=openid,profile,calendar:calendar:readonly&state=${state}`;
  
  console.log('auth_url: ' + authUrl);
  
  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
