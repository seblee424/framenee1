// ============================================
// FrameNe 后端 API 服务
// 部署到阿里云函数计算 FC
// ============================================
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Core = require('@alicloud/pop-core');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// 配置（通过环境变量注入）
// ============================================
const config = {
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'framene-dev-secret-key',

  // 数据库
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: parseInt(process.env.DB_PORT || '3306'),
  dbUser: process.env.DB_USER || 'root',
  dbPassword: process.env.DB_PASSWORD || '',
  dbName: process.env.DB_NAME || 'framene',

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

  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google-callback',

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',

  // 前端地址（OAuth 回调后重定向回来）
  appUrl: process.env.APP_URL || 'http://localhost:8080',
};

// ============================================
// 数据库连接池
// ============================================
let pool;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.dbHost,
      port: config.dbPort,
      user: config.dbUser,
      password: config.dbPassword,
      database: config.dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
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
    await db.execute(
      'INSERT INTO verification_codes (phone, code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))',
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
    const [codes] = await db.execute(
      'SELECT * FROM verification_codes WHERE phone = ? AND code = ? AND used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [phone, code]
    );

    if (codes.length === 0) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }

    // 标记验证码已使用
    await db.execute('UPDATE verification_codes SET used = true WHERE id = ?', [codes[0].id]);

    // 查找或创建用户
    let [users] = await db.execute('SELECT * FROM users WHERE phone = ?', [phone]);

    let user;
    if (users.length === 0) {
      // 新用户自动注册
      const [result] = await db.execute(
        'INSERT INTO users (phone, name, login_provider) VALUES (?, ?, ?)',
        [phone, phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'), 'phone']
      );
      [users] = await db.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
      user = users[0];
    } else {
      user = users[0];
    }

    // 生成 JWT
    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
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

    // 检查邮箱是否已被注册
    const db = await getPool();
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    // 生成验证码
    const code = generateCode();

    // 发送邮件
    await sendEmailCode(email, code);

    // 存储验证码到数据库
    await db.execute(
      'INSERT INTO email_verification_codes (email, code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))',
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
    const [codes] = await db.execute(
      'SELECT * FROM email_verification_codes WHERE email = ? AND code = ? AND used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, code]
    );

    if (codes.length === 0) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }

    // 标记验证码已使用
    await db.execute('UPDATE email_verification_codes SET used = true WHERE id = ?', [codes[0].id]);

    // 再次检查邮箱是否已被注册（防止并发）
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    // 密码加密
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const [result] = await db.execute(
      'INSERT INTO users (email, password_hash, name, login_provider) VALUES (?, ?, ?, ?)',
      [email, passwordHash, name, 'email']
    );

    // 生成 JWT
    const token = generateToken(result.insertId);

    res.json({
      token,
      user: {
        id: result.insertId,
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
// 5. 邮箱密码登录（保留原有功能）
// ============================================
app.post('/api/auth/email-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '请填写邮箱和密码' });
    }

    const db = await getPool();
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(400).json({ error: '邮箱或密码错误' });
    }

    const user = users[0];

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
        id: user.id,
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
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    // 密码加密
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const [result] = await db.execute(
      'INSERT INTO users (email, password_hash, name, login_provider) VALUES (?, ?, ?, ?)',
      [email, passwordHash, name, 'email']
    );

    // 生成 JWT
    const token = generateToken(result.insertId);

    res.json({
      token,
      user: {
        id: result.insertId,
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
    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [req.userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = users[0];
    res.json({
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      login_provider: user.login_provider,
      google_calendar_connected: user.google_calendar_connected,
      dingtalk_calendar_connected: user.dingtalk_calendar_connected,
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
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
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/dingtalk-callback`;
  const url = `https://login.dingtalk.com/oauth2/auth?redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&client_id=${config.dingtalkAppKey}&scope=openid&state=STATE`;
  res.json({ auth_url: url });
});

app.post('/api/auth/dingtalk-callback', async (req, res) => {
  // TODO: 实现钉钉登录回调
  res.json({ error: '钉钉登录尚未实现' });
});

// ============================================
// Google OAuth 路由
// ============================================

/// 1. 获取 Google OAuth 授权 URL
app.get('/api/auth/google-auth-url', (req, res) => {
  if (!config.googleClientId) {
    return res.status(500).json({ error: 'Google OAuth 未配置（GOOGLE_CLIENT_ID）' });
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', config.googleClientId);
  authUrl.searchParams.set('redirect_uri', config.googleRedirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.readonly email profile');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  res.json({ auth_url: authUrl.toString() });
});
/// 2. 处理 Google OAuth 回调（授权码换 Token）
/// Google 重定向到这里 → 后端换取 token → 存到 Supabase
app.get('/api/auth/google-callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.send(googleCallbackHtml(false, '缺少授权码'));
    }

    // 用授权码交换 token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: config.googleRedirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error('Google token exchange failed:', tokenData);
      return res.send(googleCallbackHtml(false, tokenData.error_description || tokenData.error));
    }

    // 从 id_token 中获取用户邮箱（JWT 解码 payload）
    let userEmail = 'unknown';
    try {
      const idToken = tokenData.id_token;
      if (idToken) {
        const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
        userEmail = payload.email || 'unknown';
      }
    } catch (e) {
      console.error('Failed to decode Google id_token:', e.message);
    }

    // 直接通过 Supabase REST API 存储 token（不需要 Edge Function）
    const supabaseHeaders = {
      'Content-Type': 'application/json',
      'apikey': config.supabaseAnonKey,
      'Authorization': `Bearer ${config.supabaseAnonKey}`,
      'Prefer': 'resolution=merge-duplicates',
    };

    await fetch(`${config.supabaseUrl}/rest/v1/google_calendar_tokens`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify({
        user_id: userEmail,         // 用 email 作为 user_id（简化处理）
        email: userEmail,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || '',
        token_expires_at: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
      }),
    });

    res.send(googleCallbackHtml(true));
  } catch (error) {
    console.error('Google OAuth 回调失败:', error);
    res.send(googleCallbackHtml(false, error.message));
  }
});

function googleCallbackHtml(success, message) {
  if (success) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>授权成功</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5}.card{text-align:center;background:white;padding:48px;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.08)}.icon{font-size:64px;margin-bottom:16px}h2{color:#333;margin:0 0 8px}p{color:#666;margin:0 0 24px}.btn{background:#1a73e8;color:white;border:none;padding:12px 32px;border-radius:8px;font-size:14px;cursor:pointer}.btn:hover{background:#1557b0}</style></head><body><div class="card"><div class="icon">✅</div><h2>Google 日历授权成功</h2><p>你的 Google 日历已成功连接到 FrameNe</p><button class="btn" onclick="window.close()">关闭窗口</button><script>setTimeout(function(){window.close()},2000)</script></div></body></html>`;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>授权失败</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5}.card{text-align:center;background:white;padding:48px;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.08)}.icon{font-size:64px;margin-bottom:16px}h2{color:#e53935;margin:0 0 8px}p{color:#666;margin:0 0 8px}.detail{color:#999;font-size:13px}</style></head><body><div class="card"><div class="icon">❌</div><h2>Google 日历授权失败</h2><p>${message || '请重试'}</p><p class="detail">请关闭此窗口后重试</p><button class="btn" onclick="window.close()" style="background:#e53935;color:white;border:none;padding:12px 32px;border-radius:8px;font-size:14px;cursor:pointer">关闭窗口</button></div></body></html>`;
}

/// POST 版本回调（供前端 JSON API 调用）
app.post('/api/auth/google-callback', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: '缺少授权码' });
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: config.googleRedirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return res.status(400).json({ error: `Google token exchange failed: ${tokenData.error_description || tokenData.error}` });
    }

    const authHeader = req.headers.authorization;
    if (authHeader && config.supabaseUrl) {
      await fetch(`${config.supabaseUrl}/functions/v1/store-google-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + (tokenData.expires_in || 3600),
        }),
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/// 3. 检查 Google 日历是否已连接（按邮箱查询 Supabase）
app.get('/api/auth/google-connected', async (req, res) => {
  const email = req.query.email;
  if (!email || !config.supabaseUrl) {
    return res.json({ connected: false });
  }

  try {
    const response = await fetch(
      `${config.supabaseUrl}/rest/v1/google_calendar_tokens?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
      { headers: { 'apikey': config.supabaseAnonKey } }
    );
    const data = await response.json();
    res.json({ connected: Array.isArray(data) && data.length > 0 });
  } catch (error) {
    res.json({ connected: false });
  }
});

