// ============================================
// FrameNe 后端 API 服务
// PostgreSQL 版本 — 连接阿里云 RDS PostgreSQL
// ============================================
// 如需切换回 MySQL，请参照 SWITCH_BACK_TO_MYSQL.md
// ============================================
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Core = require('@alicloud/pop-core');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const OSS = require('ali-oss');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// 配置（通过环境变量注入）
// ============================================
const config = {
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'framene-dev-secret-key',

  // PostgreSQL 数据库连接（阿里云 RDS PostgreSQL）
  databaseUrl: process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING || '',

  // 阿里云 AccessKey（用于短信服务和邮件推送）
  aliyunAccessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
  aliyunAccessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',

  // 短信服务
  smsSignName: process.env.SMS_SIGN_NAME || 'FrameNe',
  smsTemplateCode: process.env.SMS_TEMPLATE_CODE || '',

  // 邮件推送
  emailSenderAddress: process.env.EMAIL_SENDER_ADDRESS || '',

  // 钉钉
  dingtalkAppKey: process.env.DINGTALK_APP_KEY || '',
  dingtalkAppSecret: process.env.DINGTALK_APP_SECRET || '',
  dingtalkCallbackUrl: process.env.DINGTALK_CALLBACK_URL || '',

  // 前端地址（OAuth 回调后重定向回来）
  appUrl: process.env.APP_URL || 'http://localhost:8080',

  // 阿里云 OSS 配置
  ossRegion: process.env.OSS_REGION || 'oss-cn-hangzhou',
  ossBucket: process.env.OSS_BUCKET || 'framene-photos',
  ossAccessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  ossAccessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',

  // 飞书应用配置
  feishuAppId: process.env.FEISHU_APP_ID || '',
  feishuAppSecret: process.env.FEISHU_APP_SECRET || '',
  feishuCallbackUrl: process.env.FEISHU_CALLBACK_URL || '',

  // 语音 Pipeline API Key（用于 framene_v1_1 → 后端对接）
  voiceApiKey: process.env.VOICE_API_KEY || '',
};

// ============================================
// PostgreSQL 连接池
// ============================================
let pool;

async function getPool() {
  if (!pool) {
    if (!config.databaseUrl) {
      throw new Error('未配置数据库连接：请设置 DATABASE_URL 环境变量');
    }
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    // 测试连接
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('✅ PostgreSQL 连接成功');
    } finally {
      client.release();
    }
  }
  return pool;
}

// ============================================
// 工具函数
// ============================================

/// 生成 6 位随机验证码
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/// 生成 JWT Token
function generateToken(userId) {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' });
}

/// 认证中间件
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token 无效或已过期' });
  }
}

// ============================================
// 阿里云短信服务客户端
// ============================================
function getSmsClient() {
  return new Core({
    accessKeyId: config.aliyunAccessKeyId,
    accessKeySecret: config.aliyunAccessKeySecret,
    endpoint: 'https://dysmsapi.aliyuncs.com',
    apiVersion: '2017-05-25',
  });
}

/// 发送短信验证码
async function sendSmsCode(phone, code) {
  const client = getSmsClient();
  const params = {
    RegionId: 'cn-hangzhou',
    PhoneNumbers: phone,
    SignName: config.smsSignName,
    TemplateCode: config.smsTemplateCode,
    TemplateParam: JSON.stringify({ code }),
  };

  const requestOption = { method: 'POST' };

  try {
    const result = await client.request('SendSms', params, requestOption);
    if (result.Code !== 'OK') {
      throw new Error(`短信发送失败: ${result.Message}`);
    }
    return result;
  } catch (error) {
    throw new Error(`短信发送失败: ${error.message}`);
  }
}

// ============================================
// 阿里云邮件推送客户端
// ============================================
function getDmClient() {
  return new Core({
    accessKeyId: config.aliyunAccessKeyId,
    accessKeySecret: config.aliyunAccessKeySecret,
    endpoint: 'https://dm.aliyuncs.com',
    apiVersion: '2015-11-23',
  });
}

// ============================================
// 阿里云 OSS 客户端
// ============================================
function getOssClient() {
  if (!config.ossAccessKeyId || !config.ossAccessKeySecret) {
    return null;
  }
  return new OSS({
    region: config.ossRegion,
    bucket: config.ossBucket,
    accessKeyId: config.ossAccessKeyId,
    accessKeySecret: config.ossAccessKeySecret,
    secure: true,
  });
}

/// 初始化/迁移 所有业务表
async function ensureAllTables() {
  try {
    const pool = await getPool();
    
    // photo_assets 表
    await pool.query(`create table if not exists photo_assets (
      id serial primary key, user_id integer references users(id) on delete set null,
      owner_email varchar(255), file_name varchar(255) not null,
      url text not null, storage_path text not null unique,
      file_size integer, mime_type varchar(50),
      created_at timestamptz not null default now()
    );`);
    for (const sql of [
      'alter table photo_assets add column if not exists owner_email varchar(255)',
      'alter table photo_assets add column if not exists file_size integer',
      'alter table photo_assets add column if not exists mime_type varchar(50)',
      'alter table photo_assets alter column user_id drop not null',
      'create index if not exists photo_assets_user_id_idx on photo_assets (user_id)',
      'create index if not exists photo_assets_created_at_idx on photo_assets (created_at desc)',
    ]) { await pool.query(sql); }

    // calendar_events 表
    await pool.query(`create table if not exists calendar_events (
      id serial primary key, user_id integer not null references users(id) on delete cascade,
      title varchar(255) not null, description text,
      provider varchar(20) not null default 'manual',
      start_at timestamptz not null, end_at timestamptz not null,
      location text, source_event_id varchar(255),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint calendar_events_time_check check (end_at >= start_at)
    );`);
    await pool.query('create index if not exists calendar_events_user_id_idx on calendar_events (user_id)');
    await pool.query('create index if not exists calendar_events_start_at_idx on calendar_events (start_at asc)');

    // calendar_members 表
    await pool.query(`create table if not exists calendar_members (
      id serial primary key, email varchar(255) not null unique,
      name varchar(100) not null, role varchar(20) not null default 'member',
      status varchar(20) not null default 'pending',
      invited_by integer references users(id),
      invited_at timestamptz not null default now(),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );`);
    await pool.query('create index if not exists calendar_members_email_idx on calendar_members (email)');

    // 给 users 表增加飞书相关列（如不存在）
    await pool.query('alter table users add column if not exists feishu_calendar_connected boolean not null default false');
    await pool.query('alter table users add column if not exists feishu_name varchar(100)');

    // feishu_auth_states 表（OAuth state 临时存储）
    await pool.query(`create table if not exists feishu_auth_states (
      id serial primary key,
      user_id integer not null,
      state varchar(255) not null unique,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    );`);
    await pool.query('create index if not exists feishu_auth_states_state_idx on feishu_auth_states (state)');

    // calendar_sync_status 表
    await pool.query(`create table if not exists calendar_sync_status (
      id serial primary key,
      user_id integer not null references users(id) on delete cascade,
      provider varchar(20) not null,
      last_sync_at timestamptz,
      sync_status varchar(20) not null default 'never',
      error_message text,
      events_synced int not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(user_id, provider)
    );`);

    // feishu_calendar_tokens 表
    await pool.query(`create table if not exists feishu_calendar_tokens (
      id serial primary key,
      user_id integer not null unique references users(id) on delete cascade,
      feishu_user_id varchar(255) not null,
      access_token text not null,
      refresh_token text default '',
      token_expires_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );`);

    // verification_codes 表（手机验证码）
    await pool.query(`create table if not exists verification_codes (
      id serial primary key,
      phone varchar(20) not null,
      code varchar(6) not null,
      used boolean not null default false,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    );`);
    await pool.query('create index if not exists verification_codes_phone_idx on verification_codes (phone)');
    await pool.query('create index if not exists verification_codes_created_at_idx on verification_codes (created_at desc)');

    // email_verification_codes 表（邮箱验证码）
    await pool.query(`create table if not exists email_verification_codes (
      id serial primary key,
      email varchar(255) not null,
      code varchar(6) not null,
      used boolean not null default false,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    );`);
    await pool.query('create index if not exists email_verification_codes_email_idx on email_verification_codes (email)');
    await pool.query('create index if not exists email_verification_codes_created_at_idx on email_verification_codes (created_at desc)');

    console.log('✅ 所有业务表已就绪');
  } catch (err) {
    console.error('❌ 初始化业务表失败:', err.message);
  }
}

