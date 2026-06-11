# FrameNe 协作开发同步指南

> 本文档记录与开发者伙伴同步项目时，A（你）需提供的配置和 B（伙伴）需自己操作的内容。
> **每次同步代码后，更新本文档末尾的「同步记录」并上传到 GitHub。**

---

## 一、项目结构

```
framenee1/                     # GitHub 仓库 (seblee424/framenee1)
├── frame_app/                 # 前端代码
│   ├── src/                   # React (Vite + shadcn + MUI)
│   └── flutter_oss_example/   # Flutter Web 手机端
├── framene-server/            # Express 后端
│   ├── index.js               # 所有 API 路由
│   ├── .env.example           # 环境变量模板
│   ├── SYNC_GUIDE.md          # ← 本文档
│   └── package.json
└── .gitignore
```

## 二、开发者 A（你）需要提供的

### 1. `.env` 文件内容

伙伴拉取代码后，`framene-server/` 目录下有 `.env.example`，你需要私聊发给他**填好真实值**的 `.env` 内容（或直接帮他创建）。

完整配置项：

```ini
# === 阿里云 RDS 数据库 ===
DATABASE_URL=postgresql://frame_nee:密码@pgm-2ze89c73w569e2xc7o.pg.rds.aliyuncs.com:5432/frame-nee

# === 钉钉扫码登录 (DingTalk OAuth) ===
DINGTALK_APP_KEY=dingqicwmnsbzpbo5ofv
DINGTALK_APP_SECRET=xxx
DINGTALK_CALLBACK_URL=由伙伴自己的 ngrok 决定

# === 飞书日历 (Feishu OAuth) ===
FEISHU_APP_ID=cli_aaa3a6c437f9dbe0
FEISHU_APP_SECRET=xxx
FEISHU_CALLBACK_URL=由伙伴自己的 ngrok 决定

# === 阿里云 OSS 相册存储 ===
OSS_REGION=oss-cn-beijing
OSS_BUCKET=framene-photos
OSS_ACCESS_KEY_ID=xxx
OSS_ACCESS_KEY_SECRET=xxx

# === 其他 ===
ALIYUN_ACCESS_KEY_ID=xxx
ALIYUN_ACCESS_KEY_SECRET=xxx
APP_URL=http://localhost:8080
EMAIL_SENDER_ADDRESS=noreply@send.framene.com
```

> ⚠️ 两个 CALLBACK_URL 先留空，等伙伴跑 ngrok 后自己填。

### 2. 飞书应用配置（如伙伴需要测试飞书日历同步）

飞书应用 `FrameNe Calendar Sync`（App ID: `cli_aaa3a6c437f9dbe0`）的 **IP 白名单** 需要加上伙伴的 ngrok 出口 IP：
- 开放平台 → 应用 → 安全设置 → IP 白名单
- 伙伴启动 ngrok 后，访问 http://127.0.0.1:4040/status 查看 Public IP

### 3. 钉钉应用配置（如伙伴需要测试钉钉登录）

同理，钉钉应用的 **回调域名** 和 **IP 白名单** 也需要更新。

## 三、开发者 B（伙伴）需要自己操作的

### 第一步：拉取代码

```bash
git clone https://github.com/seblee424/framenee1.git
cd framenee1
```

### 第二步：创建 .env 并填入 A 提供的值

```bash
cp framene-server/.env.example framene-server/.env
# 用 A 私发给你的内容填入
```

### 第三步：安装后端依赖并启动

```bash
cd framene-server
npm install
node index.js
# 后端启动在 http://localhost:3000
```

### 第四步：启动 ngrok（用于 OAuth 回调）

```bash
# 新开一个终端
ngrok http 3000
```

启动后你会得到一个公网 URL，例如 `https://xxx.ngrok-free.dev`。

### 第五步：更新回调地址

将 ngrok URL 填入 `.env` 中的两个字段：

```ini
DINGTALK_CALLBACK_URL=https://你的ngrok域名/api/auth/dingtalk-callback
FEISHU_CALLBACK_URL=https://你的ngrok域名/api/auth/feishu-callback
```

然后重启后端（Ctrl+C 重新 `node index.js`）。

### 第六步：启动前端

```bash
cd frame_app
npm install      # React 前端
npm run dev      # 启动在 http://localhost:5173
```

或启动 Flutter 手机端：

```bash
cd frame_app/flutter_oss_example
flutter pub get --offline
flutter run -d chrome   # 启动在 http://localhost:8080
```

### 第七步：验证

```bash
curl http://localhost:3000/api/health
curl https://你的ngrok域名/api/health
```

浏览器访问 `http://localhost:8080` 查看 App。

---

## 四、每次同步的流程

当 A（你）修改了代码并推送到 GitHub 后：

1. **A** 告知伙伴：「代码已更新，请拉取」
2. **B** 执行：
   ```bash
   cd framenee1
   git pull origin main
   # 如果后端有改动，重启后端
   cd framene-server && node index.js
   ```
3. 如果 `index.js` 或 `.env.example` 有变更，可能需要重新 `npm install`
4. 如果新增了 API 或修改了数据库结构，A 需告知 B

---

## 五、同步记录

> 每次同步时，在此记录，保留最近 10 条。

| 日期 | 同步内容 | A 提供的配置变更 | B 需注意 |
|------|---------|-----------------|---------|
| 2026-06-11 | 首次初始化 | `.env` 全部配置 | 需自己跑 ngrok |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