/// 4. 同步 Google 日历事件（后端直接调用 Google Calendar API）
app.post('/api/events/sync/google', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: '缺少 email 参数' });
    }

    // 从 Supabase 读取 token
    const tokenResponse = await fetch(
      `${config.supabaseUrl}/rest/v1/google_calendar_tokens?email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=1`,
      { headers: { 'apikey': config.supabaseAnonKey } }
    );
    const tokenData = await tokenResponse.json();

    if (!Array.isArray(tokenData) || tokenData.length === 0) {
      return res.status(400).json({ error: 'Google Calendar not connected. Please sign in with Google first.' });
    }

    let token = tokenData[0];
    let accessToken = token.access_token;

    // 检查 token 是否过期
    const expiresAt = new Date(token.token_expires_at);
    if (new Date() > expiresAt && token.refresh_token) {
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.googleClientId,
          client_secret: config.googleClientSecret,
          refresh_token: token.refresh_token,
          grant_type: 'refresh_token',
        }),
      });
      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // 更新 token
      await fetch(`${config.supabaseUrl}/rest/v1/google_calendar_tokens?email=eq.${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.supabaseAnonKey,
          'Authorization': `Bearer ${config.supabaseAnonKey}`,
        },
        body: JSON.stringify({
          access_token: accessToken,
          token_expires_at: new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString(),
        }),
      });
    }

    // 调用 Google Calendar API 获取事件
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59).toISOString();

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      return res.status(500).json({ error: `Google Calendar API error: ${errorText}` });
    }

    const calendarData = await calendarResponse.json();
    const events = calendarData.items || [];

    // 存到 Supabase calendar_events_cache 表
    const supabaseHeaders = {
      'Content-Type': 'application/json',
      'apikey': config.supabaseAnonKey,
      'Authorization': `Bearer ${config.supabaseAnonKey}`,
    };

    let syncedCount = 0;
    for (const event of events) {
      const { error: upsertError } = await fetch(`${config.supabaseUrl}/rest/v1/calendar_events_cache`, {
        method: 'POST',
        headers: { ...supabaseHeaders, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          user_id: email,
          google_event_id: event.id,
          title: event.summary || '(無標題)',
          description: event.description || '',
          start_at: (event.start?.dateTime || event.start?.date || now.toISOString()),
          end_at: (event.end?.dateTime || event.end?.date || now.toISOString()),
          location: event.location || '',
          raw_data: event,
        }),
      });
      if (!upsertError) syncedCount++;
    }

    // 返回格式化的事件列表
    const formattedEvents = events.map(e => ({
      id: e.id,
      title: e.summary || '(無標題)',
      description: e.description || '',
      provider: 'google',
      startAt: e.start?.dateTime || e.start?.date || '',
      endAt: e.end?.dateTime || e.end?.date || '',
      location: e.location || '',
      ownerEmail: email,
    }));

    res.json({
      success: true,
      events_synced: syncedCount,
      total_events: events.length,
      items: formattedEvents.slice(0, 100), // 最多返回 100 条
    });
  } catch (error) {
    console.error('Google 日历同步失败:', error);
    res.status(500).json({ error: `Google 日历同步失败: ${error.message}` });
  }
});

// ============================================
// 照片上传（Supabase Storage）
// ============================================

/// 内存存储 multer 配置
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

/// Supabase Storage 公共 URL 前缀
const SUPABASE_STORAGE_URL = `${config.supabaseUrl}/storage/v1/object/public/frame-photos`;

/// 1. 上传照片到 Supabase Storage
app.post('/api/photos/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的照片' });
    }

    const ownerEmail = req.body.ownerEmail || 'unknown';
    const uploadedBy = req.body.uploadedBy || ownerEmail;
    const originalName = req.file.originalname;
    const ext = originalName.split('.').pop() || 'jpg';
    const storagePath = `photos/${uuidv4()}.${ext}`;

    // 上传文件到 Supabase Storage
    const uploadResponse = await fetch(`${config.supabaseUrl}/storage/v1/object/frame-photos/${storagePath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.supabaseAnonKey}`,
        'Content-Type': req.file.mimetype,
      },
      body: req.file.buffer,
    });

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      return res.status(500).json({ error: `上传到 Supabase Storage 失败: ${errText}` });
    }

    // 生成公共访问 URL
    const publicUrl = `${SUPABASE_STORAGE_URL}/${storagePath}`;

    // 写入 photo_assets 表
    const insertResponse = await fetch(`${config.supabaseUrl}/rest/v1/photo_assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.supabaseAnonKey}`,
        'apikey': config.supabaseAnonKey,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        owner_email: ownerEmail,
        uploaded_by: uploadedBy,
        file_name: originalName,
        url: publicUrl,
        storage_path: storagePath,
      }),
    });

    if (!insertResponse.ok) {
      const errText = await insertResponse.text();
      return res.status(500).json({ error: `写入 photo_assets 表失败: ${errText}` });
    }

    const record = await insertResponse.json();
    // record may be an array (when Prefer: return=representation)
    const asset = Array.isArray(record) ? record[0] : record;

    res.json({
      id: asset.id,
      url: asset.url,
      file_name: asset.file_name,
      storage_path: asset.storage_path,
      owner_email: asset.owner_email,
      uploaded_by: asset.uploaded_by,
      created_at: asset.created_at,
    });
  } catch (error) {
    console.error('照片上传失败:', error);
    res.status(500).json({ error: `上传失败: ${error.message}` });
  }
});

/// 3. 通过 base64 JSON 上传照片（解决 Flutter Web multipart 兼容问题）
app.post('/api/photos/upload-base64', async (req, res) => {
  try {
    const { imageBase64, fileName, ownerEmail, uploadedBy } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: '缺少 imageBase64 数据' });
    }

    const email = ownerEmail || 'unknown';
    const uploader = uploadedBy || email;
    const name = fileName || `photo_${Date.now()}.jpg`;
    const ext = name.split('.').pop() || 'jpg';
    const storagePath = `photos/${uuidv4()}.${ext}`;

    // 解码 base64
    const buffer = Buffer.from(imageBase64, 'base64');

    // 上传到 Supabase Storage
    const uploadResponse = await fetch(`${config.supabaseUrl}/storage/v1/object/frame-photos/${storagePath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.supabaseAnonKey}`,
        'Content-Type': 'image/jpeg',
      },
      body: buffer,
    });

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      return res.status(500).json({ error: `上传到 Supabase Storage 失败: ${errText}` });
    }

    const publicUrl = `${SUPABASE_STORAGE_URL}/${storagePath}`;

    // 写入 photo_assets 表
    const insertResponse = await fetch(`${config.supabaseUrl}/rest/v1/photo_assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.supabaseAnonKey}`,
        'apikey': config.supabaseAnonKey,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        owner_email: email,
        uploaded_by: uploader,
        file_name: name,
        url: publicUrl,
        storage_path: storagePath,
      }),
    });

    if (!insertResponse.ok) {
      const errText = await insertResponse.text();
      return res.status(500).json({ error: `写入 photo_assets 表失败: ${errText}` });
    }

    const record = await insertResponse.json();
    const asset = Array.isArray(record) ? record[0] : record;

    res.json({
      id: asset.id,
      url: asset.url,
      file_name: asset.file_name,
      storage_path: asset.storage_path,
      owner_email: asset.owner_email,
      uploaded_by: asset.uploaded_by,
      created_at: asset.created_at,
    });
  } catch (error) {
    console.error('照片上传(base64)失败:', error);
    res.status(500).json({ error: `上传失败: ${error.message}` });
  }
});
app.get('/api/photos', async (req, res) => {
  try {
    const ownerEmail = req.query.ownerEmail;
    let queryUrl = `${config.supabaseUrl}/rest/v1/photo_assets?select=*&order=created_at.desc`;

    if (ownerEmail) {
      queryUrl += `&owner_email=eq.${encodeURIComponent(ownerEmail)}`;
    }

    const response = await fetch(queryUrl, {
      headers: {
        'Authorization': `Bearer ${config.supabaseAnonKey}`,
        'apikey': config.supabaseAnonKey,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: errText });
    }

    const items = await response.json();

    res.json({
      items: items.map(item => ({
        id: item.id,
        url: item.url,
        file_name: item.file_name,
        storage_path: item.storage_path,
        owner_email: item.owner_email,
        uploaded_by: item.uploaded_by,
        created_at: item.created_at,
      })),
    });
  } catch (error) {
    console.error('获取照片列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/// 4. 删除照片（从 Supabase Storage 和数据库同时删除）
app.delete('/api/photos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 先从数据库查到这个照片的信息
    const queryResponse = await fetch(
      `${config.supabaseUrl}/rest/v1/photo_assets?id=eq.${id}&select=*`,
      { headers: { 'apikey': config.supabaseAnonKey } }
    );
    const records = await queryResponse.json();

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(404).json({ error: '照片不存在' });
    }

    const photo = records[0];

    // 从 Supabase Storage 删除文件
    const storagePath = photo.storage_path;
    if (storagePath) {
      const deleteResponse = await fetch(
        `${config.supabaseUrl}/storage/v1/object/frame-photos/${storagePath}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${config.supabaseAnonKey}`,
          },
        }
      );
      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        console.error('删除 Storage 文件失败:', await deleteResponse.text());
      }
    }

    // 从 photo_assets 表删除记录
    const deleteDbResponse = await fetch(
      `${config.supabaseUrl}/rest/v1/photo_assets?id=eq.${id}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': config.supabaseAnonKey,
          'Authorization': `Bearer ${config.supabaseAnonKey}`,
          'Prefer': 'return=representation',
        },
      }
    );

    if (!deleteDbResponse.ok) {
      const errText = await deleteDbResponse.text();
      return res.status(500).json({ error: `删除数据库记录失败: ${errText}` });
    }

    res.json({ success: true, message: '照片已删除' });
  } catch (error) {
    console.error('删除照片失败:', error);
    res.status(500).json({ error: `删除失败: ${error.message}` });
  }
});

// ============================================
// 健康检查
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// 启动服务器
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FrameNe API 服务已启动，端口: ${PORT}`);
  console.log('环境变量检查:');
  console.log(`  - DB_HOST: ${config.dbHost}`);
  console.log(`  - SMS: ${config.smsSignName ? '已配置' : '未配置'}`);
  console.log(`  - EMAIL: ${config.emailSenderAddress || '未配置'}`);
  console.log(`  - DINGTALK: ${config.dingtalkAppKey ? '已配置' : '未配置'}`);
});

module.exports = app;