/// 发送邮箱验证码
async function sendEmailCode(email, code) {
  if (!config.emailSenderAddress) {
    throw new Error('邮件推送未配置，请先设置 EMAIL_SENDER_ADDRESS');
  }

  const client = getDmClient();
  const params = {
    AccountName: config.emailSenderAddress,
    AddressType: 1,
    ReplyToAddress: false,
    ToAddress: email,
    Subject: 'FrameNe 邮箱验证码',
    HtmlBody: `<div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:'Helvetica Neue',Arial,sans-serif;background:#f9f9f9;border-radius:16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:56px;height:56px;background:#FFF3E0;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;">📸</div>
        <h2 style="margin:12px 0 4px;color:#333;">FrameNe</h2>
        <p style="margin:0;color:#999;font-size:13px;">家庭相册与日历</p>
      </div>
      <div style="background:#fff;border-radius:12px;padding:32px 24px;text-align:center;">
        <p style="color:#666;font-size:14px;margin:0 0 16px;">您的邮箱验证码为</p>
        <div style="background:#FFF3E0;border-radius:12px;padding:16px 32px;display:inline-block;">
          <span style="font-size:36px;font-weight:bold;color:#FF6B35;letter-spacing:8px;">${code}</span>
        </div>
        <p style="color:#999;font-size:12px;margin:16px 0 0;">验证码 5 分钟内有效，请勿泄露给他人</p>
      </div>
      <p style="text-align:center;color:#bbb;font-size:11px;margin-top:24px;">如果这不是您的操作，请忽略此邮件</p>
    </div>`,
  };

  const requestOption = { method: 'POST' };

  try {
    const result = await client.request('SingleSendMail', params, requestOption);
    return result;
  } catch (error) {
    throw new Error(`邮件发送失败: ${error.message}`);
  }
}

