# FrameNe Hermes 开发状态文档

> 用途：每次 Hermes AI 启动项目时读取此文件，获取当前开发状态，无需重复沟通。
> 最后更新：2026-06-11

---

## 一、项目概述

FrameNe 是一个家庭日程管理 + 相册共享 App。MVP 版本仅支持飞书日历同步，移除 Google/钉钉日历。

### 项目结构

```
~/Desktop/framene/                         # 活动工作目录（开发用）
├── frame_app/                             # 前端代码
│   ├── src/                               # React Web 端 (Vite + shadcn + MUI)
│   └── flutter_oss_example/               # Flutter 手机端 (Web/macOS)
│       ├── lib/config/                    # aliyun_config, api_service
│       ├── lib/models/                    # CalendarEvent, AppUser, MediaAsset...
│       ├── lib/pages/                     # calendar_tab, album_tab, device_tab...
│       └── lib/services/                  # app_backend, weather_service
├── framene-server/                        # Express 后端
│   ├── index.js                           # 全部 API 路由 (~1600 行)
│   ├── .env                               # 凭据（不上传 GitHub）
│   ├── .env.example                       # 模板
│   ├── SYNC_GUIDE.md                      # 伙伴协作指南
│   └── scripts/                           # 调试脚本
├── DEV_CHECKLIST.md                       # 每周工作规划
├── FRAMENE_DEV_PLAN.md                    # ← 本文档（Hermes 状态）
├── SYNC_GUIDE.md                          # 伙伴协作指南
└── .gitignore
```

### GitHub 仓库
- `seblee424/framenee1` — 最新代码

### 源文件备份
- `~/Desktop/日程管理项目文件/` — 旧版源文件，仅作备份

---

## 二、当前开发状态

### ✅ 已完成

| 模块 | 详情 |
|------|------|
| 后端 Express | 所有 API 路由在 `index.js`（~1600行） |
| 用户认证 | 邮箱登录/注册、钉钉扫码登录 |
| 日历 CRUD | GET/POST/PUT/DELETE `/api/events` |
| 飞书日历同步 | OAuth → 获取 token → 同步事件到 calendar_events（provider='feishu'） |
| OSS 相册 | 上传（文件+base64）/ 列表 / 查看 / 删除 |
| Flutter 日历页 | 月视图、日视图、飞书同步弹窗 |
| Flutter 相册页 | OSS 图片列表、上传、删除 |
| Flutter 设备页 | 天气显示（wttr.in API）、设备连接占位 |
| Flutter 我的页 | 飞书连接状态显示 |
| Flutter 天气 | 日历页左上角 + 设备页（浏览器定位回退 IP） |
| 阿里云 RDS | PostgreSQL, feishu_calendar_tokens 表 |
| 阿里云 OSS | Bucket `framene-photos`，私有读+签名 URL 1h |
| 阿里云 DirectMail | 发信域名 send.framene.com |
| 域名 | www.framene.com，企业邮箱 qiye.aliyun.com |

### ❌ 待完成

| 功能 | 说明 |
|------|------|
| 手机验证码登录 | 需接入阿里云短信服务 |
| 阿里云 FC 部署 | 后端部署上线 |
| DeepSeek 语音输入日程 | 后端 `/api/events/voice` + Flutter 端语音识别 |
| Web 端对接后端 | React 前端目前 mock 数据模式 |
| 日历成员共享 | 计划放到 Web 端开发阶段 |
| Flutter Android 原生 | 目前 Flutter Web + macOS，无 android/ios 目录 |

---

## 三、API 要点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/events` | GET | 查事件，支持 `startAt`/`endAt`/`provider` 过滤 |
| `/api/events` | POST | 创建手动事件 |
| `/api/events/:id` | PUT | 更新事件 |
| `/api/events/:id` | DELETE | 删除事件 |
| `/api/events/sync/feishu` | POST | 同步飞书日历 |
| `/api/auth/feishu-auth-url` | GET | 获取飞书 OAuth URL |
| `/api/auth/feishu-callback` | GET | 飞书 OAuth 回调 |
| `/api/photos/upload` | POST | OSS 上传（multipart） |
| `/api/photos/upload-base64` | POST | OSS 上传（base64 JSON） |
| `/api/photos` | GET | 获取照片列表 |
| `/api/photos/:id` | DELETE | 删除照片 |

### 已创建的文件（FC 部署用）

| 文件 | 说明 |
|------|------|
| `framene-server/bootstrap` | FC 自定义运行时入口脚本 |
| `framene-server/deploy.sh` | 部署包构建脚本（运行后生成 `fc-deploy.zip`） |
| `framene-server/.env.example` | 环境变量模板（含完整注释） |
| `framene-server/fc-deploy.zip` | 已生成的部署包（4.5MB） |

### 启动命令（更新）

```bash
# 后端（本地开发）
cd ~/Desktop/framene/framene-server && node index.js

# FC 部署
cd ~/Desktop/framene/framene-server && bash deploy.sh
# 然后将 fc-deploy.zip 上传到 FC 控制台
```

### FC 部署前需要准备

1. 打开 https://fcnext.console.aliyun.com/
2. 创建函数 → 选择**「自定义运行时」** → **Node.js 20**
3. 上传 `fc-deploy.zip`
4. 配置环境变量（从 .env 复制，不要上传 .env 文件）
5. 创建 HTTP 触发器，获取函数 URL
6. 更新钉钉/飞书 OAuth 回调 URL 指向 FC 域名

---

## 四、关键数据模型

### CalendarEvent.fromJson — 同时支持 snake_case 和 camelCase
```dart
String? _val(String camel, String snake) =>
    (json[camel] ?? json[snake]) as String?;
startAt: _val('startAt', 'start_at') ?? '',
endAt: _val('endAt', 'end_at') ?? '',
```

### 数据库 calendar_events 表
- 无 `owner_email` 列（前端 ownerEmail 可空）
- provider 字段：`'manual'`（手动）或 `'feishu'`（飞书同步）
- 飞书事件通过 `source_event_id` 去重

### 飞书 OAuth
- App ID: `cli_aaa3a6c437f9dbe0`
- scope 需包含 `calendar:calendar:readonly`
- token 2 小时过期 → 用户需点击「重新授权飞书日历」
- 回调 URI + IP 白名单需在飞书开发者平台配置

---

## 五、注意事项（Hermes 记住）

1. **VS Code 操作**：文件路径用绝对路径，保存说 Cmd+S，打开用 Cmd+Shift+P
2. **.env 密码风险**：`read_file` 会脱敏密码为 `***`，用 `write_file` 重写会导致密码丢失。应使用 `patch` 修改单行，或 `terminal` 用 `grep` 验证原始内容
3. **Flutter 网络**：`pub get` 超时时用 `--offline`
4. **无 android/ios**：Flutter 项目缺少这两个平台目录，需要时用 `flutter create --platforms=android,ios .`
5. **DEV_CHECKLIST.md**：每周工作规划，Hermes 每次启动时读取
6. **本文件**：Hermes 启动时读取当前状态
