# FrameNe Hermes 开发状态文档

> 用途：每次 Hermes AI 启动项目时读取此文件，获取当前开发状态，无需重复沟通。
> 最后更新：2026-06-17

---

## 一、项目概述

FrameNe 是一个家庭日程管理 + 相册共享 App。Web 端和 Flutter App 使用各自的数据库表，通过同步按钮交换数据。

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
│   ├── index.js                           # 全部 API 路由 (~2400 行)
│   ├── .env                               # 凭据（不上传 GitHub）
│   ├── .env.example                       # 模板
│   ├── scripts/                           # 调试脚本
│   └── package.json
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
| 后端 Express | 所有 API 路由在 `index.js`（~2400行） |
| 用户认证 | 邮箱登录/注册、钉钉扫码登录 |
| 日历 CRUD（双表） | `/api/events` → `calendar_events`，`/api/web/events` → `web_calendar_events` |
| 飞书日历同步 | OAuth → 获取 token → 同步事件到 calendar_events（provider='feishu'） |
| OSS 相册 | 上传（文件+base64）/ 列表 / 查看 / 删除 |
| DeepSeek 语音解析 | `/api/web/events/parse-voice`，AI + 正则降级，支持时区参数 |
| Web 语音创建 | `/api/web/events/voice-create`，直接写入 web_calendar_events |
| Web 设备账号管理 | `/api/web/accounts`，最多 5 个账号 |
| 用户完成记录 | `user_completed_events` 表，勾选✅时记录完成人+时间 |
| Flutter 日历页 | 月视图、日视图、飞书同步弹窗 |
| Flutter 相册页 | OSS 图片列表、上传、删除 |
| Flutter 设备页 | 改为「绑定日程管理平板设备」（天气移除） |
| Flutter 我的页 | 飞书连接状态显示 |
| Flutter 天气 | 日历页左上角（wttr.in API，浏览器定位回退 IP） |
| Flutter 语音录入 | 底部弹窗 + JS 语音识别 + 发时区参数到 parse-voice |
| Flutter 权限对话框 | 首次启动 framene_app.dart → 询问定位+麦克风 |
| React Web 首页 | PIN 123456 解锁，4 个功能卡片（日历、相册、日程记录、设备账号） |
| React Web 语音 | 底部条样式，DeepSeek AI + 正则，时区感知 |
| React Web 权限 | 首次访问 LocationPermission 对话框 |
| 时区处理 | 前端 Intl API 获取时区 + `new Date().getTimezoneOffset()` → 后端接收 timezone+utcOffset |
| 阿里云 RDS | PostgreSQL, web_calendar_events, device_accounts, user_completed_events 表 |
| 阿里云 OSS | Bucket `framene-photos`，私有读+签名 URL 1h |
| 阿里云 DirectMail | 发信域名 send.framene.com |
| 域名 | www.framene.com，企业邮箱 qiye.aliyun.com |

### ❌ 待完成

| 功能 | 说明 |
|------|------|
| 手机验证码登录 | 需接入阿里云短信服务 |
| 阿里云 FC 部署 | 后端部署上线 |
| 日历成员共享 | 计划放到 Web 端开发阶段 |
| Flutter Android 原生 | 目前 Flutter Web + macOS，无 android/ios 目录 |
| 飞书 token 自动刷新 | 目前 2 小时过期需手动重新授权 |

---

## 三、API 要点

### Web 端 API（`/api/web/`，读写 `web_calendar_events` 表）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/web/events` | GET | 查 Web 端日程 |
| `/api/web/events/sync` | POST | App 同步日程到 Web |
| `/api/web/events/sync-from-account` | POST | 从账号拉取日程到 Web |
| `/api/web/events/parse-voice` | POST | AI 解析自然语言日程（DeepSeek + 正则），接收 timezone/utcOffset |
| `/api/web/events/voice-create` | POST | 语音创建日程（写入 web_calendar_events） |
| `/api/web/events/completed-records` | GET | 用户已完成日程记录（支持按 email 筛选） |
| `/api/web/events/completed-summary` | GET | 完成记录汇总（按用户分组） |
| `/api/web/events/:id/complete` | PUT | 切换日程完成状态 |
| `/api/web/events/:id` | DELETE | 删除日程 |
| `/api/web/accounts` | GET | 设备账号列表 |
| `/api/web/accounts/sync` | POST | 同步账号 |
| `/api/web/accounts/:id` | DELETE | 移除设备账号 |