// ============================================
// 1. 发送手机验证码
// ============================================
app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || phone.length < 11) {
      return res.status(400).json({ error: '请输入正确的手机号' });
    }

    // 生成验证码
    const code = generateCode();

    // 发送短信
    await sendSmsCode(phone, code);

    // 存储验证码到数据库
    const db = await getPool();
    await db.query(
      'INSERT INTO verification_codes (phone, code, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'5 minutes\')',
      [phone, code]
    );

    res.json({ success: true, message: '验证码已发送' });
  } catch (error) {
    console.error('发送验证码失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 2. 手机验证码登录
// ============================================
app.post('/api/auth/phone-login', async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ error: '请填写手机号和验证码' });
    }

    const db = await getPool();

    // 验证验证码
    const result = await db.query(
      'SELECT * FROM verification_codes WHERE phone = $1 AND code = $2 AND used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [phone, code]
    );

    const codes = result.rows;

    if (codes.length === 0) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }

    // 标记验证码已使用
    await db.query('UPDATE verification_codes SET used = true WHERE id = $1', [codes[0].id]);

    // 查找或创建用户
    let userResult = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    let user;

    if (userResult.rows.length === 0) {
      // 新用户自动注册
      const insertResult = await db.query(
        'INSERT INTO users (phone, name, login_provider) VALUES ($1, $2, $3) RETURNING *',
        [phone, phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'), 'phone']
      );
      user = insertResult.rows[0];
    } else {
      user = userResult.rows[0];
    }

    // 生成 JWT
    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: String(user.id),
        phone: user.phone,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        login_provider: user.login_provider,
      },
    });
  } catch (error) {
    console.error('手机号登录失败:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// ============================================
// 3. 发送邮箱验证码
// ============================================
app.post('/api/auth/send-email-code', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: '请输入正确的邮箱地址' });
    }

    const db = await getPool();

    // 检查邮箱是否已被注册
    const existingResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    // 生成验证码
    const code = generateCode();

    // 发送邮件
    await sendEmailCode(email, code);

    // 存储验证码到数据库
    await db.query(
      'INSERT INTO email_verification_codes (email, code, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'5 minutes\')',
      [email, code]
    );

    res.json({ success: true, message: '验证码已发送到邮箱' });
  } catch (error) {
    console.error('发送邮箱验证码失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 4. 邮箱验证码注册
// ============================================
app.post('/api/auth/email-code-register', async (req, res) => {
  try {
    const { email, code, password, name } = req.body;

    if (!email || !code || !password || !name) {
      return res.status(400).json({ error: '请填写所有必填项' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度不能少于 6 位' });
    }

    const db = await getPool();

    // 验证验证码
    const codesResult = await db.query(
      'SELECT * FROM email_verification_codes WHERE email = $1 AND code = $2 AND used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, code]
    );

    if (codesResult.rows.length === 0) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }

    // 标记验证码已使用
    await db.query('UPDATE email_verification_codes SET used = true WHERE id = $1', [codesResult.rows[0].id]);

    // 再次检查邮箱是否已被注册（防止并发）
    const existingResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    // 密码加密
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const insertResult = await db.query(
      'INSERT INTO users (email, password_hash, name, login_provider) VALUES ($1, $2, $3, $4) RETURNING id',
      [email, passwordHash, name, 'email']
    );

    const userId = insertResult.rows[0].id;

    // 生成 JWT
    const token = generateToken(userId);

    res.json({
      token,
      user: {
        id: String(userId),
        email,
        name,
        login_provider: 'email',
      },
    });
  } catch (error) {
    console.error('邮箱注册失败:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// ============================================
// 5. 邮箱密码登录
// ============================================
app.post('/api/auth/email-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '请填写邮箱和密码' });
    }

    const db = await getPool();
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: '邮箱或密码错误' });
    }

    const user = userResult.rows[0];

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: '邮箱或密码错误' });
    }

    // 生成 JWT
    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: String(user.id),
        phone: user.phone,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        login_provider: user.login_provider,
      },
    });
  } catch (error) {
    console.error('邮箱登录失败:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// ============================================
// 6. 邮箱密码注册（保留原有功能）
// ============================================
app.post('/api/auth/email-register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: '请填写所有必填项' });
    }

    const db = await getPool();

    // 检查邮箱是否已被注册
    const existingResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    // 密码加密
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const insertResult = await db.query(
      'INSERT INTO users (email, password_hash, name, login_provider) VALUES ($1, $2, $3, $4) RETURNING id',
      [email, passwordHash, name, 'email']
    );

    const userId = insertResult.rows[0].id;

    // 生成 JWT
    const token = generateToken(userId);

    res.json({
      token,
      user: {
        id: String(userId),
        email,
        name,
        login_provider: 'email',
      },
    });
  } catch (error) {
    console.error('邮箱注册失败:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// ============================================
// 7. 获取当前用户信息
// ============================================
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const db = await getPool();
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [req.userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = userResult.rows[0];
    res.json({
      id: String(user.id),
      phone: user.phone,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      login_provider: user.login_provider,
      dingtalk_calendar_connected: user.dingtalk_calendar_connected,
      feishu_calendar_connected: user.feishu_calendar_connected || false,
      feishu_name: user.feishu_name,
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

/// 更新用户信息（昵称、头像）
app.put('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const { name, avatarUrl } = req.body;
    const db = await getPool();

    // 只更新提供的字段
    const updates = [];
    const params = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      params.push(name);
    }
    if (avatarUrl !== undefined) {
      updates.push(`avatar_url = $${idx++}`);
      params.push(avatarUrl);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有需要更新的字段' });
    }

    params.push(req.userId);
    await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`,
      params
    );

    // 返回更新后的用户
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0];
    res.json({
      id: String(user.id),
      phone: user.phone,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      login_provider: user.login_provider,
      dingtalk_calendar_connected: user.dingtalk_calendar_connected,
      feishu_calendar_connected: user.feishu_calendar_connected || false,
      feishu_name: user.feishu_name,
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ error: '更新用户信息失败' });
  }
});

// ============================================
// 8. 登出
// ============================================
app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  res.json({ success: true });
});

// ============================================
// 钉钉相关接口（占位）
// ============================================

app.get('/api/auth/dingtalk-auth-url', (req, res) => {
  // 回调地址：优先从配置取，其次从请求推断，最后用默认值
  const callbackUrl = config.dingtalkCallbackUrl ||
    `${req.protocol}://${req.get('host')}/api/auth/dingtalk-callback`;
  const url = `https://login.dingtalk.com/oauth2/auth?redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&client_id=${config.dingtalkAppKey}&scope=openid,profile&state=STATE`;
  res.json({ auth_url: url });
});

/// 钉钉扫码授权后，浏览器重定向到这里（GET）
/// 用授权码换 token → 查用户 → 生成 JWT → 跳回前端
app.get('/api/auth/dingtalk-callback', async (req, res) => {
  try {
    const { authCode } = req.query;
    if (!authCode) {
      return fcRedirect(res, `${config.appUrl}/?auth_error=缺少授权码`);
    }

    // 1. 用 authCode 换取用户 accessToken
    const tokenResp = await fetch('https://api.dingtalk.com/v1.0/oauth2/userAccessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: config.dingtalkAppKey,
        clientSecret: config.dingtalkAppSecret,
        code: String(authCode),
        grantType: 'authorization_code',
      }),
    });

    if (!tokenResp.ok) {
      const err = await tokenResp.text();
      console.error('钉钉 token 换取失败:', err);
      return fcRedirect(res, `${config.appUrl}/?auth_error=token换取失败`);
    }

    const tokenData = await tokenResp.json();

    // 2. 获取用户信息
    const userResp = await fetch('https://api.dingtalk.com/v1.0/oauth2/userinfo', {
      headers: { 'x-acs-dingtalk-access-token': tokenData.accessToken },
    });

    if (!userResp.ok) {
      const err = await userResp.text();
      console.error('钉钉用户信息获取失败:', err);
      return fcRedirect(res, `${config.appUrl}/?auth_error=用户信息获取失败`);
    }

    const userInfo = await userResp.json();

    // 3. 查找或创建用户
    const db = await getPool();
    let userResult = await db.query('SELECT * FROM users WHERE dingtalk_unionid = $1', [userInfo.unionId]);

    let user;
    if (userResult.rows.length === 0) {
      const insertResult = await db.query(
        'INSERT INTO users (name, dingtalk_userid, dingtalk_unionid, login_provider) VALUES ($1, $2, $3, $4) RETURNING *',
        [userInfo.nick || '钉钉用户', userInfo.userId || '', userInfo.unionId, 'dingtalk']
      );
      user = insertResult.rows[0];
    } else {
      user = userResult.rows[0];
    }

    // 4. 存储 dingtalk token + 标记已连接
    await db.query(
      `INSERT INTO dingtalk_calendar_tokens (user_id, dingtalk_userid, access_token, refresh_token, token_expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days')
       ON CONFLICT (user_id) DO UPDATE SET access_token = $3, refresh_token = $4, updated_at = NOW()`,
      [user.id, userInfo.userId || '', tokenData.accessToken, tokenData.refreshToken || '']
    );
    await db.query('UPDATE users SET dingtalk_calendar_connected = true WHERE id = $1', [user.id]);

    // 5. 生成 JWT 并跳转回前端
    const token = generateToken(user.id);
    fcRedirect(res, `${config.appUrl}/?dingtalk_connected=true`);
  } catch (error) {
    console.error('钉钉登录回调失败:', error);
    fcRedirect(res, `${config.appUrl}/?auth_error=${encodeURIComponent(error.message)}`);
  }
});

/// 前端 JSON API：用 authCode 登录
app.post('/api/auth/dingtalk-login', async (req, res) => {
  try {
    const { auth_code } = req.body;
    if (!auth_code) {
      return res.status(400).json({ error: '缺少授权码 auth_code' });
    }

    // 1. 用 authCode 换取用户 accessToken
    const tokenResp = await fetch('https://api.dingtalk.com/v1.0/oauth2/userAccessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: config.dingtalkAppKey,
        clientSecret: config.dingtalkAppSecret,
        code: String(auth_code),
        grantType: 'authorization_code',
      }),
    });

    if (!tokenResp.ok) {
      const err = await tokenResp.text();
      console.error('钉钉 token 换取失败:', err);
      return res.status(400).json({ error: '钉钉登录失败，授权码无效或已过期' });
    }

    const tokenData = await tokenResp.json();

    // 2. 获取用户信息
    const userResp = await fetch('https://api.dingtalk.com/v1.0/oauth2/userinfo', {
      headers: { 'x-acs-dingtalk-access-token': tokenData.accessToken },
    });

    if (!userResp.ok) {
      const err = await userResp.text();
      console.error('钉钉用户信息获取失败:', err);
      return res.status(500).json({ error: '获取钉钉用户信息失败' });
    }

    const userInfo = await userResp.json();

    // 3. 查找或创建用户
    const db = await getPool();
    let userResult = await db.query('SELECT * FROM users WHERE dingtalk_unionid = $1', [userInfo.unionId]);

    let user;
    if (userResult.rows.length === 0) {
      const insertResult = await db.query(
        'INSERT INTO users (name, dingtalk_userid, dingtalk_unionid, login_provider) VALUES ($1, $2, $3, $4) RETURNING *',
        [userInfo.nick || '钉钉用户', userInfo.userId || '', userInfo.unionId, 'dingtalk']
      );
      user = insertResult.rows[0];
    } else {
      user = userResult.rows[0];
    }

    // 4. 存储 dingtalk token + 标记已连接
    await db.query(
      `INSERT INTO dingtalk_calendar_tokens (user_id, dingtalk_userid, access_token, refresh_token, token_expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days')
       ON CONFLICT (user_id) DO UPDATE SET access_token = $3, refresh_token = $4, updated_at = NOW()`,
      [user.id, userInfo.userId || '', tokenData.accessToken, tokenData.refreshToken || '']
    );
    await db.query('UPDATE users SET dingtalk_calendar_connected = true WHERE id = $1', [user.id]);

    // 5. 生成 JWT 并返回
    const jwt = generateToken(user.id);

    res.json({
      token: jwt,
      user: {
        id: String(user.id),
        name: user.name,
        avatar_url: user.avatar_url,
        login_provider: 'dingtalk',
        dingtalk_calendar_connected: true,
      },
    });
  } catch (error) {
    console.error('钉钉登录失败:', error);
    res.status(500).json({ error: '钉钉登录失败，请稍后重试' });
  }
});

// ============================================
// 辅助函数：FC 兼容的重定向（返回 HTML 页面，非 302 跳转）
// FC 的 .fcapp.run 域名禁止 302 跳转到外部地址
// ============================================
function fcRedirect(res, url) {
  res.redirect(url);
}

// ============================================
// 飞书日历 OAuth
// ============================================

/// 1. 获取飞书 OAuth 授权 URL（需要登录后调用）
app.get('/api/auth/feishu-auth-url', authMiddleware, async (req, res) => {
  try {
    // 生成随机 state，关联当前用户
    const state = uuidv4();
    const db = await getPool();
    
    // 存储 state 到 feishu_auth_states 表，5分钟过期
    await db.query(
      `INSERT INTO feishu_auth_states (user_id, state, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '5 minutes')`,
      [req.userId, state]
    );

    const redirectUri = config.feishuCallbackUrl ||
      `${req.protocol}://${req.get('host')}/api/auth/feishu-callback`;
    const url = `https://open.feishu.cn/open-apis/authen/v1/index?redirect_uri=${encodeURIComponent(redirectUri)}&app_id=${config.feishuAppId}&scope=openid,profile,calendar:calendar:readonly&state=${state}`;
    res.json({ auth_url: url });
  } catch (error) {
    console.error('生成飞书授权URL失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 2. 飞书 OAuth 回调（通过 state 关联用户）
app.get('/api/auth/feishu-callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return fcRedirect(res, `${config.appUrl}/?auth_error=缺少授权码`);
    }
    if (!state) {
      return fcRedirect(res, `${config.appUrl}/?auth_error=缺少state参数`);
    }

    // 查找 state 关联的用户
    const db = await getPool();
    const stateResult = await db.query(
      'SELECT user_id FROM feishu_auth_states WHERE state = $1 AND expires_at > NOW()',
      [String(state)]
    );
    if (stateResult.rows.length === 0) {
      return fcRedirect(res, `${config.appUrl}/?auth_error=state无效或已过期`);
    }
    const userId = stateResult.rows[0].user_id;

    // 清理已使用的 state
    await db.query('DELETE FROM feishu_auth_states WHERE state = $1', [String(state)]);

    // 用 code 换取 user_access_token
    console.log(`飞书回调: 收到code=${String(code).substring(0,10)}..., state=${String(state).substring(0,10)}...`);
    
    const tokenResp = await fetch('https://open.feishu.cn/open-apis/authen/v1/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ grant_type: 'authorization_code', app_id: config.feishuAppId, app_secret: config.feishuAppSecret, code: String(code) }),
    });

    const tokenRespBody = await tokenResp.text();
    console.log(`飞书token换取响应: status=${tokenResp.status}, body=${tokenRespBody.substring(0, 200)}`);

    if (!tokenResp.ok) {
      console.error('飞书token换取HTTP失败:', tokenRespBody);
      return fcRedirect(res, `${config.appUrl}/?auth_error=token换取失败`);
    }

    const tokenData = JSON.parse(tokenRespBody);
    const accessToken = tokenData.data?.access_token;
    if (!accessToken) {
      console.error('飞书token为空, 完整响应:', tokenRespBody);
      return fcRedirect(res, `${config.appUrl}/?auth_error=token为空`);
    }
    
    console.log(`飞书token换取成功, accessToken前20位: ${accessToken.substring(0, 20)}...`);

    // 获取飞书用户信息
    const userInfoResp = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!userInfoResp.ok) {
      return fcRedirect(res, `${config.appUrl}/?auth_error=用户信息获取失败`);
    }

    const userInfo = await userInfoResp.json();
    const feishuUserId = userInfo.data?.user_id || userInfo.data?.open_id || '';
    const feishuName = userInfo.data?.name || '飞书用户';

    if (!feishuUserId) {
      return fcRedirect(res, `${config.appUrl}/?auth_error=未获取到用户ID`);
    }

    // 存储飞书 Token
    await db.query(
      `INSERT INTO feishu_calendar_tokens (user_id, feishu_user_id, access_token, token_expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '2 hours')
       ON CONFLICT (user_id) DO UPDATE SET
         access_token = EXCLUDED.access_token, feishu_user_id = EXCLUDED.feishu_user_id,
         token_expires_at = EXCLUDED.token_expires_at`,
      [userId, feishuUserId, accessToken]
    );

    // 更新用户表中的飞书连接状态
    await db.query('UPDATE users SET feishu_calendar_connected = true, feishu_name = $1 WHERE id = $2',
      [feishuName, userId]);

    console.log(`飞书日历已连接: 用户 ${userId}, 飞书ID ${feishuUserId}`);

    fcRedirect(res, `${config.appUrl}/?feishu_connected=true`);
  } catch (error) {
    console.error('飞书回调处理失败:', error);
    fcRedirect(res, `${config.appUrl}/?auth_error=${encodeURIComponent(error.message)}`);
  }
});

// ============================================
// 飞书日历同步
// ============================================
// ============================================
// 飞书日历同步
// ============================================

// ============================================