### App 端 API（`/api/`，读写 `calendar_events` 表）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/events` | GET | 查事件，支持 `startAt`/`endAt`/`provider` 过滤 |
| `/api/events` | POST | 创建手动事件 |
| `/api/events/:id` | PUT | 更新事件 |
| `/api/events/:id` | DELETE | 删除事件 |
| `/api/events/voice` | POST | 语音批量创建（需 JWT 或 API Key） |
| `/api/events/sync/feishu` | POST | 同步飞书日历 |

### 同步流程

```
Flutter App 添加日程 → POST /api/events → calendar_events 表
Flutter「日程同步到web端」→ POST /api/web/events/sync → web_calendar_events 表
Web 端设备账号同步 → POST /api/web/events/sync-from-account → web_calendar_events 表
Web 日历 UI → GET /api/web/events → web_calendar_events 表
```

### 已创建的文件（FC 部署用）

| 文件 | 说明 |
|------|------|
| `framene-server/bootstrap` | FC 自定义运行时入口脚本 |
| `framene-server/deploy.sh` | 部署包构建脚本（运行后生成 `fc-deploy.zip`） |
| `framene-server/.env.example` | 环境变量模板（含完整注释） |
| `framene-server/fc-deploy.zip` | 已生成的部署包（4.5MB） |

### 启动命令

```bash
# 后端（本地开发）
cd ~/Desktop/framene/framene-server && cp scripts/.env .env && node index.js

# React Web 前端
cd ~/Desktop/framene/frame_app && npm run dev

# Flutter App 前端
cd ~/Desktop/framene/frame_app/flutter_oss_example && flutter build web && cd build/web && python3 -m http.server 8080
```

---

## 四、关键数据模型

### CalendarEvent.fromJson — 同时支持 snake_case 和 camelCase
```dart
String? _val(String camel, String snake) =>
    (json[camel] ?? json[snake]) as String?;
startAt: _val('startAt', 'start_at') ?? '',
endAt: _val('endAt', 'end_at') ?? '',
```

### 数据库 calendar_events 表（Flutter App 用）
- provider: `'manual'`、`'voice'`、`'feishu'`、`'device'`
- 飞书事件通过 `source_event_id` 去重

### 数据库 web_calendar_events 表（Web 端用）
- 独立表，`source_app_user_id` + `source_email` 标记来源
- `status`: `'active'`、`'completed'`、`'deleted'`
- 硬删除（DELETE FROM）

### 数据库 user_completed_events 表
- 勾选✅时自动插入
- `event_id`、`source_email`、`title`、`completed_at`

---

## 五、注意事项（Hermes 记住）

1. **.env 密码风险**：`read_file` 会脱敏密码为 `***`，用 `write_file` 重写会导致密码丢失。应使用 `patch` 修改单行，或 `terminal` 用 `grep` 验证原始内容
2. **.env 位置**：在 `framene-server/scripts/.env`，启动前需 `cp scripts/.env .env`
3. **DeepSeek Key 格式**：必须是 `DEEPSEEK_API_KEY=sk-xxx`（全大写+下划线）
4. **Flutter 网络**：`pub get` 超时时用 `--offline`
5. **无 android/ios**：Flutter 项目缺少这两个平台目录，需要时用 `flutter create --platforms=android,ios .`
6. **Dev 服务**：Flutter build → Python http.server 比 flutter run -d web-server 更稳定（后者会因 tcsetattr 退出）
7. **DEV_CHECKLIST.md**：每周工作规划，Hermes 每次启动时读取
8. **同步架构**：Flutter 读写 `calendar_events`（/api/events），Web 读写 `web_calendar_events`（/api/web/events），通过同步按钮交换