/// 同步飞书日历事件
app.post('/api/events/sync/feishu', authMiddleware, async (req, res) => {
  try {
    const db = await getPool();
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 获取飞书 Token
    const tokenResult = await db.query(
      'SELECT * FROM feishu_calendar_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.userId]
    );
    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: '未连接飞书日历，请先登录' });
    }

    const feishuToken = tokenResult.rows[0];
    const userAccessToken = feishuToken.access_token;

    // 获取过去30天到未来60天的事件
    const now = new Date();
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

    // 1. 获取用户的默认日历
    console.log(`正在获取飞书日历列表...`);
    const calResp = await fetch('https://open.feishu.cn/open-apis/calendar/v4/calendars', {
      headers: { 'Authorization': `Bearer ${userAccessToken}`, 'Content-Type': 'application/json' },
    });
    const calRespText = await calResp.text();
    console.log(`飞书日历列表响应(${calResp.status}): ${calRespText.substring(0, 300)}`);
    if (!calResp.ok) {
      return res.status(502).json({ error: `飞书日历列表获取失败: ${calRespText}` });
    }
    const calData = JSON.parse(calRespText);
    const calendars = calData.data?.calendar_list || [];
    console.log(`飞书日历数量: ${calendars.length}`);
    if (calendars.length === 0) {
      return res.status(400).json({ error: '未找到飞书日历' });
    }

    const primaryCalendarId = calendars[0].calendar_id;

    // 2. 获取日历事件
    const eventUrl = `https://open.feishu.cn/open-apis/calendar/v4/calendars/${encodeURIComponent(primaryCalendarId)}/events?page_size=100`;
    console.log(`正在获取飞书事件: ${eventUrl}`);
    const eventsResp = await fetch(eventUrl, {
      headers: { 'Authorization': `Bearer ${userAccessToken}`, 'Content-Type': 'application/json' },
    });
    const eventsRespText = await eventsResp.text();
    if (!eventsResp.ok) {
      console.error(`飞书事件获取失败: ${eventsRespText}`);
      return res.status(502).json({ error: `飞书日历事件获取失败: ${eventsRespText}` });
    }

    const eventsData = JSON.parse(eventsRespText);
    let events = eventsData.data?.items || [];
    console.log(`飞书事件数量: ${events.length}`);
    if (events.length > 0) {
      console.log(`第一个事件示例: ${JSON.stringify(events[0]).substring(0, 300)}`);
    }

    // 3. 存入 calendar_events 表
    let syncedCount = 0;
    for (const event of events) {
      try {
        // 飞书事件使用 Unix 时间戳格式
        const startTime = event.start_time?.timestamp || '';
        const endTime = event.end_time?.timestamp || '';
        const title = event.summary || '(无标题)';
        const description = event.description || '';
        const location = event.location || event.event_location || '';
        const eventId = event.event_id || '';
        
        if (!startTime || !endTime) {
          console.log(`跳过无时间事件: ${title}`);
          continue;
        }
        
        // 将 Unix 秒时间戳转为 ISO 字符串
        const startISO = new Date(parseInt(startTime) * 1000).toISOString();
        const endISO = new Date(parseInt(endTime) * 1000).toISOString();

        // 先检查是否存在，再插入或更新
        const existing = await db.query(
          'SELECT id FROM calendar_events WHERE user_id = $1 AND source_event_id = $2 AND provider = $3',
          [req.userId, eventId, 'feishu']
        );
        if (existing.rows.length > 0) {
          await db.query(
            'UPDATE calendar_events SET title=$1, description=$2, start_at=$3, end_at=$4, location=$5, updated_at=NOW() WHERE id=$6',
            [title, description, startISO, endISO, location, existing.rows[0].id]
          );
        } else {
          await db.query(
            `INSERT INTO calendar_events (user_id, title, description, provider, start_at, end_at, location, source_event_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [req.userId, title, description, 'feishu', startISO, endISO, location, eventId]
          );
        }
        syncedCount++;
      } catch (e) {
        console.error('存入飞书事件失败:', JSON.stringify({ error: e.message, event: event.summary || event.title }));
      }
    }

    // 4. 更新同步状态
    await db.query(
      `INSERT INTO calendar_sync_status (user_id, provider, last_sync_at, sync_status, events_synced)
       VALUES ($1, 'feishu', NOW(), 'success', $2)
       ON CONFLICT (user_id, provider) DO UPDATE SET
         last_sync_at = NOW(), sync_status = 'success', events_synced = $2`,
      [req.userId, syncedCount]
    );

    await db.query('UPDATE users SET feishu_calendar_connected = true WHERE id = $1', [req.userId]);

    const formattedEvents = events.map(e => ({
      id: e.event_id,
      title: e.summary || '(无标题)',
      description: e.description || '',
      provider: 'feishu',
      start_at: e.start?.datetime || e.start?.date || '',
      end_at: e.end?.datetime || e.end?.date || '',
      location: e.location || e.event_location || '',
    }));

    res.json({ events_synced: syncedCount, total_events: events.length, items: formattedEvents });
  } catch (error) {
    console.error('飞书日历同步失败:', error);
    res.status(500).json({ error: error.message });
  }
});
// ============================================
// 照片上传（阿里云 OSS + RDS）
// ============================================

/// 内存存储 multer 配置
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

/// 生成 OSS 签名 URL（私有读，有效期 1 小时）
async function getSignedUrl(storagePath) {
  const client = getOssClient();
  if (!client) return null;
  try {
    const url = client.signatureUrl(storagePath, { expires: 3600 });
    return url;
  } catch {
    return null;
  }
}

/// 确保 OSS 已配置
function assertOssConfigured() {
  if (!config.ossAccessKeyId || !config.ossAccessKeySecret) {
    throw new Error('OSS 未配置，请先开通阿里云 OSS 并在 .env 中填写 OSS_ACCESS_KEY_ID 和 OSS_ACCESS_KEY_SECRET');
  }
}

/// 1. 上传照片到 OSS（multipart 文件上传）
app.post('/api/photos/upload', upload.single('file'), async (req, res) => {
  try {
    assertOssConfigured();

    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的照片' });
    }

    // 从 JWT 获取用户 ID（如果提供了 token）
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], config.jwtSecret);
        userId = decoded.userId;
      } catch {}
    }

    const ownerEmail = req.body.ownerEmail || 'unknown';
    const originalName = req.file.originalname;
    const ext = (originalName.split('.').pop() || 'jpg').toLowerCase();
    const storagePath = `photos/${uuidv4()}.${ext}`;
    const mimeType = req.file.mimetype || `image/${ext}`;

    // 上传到 OSS
    const client = getOssClient();
    const result = await client.put(storagePath, req.file.buffer, {
      mime: mimeType,
    });

    // 写入 RDS photo_assets 表
    const pool = await getPool();
    const insertResult = await pool.query(
      `insert into photo_assets (user_id, owner_email, file_name, url, storage_path, file_size, mime_type)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id, file_name, storage_path, file_size, mime_type, created_at`,
      [userId, ownerEmail, originalName, result.url, storagePath, req.file.buffer.length, mimeType]
    );

    const asset = insertResult.rows[0];
    // 生成签名 URL 供前端访问
    const signedUrl = await getSignedUrl(storagePath);

    res.json({
      id: asset.id,
      url: signedUrl || asset.url,
      file_name: asset.file_name,
      storage_path: asset.storage_path,
      file_size: asset.file_size,
      mime_type: asset.mime_type,
      created_at: asset.created_at,
    });
  } catch (error) {
    console.error('照片上传失败:', error);
    res.status(500).json({ error: `上传失败: ${error.message}` });
  }
});

/// 2. 通过 base64 JSON 上传照片（解决 Flutter Web multipart 兼容问题）
app.post('/api/photos/upload-base64', async (req, res) => {
  try {
    assertOssConfigured();

    const { imageBase64, fileName, ownerEmail, uploadedBy } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: '缺少 imageBase64 数据' });
    }

    // 从 JWT 获取用户 ID
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], config.jwtSecret);
        userId = decoded.userId;
      } catch {}
    }

    const name = fileName || `photo_${Date.now()}.jpg`;
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    const storagePath = `photos/${uuidv4()}.${ext}`;
    const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

    // 解码 base64
    const buffer = Buffer.from(imageBase64, 'base64');

    // 上传到 OSS
    const client = getOssClient();
    const result = await client.put(storagePath, buffer, {
      mime: mimeType,
    });

    // 写入 RDS
    const pool = await getPool();
    const insertResult = await pool.query(
      `insert into photo_assets (user_id, owner_email, file_name, url, storage_path, file_size, mime_type)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id, file_name, storage_path, file_size, mime_type, created_at`,
      [userId, ownerEmail, name, result.url, storagePath, buffer.length, mimeType]
    );

    const asset = insertResult.rows[0];
    const signedUrl = await getSignedUrl(storagePath);

    res.json({
      id: asset.id,
      url: signedUrl || asset.url,
      file_name: asset.file_name,
      storage_path: asset.storage_path,
      file_size: asset.file_size,
      mime_type: asset.mime_type,
      created_at: asset.created_at,
    });
  } catch (error) {
    console.error('照片上传(base64)失败:', error);
    res.status(500).json({ error: `上传失败: ${error.message}` });
  }
});

/// 3. 获取照片列表（从 RDS 查询，返回 OSS 签名 URL）
app.get('/api/photos', async (req, res) => {
  try {
    const pool = await getPool();
    const { ownerEmail, userId: queryUserId } = req.query;

    let query = `select id, user_id, file_name, storage_path, file_size, mime_type, created_at
                 from photo_assets`;
    const params = [];
    const conditions = [];

    if (queryUserId) {
      conditions.push(`user_id = $${params.length + 1}`);
      params.push(parseInt(queryUserId));
    }

    if (conditions.length > 0) {
      query += ' where ' + conditions.join(' and ');
    }
    query += ' order by created_at desc';

    const result = await pool.query(query, params);

    // 为每个照片生成签名 URL
    const items = await Promise.all(result.rows.map(async (row) => {
      const signedUrl = await getSignedUrl(row.storage_path);
      return {
        id: row.id,
        url: signedUrl || null,
        file_name: row.file_name,
        storage_path: row.storage_path,
        file_size: row.file_size,
        mime_type: row.mime_type,
        created_at: row.created_at,
      };
    }));

    res.json({ items });
  } catch (error) {
    console.error('获取照片列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 图片代理（绕过 OSS CORS，通过后端返回图片）
app.get('/api/photos/image/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    const result = await pool.query(
      'select storage_path from photo_assets where id = $1',
      [parseInt(id)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '照片不存在' });
    }
    const storagePath = result.rows[0].storage_path;
    const client = getOssClient();
    if (!client) {
      return res.status(500).json({ error: 'OSS未配置' });
    }
    // 生成签名URL然后转发请求
    const signedUrl = client.signatureUrl(storagePath, { expires: 300 });
    const fetchRes = await fetch(signedUrl);
    if (!fetchRes.ok) {
      return res.status(502).json({ error: 'OSS读取失败' });
    }
    const contentType = fetchRes.headers.get('content-type') || 'image/jpeg';
    const buffer = await fetchRes.arrayBuffer();
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('图片代理失败:', error.message);
    res.status(500).json({ error: '图片加载失败: ' + error.message });
  }
});

/// 4. 删除照片（从 OSS 和 RDS 同时删除）
app.delete('/api/photos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    // 从 RDS 查询照片信息
    const queryResult = await pool.query(
      'select id, storage_path from photo_assets where id = $1',
      [parseInt(id)]
    );

    if (queryResult.rows.length === 0) {
      return res.status(404).json({ error: '照片不存在' });
    }

    const photo = queryResult.rows[0];

    // 从 OSS 删除文件
    try {
      const client = getOssClient();
      if (client) {
        await client.delete(photo.storage_path);
      }
    } catch (ossErr) {
      console.error('删除 OSS 文件失败:', ossErr.message);
      // 不中断流程，继续删除数据库记录
    }

    // 从 RDS 删除记录
    await pool.query('delete from photo_assets where id = $1', [parseInt(id)]);

    res.json({ success: true, message: '照片已删除' });
  } catch (error) {
    console.error('删除照片失败:', error);
    res.status(500).json({ error: `删除失败: ${error.message}` });
  }
});



// ============================================
// 日历事件 CRUD
// ============================================

/// 查询事件列表（支持按时间范围过滤）
app.get('/api/events', authMiddleware, async (req, res) => {
  try {
    const db = await getPool();
    const { startAt, endAt, provider } = req.query;
    let query = 'SELECT * FROM calendar_events WHERE user_id = $1';
    const params = [req.userId];
    let idx = 2;

    if (startAt) {
      query += ` AND start_at >= $${idx++}`;
      params.push(startAt);
    }
    if (endAt) {
      query += ` AND end_at <= $${idx++}`;
      params.push(endAt);
    }
    if (provider) {
      query += ` AND provider = $${idx++}`;
      params.push(provider);
    }
    query += ' ORDER BY start_at ASC';

    const result = await db.query(query, params);
    res.json({ items: result.rows.map(r => ({ ...r, id: String(r.id) })) });
  } catch (error) {
    console.error('查询事件失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 创建事件
app.post('/api/events', authMiddleware, async (req, res) => {
  try {
    const db = await getPool();
    const { title, description, startAt, endAt, location, provider } = req.body;

    if (!title || !startAt || !endAt) {
      return res.status(400).json({ error: '标题、开始时间、结束时间为必填项' });
    }

    const result = await db.query(
      `INSERT INTO calendar_events (user_id, title, description, provider, start_at, end_at, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.userId, title, description, provider || 'manual', startAt, endAt, location || null]
    );

    const event = result.rows[0];
    res.json({ id: String(event.id), ...event });
  } catch (error) {
    console.error('创建事件失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 语音批量创建事件（framene_v1_1 pipeline 对接）
app.post('/api/events/voice', async (req, res) => {
  try {
    // 双重鉴权：X-API-Key 或 Bearer JWT
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers.authorization;
    let userId = null;

    if (apiKey && config.voiceApiKey && apiKey === config.voiceApiKey) {
      // API Key 模式：用 body 里的 userId 或默认 1
      userId = req.body.userId || 1;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwtSecret);
        userId = decoded.userId;
      } catch {
        return res.status(401).json({ error: 'Token 无效' });
      }
    }

    if (!userId) {
      return res.status(401).json({ error: '未认证：需要 X-API-Key 或 Bearer token' });
    }

    const db = await getPool();
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '缺少 items 数组' });
    }

    const created = [];
    const skipped = [];

    for (const item of items) {
      const { title, description, startAt, endAt, location, provider, ownerEmail } = item;

      if (!title || !startAt || !endAt) {
        skipped.push({ reason: '缺少必填字段(title/startAt/endAt)', item });
        continue;
      }

      const result = await db.query(
        `INSERT INTO calendar_events (user_id, title, description, provider, start_at, end_at, location)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [userId, title, description || null, provider || 'manual', startAt, endAt, location || null]
      );

      const event = result.rows[0];
      created.push({
        id: String(event.id),
        title: event.title,
        description: event.description,
        provider: event.provider,
        startAt: event.start_at,
        endAt: event.end_at,
        location: event.location,
        ownerEmail: ownerEmail || ''
      });
    }

    res.json({
      created: created.length,
      skipped: skipped.length,
      items: created,
      ...(skipped.length > 0 ? { skippedItems: skipped } : {})
    });
  } catch (error) {
    console.error('语音事件批量创建失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 语音转写 + 事件解析（Flutter App → Python Pipeline 桥接）
const { execFile } = require('child_process');
const PIPELINE_DIR = '/Users/lizirui/Desktop/framene_v1_1';

function runPipeline(args, input) {
  return new Promise((resolve, reject) => {
    const child = execFile('python3', args, {
      cwd: PIPELINE_DIR,
      maxBuffer: 1024 * 1024,
      timeout: 60000,
      env: { ...process.env },
    }, (error, stdout, stderr) => {
      if (error) {
        if (stderr) console.error('[pipeline stderr]', stderr);
        return reject(new Error(`Pipeline 执行失败: ${error.message}`));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error('Pipeline 返回了无效 JSON'));
      }
    });
  });
}

app.post('/api/events/voice/transcribe', async (req, res) => {
  try {
    const { text, audio_base64 } = req.body;

    // 文字模式
    if (text && typeof text === 'string' && text.trim().length > 0) {
      const result = await runPipeline(
        ['main.py', '--text', text.trim(), '--json'],
      );
      return res.json({
        rawTranscript: result.rawTranscript || '',
        cleanedRequest: result.cleanedRequest || '',
        events: result.events || [],
        calendarEvents: result.calendarEvents || [],
        warnings: result.warnings || [],
        analysis: result.analysis || {},
        timings: result._timings || {},
      });
    }

    // 音频模式
    if (audio_base64 && typeof audio_base64 === 'string') {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const tmpFile = path.join(os.tmpdir(), `framene_voice_${Date.now()}.wav`);

      // 解码 base64 → WAV 文件
      const buffer = Buffer.from(audio_base64, 'base64');
      fs.writeFileSync(tmpFile, buffer);

      try {
        const result = await runPipeline(
          ['main.py', '--wav', tmpFile, '--json'],
        );
        return res.json({
          rawTranscript: result.rawTranscript || '',
          cleanedRequest: result.cleanedRequest || '',
          events: result.events || [],
          calendarEvents: result.calendarEvents || [],
          warnings: result.warnings || [],
          analysis: result.analysis || {},
          timings: result._timings || {},
        });
      } finally {
        try { fs.unlinkSync(tmpFile); } catch (_) {}
      }
    }

    return res.status(400).json({ error: '缺少 text 或 audio_base64 字段' });
  } catch (error) {
    console.error('语音转写失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 修改事件
app.put('/api/events/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getPool();
    const { id } = req.params;
    const { title, description, startAt, endAt, location } = req.body;

    const check = await db.query(
      'SELECT id FROM calendar_events WHERE id = $1 AND user_id = $2',
      [parseInt(id), req.userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: '事件不存在或无权操作' });
    }

    const updates = [];
    const params = [];
    let idx = 1;

    if (title !== undefined) { updates.push(`title = $${idx++}`); params.push(title); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); params.push(description); }
    if (startAt !== undefined) { updates.push(`start_at = $${idx++}`); params.push(startAt); }
    if (endAt !== undefined) { updates.push(`end_at = $${idx++}`); params.push(endAt); }
    if (location !== undefined) { updates.push(`location = $${idx++}`); params.push(location); }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有需要更新的字段' });
    }

    updates.push('updated_at = NOW()');
    params.push(parseInt(id));
    const result = await db.query(
      `UPDATE calendar_events SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    res.json({ id: String(result.rows[0].id), ...result.rows[0] });
  } catch (error) {
    console.error('修改事件失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 删除事件
app.delete('/api/events/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getPool();
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM calendar_events WHERE id = $1 AND user_id = $2 RETURNING id',
      [parseInt(id), req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '事件不存在或无权操作' });
    }

    res.json({ success: true, message: '事件已删除' });
  } catch (error) {
    console.error('删除事件失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 日历成员共享 API
// ============================================

/// 获取成员列表
app.get('/api/members', authMiddleware, async (req, res) => {
  try {
    const db = await getPool();
    const result = await db.query(
      'SELECT * FROM calendar_members ORDER BY created_at ASC'
    );
    res.json({ items: result.rows.map(r => ({ ...r, id: String(r.id) })) });
  } catch (error) {
    console.error('获取成员列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 邀请成员
app.post('/api/members', authMiddleware, async (req, res) => {
  try {
    const db = await getPool();
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: '邮箱和名称为必填项' });
    }

    const result = await db.query(
      `INSERT INTO calendar_members (email, name, invited_by, role, status)
       VALUES ($1, $2, $3, 'member', 'pending')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, invited_by = EXCLUDED.invited_by
       RETURNING *`,
      [email, name, req.userId]
    );

    const member = result.rows[0];
    res.json({ id: String(member.id), ...member });
  } catch (error) {
    console.error('邀请成员失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 移除成员
app.delete('/api/members/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getPool();
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM calendar_members WHERE id = $1 RETURNING id',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '成员不存在' });
    }

    res.json({ success: true, message: '成员已移除' });
  } catch (error) {
    console.error('移除成员失败:', error);
    res.status(500).json({ error: error.message });
  }
});
// ============================================
// 健康检查
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// Web 端 API（读写 web_calendar_events 和 device_accounts 表）
// ============================================

/// 新增：在 ensureAllTables 中创建 web_calendar_events 和 device_accounts 表（如不存在）
/// 这些表在之前版本中已通过单独脚本创建，这里确保自动创建
async function ensureWebTables() {
  try {
    const pool = await getPool();
    // web_calendar_events 表
    await pool.query(`create table if not exists web_calendar_events (
      id serial primary key,
      source_app_user_id varchar(255),
      source_email varchar(255),
      title varchar(255) not null,
      description text,
      start_at timestamptz not null,
      end_at timestamptz not null,
      location text,
      status varchar(20) not null default 'active',
      synced_at timestamptz not null default now(),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );`);
    await pool.query('create index if not exists web_calendar_events_source_email_idx on web_calendar_events (source_email)');
    await pool.query('create index if not exists web_calendar_events_start_at_idx on web_calendar_events (start_at asc)');

    // device_accounts 表
    await pool.query(`create table if not exists device_accounts (
      id serial primary key,
      email varchar(255) not null,
      name varchar(255),
      avatar_url text,
      login_provider varchar(50) default 'email',
      status varchar(20) not null default 'active',
      last_sync_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );`);
    await pool.query('create unique index if not exists device_accounts_email_idx on device_accounts (email)');

    // user_completed_events 表
    await pool.query(`create table if not exists user_completed_events (
      id serial primary key,
      source_app_user_id varchar(255),
      source_email varchar(255),
      title varchar(255) not null,
      completed_at timestamptz not null default now(),
      created_at timestamptz not null default now()
    );`);
    await pool.query('create index if not exists user_completed_events_source_email_idx on user_completed_events (source_email)');

    console.log('✅ Web 端业务表已就绪');
  } catch (err) {
    console.error('❌ 初始化 Web 业务表失败:', err.message);
  }
}

/// 1. 获取 Web 端日程列表
app.get('/api/web/events', async (req, res) => {
  try {
    const pool = await getPool();
    const { startAt, endAt, sourceEmail } = req.query;
    let query = 'SELECT * FROM web_calendar_events WHERE status = $1';
    const params = ['active'];
    let idx = 2;

    if (startAt) {
      query += ` AND start_at >= $${idx++}`;
      params.push(startAt);
    }
    if (endAt) {
      query += ` AND end_at <= $${idx++}`;
      params.push(endAt);
    }
    if (sourceEmail) {
      query += ` AND source_email = $${idx++}`;
      params.push(sourceEmail);
    }
    query += ' ORDER BY start_at ASC';

    const result = await pool.query(query, params);
    res.json({ items: result.rows.map(r => ({ ...r, id: String(r.id) })) });
  } catch (error) {
    console.error('查询 Web 日程失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 2. App 同步日程到 Web（全量覆盖）
app.post('/api/web/events/sync', async (req, res) => {
  try {
    const pool = await getPool();
    const { items, sourceEmail } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '缺少 items 数组' });
    }

    // 如果指定了 sourceEmail，删除该邮箱原有 Web 日程
    if (sourceEmail) {
      await pool.query('DELETE FROM web_calendar_events WHERE source_email = $1', [sourceEmail]);
    }

    const created = [];
    for (const item of items) {
      const { title, startAt, endAt, description, location, sourceAppUserId } = item;
      if (!title || !startAt || !endAt) continue;

      const result = await pool.query(
        `INSERT INTO web_calendar_events (source_app_user_id, source_email, title, description, start_at, end_at, location, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING *`,
        [sourceAppUserId || null, sourceEmail || null, title, description || null, startAt, endAt, location || null]
      );
      const row = result.rows[0];
      created.push({ id: String(row.id), ...row });
    }

    res.json({ synced: created.length, items: created });
  } catch (error) {
    console.error('同步日程到 Web 失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 3. 设备账号同步（服务端直连 RDS：从 calendar_events 拉取到 web_calendar_events）
app.post('/api/web/events/sync-from-account', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: '缺少 email 参数' });
    }

    const pool = await getPool();

    // 查找用户
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    const userId = userResult.rows[0].id;

    // 清空该邮箱旧的 Web 日程
    await pool.query('DELETE FROM web_calendar_events WHERE source_email = $1', [email]);

    // 从 calendar_events 拉取事件
    const eventsResult = await pool.query(
      'SELECT * FROM calendar_events WHERE user_id = $1 ORDER BY start_at ASC',
      [userId]
    );

    let synced = 0;
    const items = [];
    for (const ev of eventsResult.rows) {
      await pool.query(
        `INSERT INTO web_calendar_events (source_app_user_id, source_email, title, description, start_at, end_at, location, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [String(userId), email, ev.title, ev.description || null, ev.start_at, ev.end_at, ev.location || null]
      );
      synced++;
      items.push({
        id: String(ev.id),
        title: ev.title,
        startAt: ev.start_at,
        endAt: ev.end_at,
      });
    }

    // 更新设备账号同步时间
    await pool.query(
      'UPDATE device_accounts SET last_sync_at = NOW() WHERE email = $1',
      [email]
    );

    res.json({ synced, message: `已同步 ${synced} 条日程`, items });
  } catch (error) {
    console.error('服务端同步失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 4. AI 解析自然语言日程文本（DeepSeek + 正则降级）
app.post('/api/web/events/parse-voice', async (req, res) => {
  try {
    const { text, timezone, utcOffset } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: '缺少 text 参数' });
    }

    const deepseekKey = process.env.DEEPSEEK_API_KEY || process.env.VOICE_API_KEY || '';

    // 先尝试 DeepSeek AI 解析
    if (deepseekKey) {
      try {
        const now = new Date();
        const tz = timezone || 'Asia/Shanghai';
        const offset = utcOffset !== undefined ? utcOffset : -now.getTimezoneOffset();

        const aiPrompt = `你是一个日程解析助手。当前时间：${now.toISOString()}，用户时区：${tz}（UTC${offset >= 0 ? '+' : ''}${Math.floor(offset / 60)}:${String(Math.abs(offset) % 60).padStart(2, '0')}）。

请将以下自然语言日程描述解析为 JSON 数组，每个元素包含 title、startAt、endAt（ISO 格式，含时区后缀）、location（可选）。

规则：
- 如果未指定日期，默认今天
- 如果未指定结束时间，默认开始时间后 30 分钟
- 时间使用用户时区计算
- 时间格式如：2026-06-17T14:00:00+08:00
- 如果没有提到地点，location 设为空字符串
- 仅返回 JSON 数组，不要其他文字

用户输入：${text}`;

        const aiResp = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: aiPrompt }],
            temperature: 0.1,
            max_tokens: 2000,
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const aiContent = aiData.choices?.[0]?.message?.content || '[]';
          const cleaned = aiContent.replace(/```json?/gi, '').replace(/```/g, '').trim();
          const aiItems = JSON.parse(cleaned);
          if (Array.isArray(aiItems) && aiItems.length > 0) {
            return res.json({ source: 'ai', items: aiItems });
          }
        }
      } catch (aiError) {
        console.error('DeepSeek AI 解析失败:', aiError.message);
        // 降级到正则
      }
    }

    // 降级：简单正则解析
    const items = parseBasicEvents(text);
    res.json({ source: 'regex', items });
  } catch (error) {
    console.error('语音解析失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 辅助函数：简单正则解析日程文本（降级方案）
function parseBasicEvents(text) {
  const items = [];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // 尝试匹配 "早上/上午/下午/晚上 X点" 等时间模式
  const timePatterns = [
    /(?:今|明|后)天?(?:早上|上午|早晨|中午|下午|晚上|深夜)?\s*(\d+)\s*点(?:\s*(\d+))?\s*钟?\s*(?:去|到|做|吃|参加)?\s*(.+?)(?=[，。,.\s]|$)/g,
    /(.+?)(?:在|于|从)\s*(?:今|明|后)天?(?:早上|上午|早晨|中午|下午|晚上|深夜)?\s*(\d+)\s*点(?:\s*(\d+))?\s*钟?/g,
    /(\d+)\s*点(?:\s*(\d+))?\s*(.+?)(?=[，。,.\s]|$)/g,
  ];

  for (const pattern of timePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const groups = match.filter(g => g !== undefined);
      let title, hour, minute;

      if (groups.length >= 3) {
        // Try to find hour, minute, title
        if (/^\d+$/.test(groups[1])) {
          hour = parseInt(groups[1]);
          minute = groups[2] && /^\d+$/.test(groups[2]) ? parseInt(groups[2]) : 0;
          title = groups[groups.length - 1];
        } else {
          hour = parseInt(groups[groups.length - 2]);
          minute = groups[groups.length - 1] && /^\d+$/.test(groups[groups.length - 1]) ? parseInt(groups[groups.length - 1]) : 0;
          title = groups[1];
        }

        const startAt = `${today}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
        const endDate = new Date(now);
        endDate.setHours(hour, (minute || 0) + 30);
        const endAt = `${today}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00`;

        if (title && title.length < 30) {
          items.push({ title: title.trim(), startAt, endAt, location: '' });
        }
      }
    }
    if (items.length > 0) break; // 只要一组模式匹配成功就返回
  }

  return items;
}

/// 5. 语音创建日程（直接写入 web_calendar_events）
app.post('/api/web/events/voice-create', async (req, res) => {
  try {
    const pool = await getPool();
    const { items, sourceEmail, sourceAppUserId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '缺少 items 数组' });
    }

    const created = [];
    for (const item of items) {
      const { title, startAt, endAt, description, location } = item;
      if (!title || !startAt || !endAt) continue;

      const result = await pool.query(
        `INSERT INTO web_calendar_events (source_app_user_id, source_email, title, description, start_at, end_at, location)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, title, start_at, end_at`,
        [sourceAppUserId || null, sourceEmail || null, title, description || null, startAt, endAt, location || null]
      );
      const row = result.rows[0];
      created.push({ id: String(row.id), title: row.title, startAt: row.start_at, endAt: row.end_at });
    }

    res.json({ items: created, count: created.length });
  } catch (error) {
    console.error('语音创建日程失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 6. 切换完成状态
app.put('/api/web/events/:id/complete', async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    // 获取当前事件
    const currentResult = await pool.query('SELECT * FROM web_calendar_events WHERE id = $1', [parseInt(id)]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: '事件不存在' });
    }

    const event = currentResult.rows[0];
    const newStatus = event.status === 'completed' ? 'active' : 'completed';

    // 更新状态
    await pool.query(
      'UPDATE web_calendar_events SET status = $1, updated_at = NOW() WHERE id = $2',
      [newStatus, parseInt(id)]
    );

    // 如果标记为完成，记录到 user_completed_events 表
    if (newStatus === 'completed') {
      await pool.query(
        `INSERT INTO user_completed_events (event_id, source_app_user_id, source_email, title, completed_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [parseInt(id), event.source_app_user_id, event.source_email, event.title]
      );
    }

    res.json({ success: true, status: newStatus });
  } catch (error) {
    console.error('切换完成状态失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 7. 物理删除 Web 端日程
app.delete('/api/web/events/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM web_calendar_events WHERE id = $1 RETURNING id',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '事件不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('删除 Web 日程失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 8. 获取已完成记录
app.get('/api/web/events/completed-records', async (req, res) => {
  try {
    const pool = await getPool();
    const { email } = req.query;

    let query = 'SELECT * FROM user_completed_events';
    const params = [];

    if (email) {
      query += ' WHERE source_email = $1';
      params.push(email);
    }
    query += ' ORDER BY completed_at DESC';

    const result = await pool.query(query, params);
    res.json({ items: result.rows.map(r => ({ ...r, id: String(r.id) })) });
  } catch (error) {
    console.error('获取完成记录失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 9. 获取已完成统计（按用户分组）
app.get('/api/web/events/completed-summary', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.query(
      `SELECT source_email, source_app_user_id, count(*) as total_completed, max(completed_at) as last_completed_at
       FROM user_completed_events
       GROUP BY source_email, source_app_user_id
       ORDER BY count(*) DESC`
    );
    res.json({ items: result.rows });
  } catch (error) {
    console.error('获取完成统计失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 10. 获取设备账号列表
app.get('/api/web/accounts', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.query(
      'SELECT * FROM device_accounts WHERE status = $1 ORDER BY created_at ASC',
      ['active']
    );
    res.json({ items: result.rows.map(r => ({ ...r, id: String(r.id) })) });
  } catch (error) {
    console.error('获取设备账号失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 11. 同步/注册设备账号
app.post('/api/web/accounts/sync', async (req, res) => {
  try {
    const pool = await getPool();
    const { email, name, loginProvider } = req.body;

    if (!email) {
      return res.status(400).json({ error: '缺少 email 参数' });
    }

    // 检查账号数量上限（5 个）
    const countResult = await pool.query(
      "SELECT COUNT(*) as count FROM device_accounts WHERE status = 'active'"
    );
    if (parseInt(countResult.rows[0].count) >= 5) {
      // 如果已存在此邮箱，允许更新
      const existing = await pool.query('SELECT id FROM device_accounts WHERE email = $1', [email]);
      if (existing.rows.length === 0) {
        return res.status(400).json({ error: '设备账号已达上限（最多 5 个）' });
      }
    }

    // 插入或更新
    const result = await pool.query(
      `INSERT INTO device_accounts (email, name, login_provider)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name, login_provider = EXCLUDED.login_provider, updated_at = NOW()
       RETURNING *`,
      [email, name || email.split('@')[0], loginProvider || 'email']
    );

    const row = result.rows[0];
    res.json({ id: String(row.id), ...row });
  } catch (error) {
    console.error('同步设备账号失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 12. 删除设备账号（同时删除关联 Web 日程）
app.delete('/api/web/accounts/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    // 查找账号获取 email
    const accountResult = await pool.query('SELECT * FROM device_accounts WHERE id = $1', [parseInt(id)]);
    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: '账号不存在' });
    }

    const account = accountResult.rows[0];

    // 删除关联的 Web 日程
    await pool.query('DELETE FROM web_calendar_events WHERE source_email = $1', [account.email]);
    // 删除账号
    await pool.query('DELETE FROM device_accounts WHERE id = $1', [parseInt(id)]);

    res.json({ success: true, message: '账号已删除' });
  } catch (error) {
    console.error('删除设备账号失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 启动服务器
// 兼容本地开发（PORT）和阿里云 FC 自定义运行时（FC_SERVER_PORT）
const PORT = process.env.FC_SERVER_PORT || process.env.PORT || 3000;
app.listen(PORT, async () => {
  // 初始化 RDS 表
  await ensureAllTables();
  await ensureWebTables();

  console.log(`FrameNe API 服务已启动，端口: ${PORT}`);
  console.log('环境变量检查:');
  console.log(`  - DATABASE_URL: ${config.databaseUrl ? '已配置' : '未配置'}`);
  console.log(`  - SMS: ${config.smsSignName ? '已配置' : '未配置'}`);
  console.log(`  - EMAIL: ${config.emailSenderAddress || '未配置'}`);
  console.log(`  - DINGTALK: ${config.dingtalkAppKey ? '已配置' : '未配置'}`);
});

module.exports = app;
