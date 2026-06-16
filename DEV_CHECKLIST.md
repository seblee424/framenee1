# FrameNe 每周工作规划

> 每周更新，记录本周目标和完成情况。

---

## 本周（2026-06-11 ~ 2026-06-17）

### 优先级 P0 — 本周必须完成

- [x] **用户注册**：邮箱注册流程完善
- [ ] ~~手机验证码登录~~ → **代码已完成，等待阿里云短信模板审核**
- [x] **后端 FC 部署准备**：已完成部署包 + 部署脚本
- [x] **Web 端语音录入日程**：DeepSeek AI + 正则解析，写入 web_calendar_events
- [x] **Web 端日历功能对接**：全量替换 mock 数据，对接阿里云 RDS
- [x] **时区自动检测**：权限对话框请求定位+麦克风，Intl API 获取时区
- [x] **DeepSeek API Key 修复**：修复格式错误（`Deepseek api key = xxx` → `DEEPSEEK_API_KEY=xxx`）

### 优先级 P1 — 尽量完成

- [x] **Flutter 端**：完善登录/注册页面 UI
- [x] **Flutter 语音录入**：与 Web 端一致，发时区参数到 parse-voice API
- [x] **Flutter 设备页**：从天气改为"绑定日程管理平板设备"
- [x] **Flutter 权限对话框**：登录前询问定位+麦克风

### 优先级 P2 — 有余力再做

- [x] **两张表分离**：Flutter → calendar_events（/api/events），Web → web_calendar_events（/api/web/events），同步按钮交换数据

### 本周 Bug / 问题

- [x] ~~时间记录错误~~ → **已修复**：前后端都用用户浏览器时区（Intl API + utcOffset），不再硬编码 UTC
- [x] ~~语音录入不显示~~ → **已修复**：voiceCreate 写错表（calendar_events → web_calendar_events）
- [ ] 飞书 token 过期后需要用户手动重新授权，后续可加自动刷新
- [ ] Flutter pub get 在中国网络可能超时，需 --offline

---

## 下周计划（预留）

- [ ] 阿里云函数计算 FC 部署上线
- [ ] Flutter Android 原生打包
- [ ] 日历成员共享功能

---

## MVP 完整路线图

```
第 1 周 (当前)  手机验证码 + 注册完善 + FC 准备
第 2 周          FC 部署 + 钉钉/邮箱登录完善
第 3 周          DeepSeek 语音输入日程 ✅
第 4~7 周        Web 前端功能开发（登录、日历、相册、成员共享、设备绑定）
第 8~11 周       Flutter 手机端完善
第 12~15 周      测试 + PWA 上架 + Android 上架
```

---

## 已完成功能清单

### 后端
- [x] 用户邮箱登录 / 注册
- [x] 钉钉扫码登录
- [x] 日历事件 CRUD（`/api/events` + `/api/web/events` 双表）
- [x] 飞书日历 OAuth + 事件同步
- [x] 照片 OSS 上传（文件 + base64）/ 列表 / 查看 / 删除
- [x] Web 端语音日程解析（`/api/web/events/parse-voice`，DeepSeek AI + 正则）
- [x] Web 端语音日程创建（`/api/web/events/voice-create`）
- [x] Web 端日程同步（`/api/web/events/sync`, `sync-from-account`）
- [x] Web 端设备账号管理（`/api/web/accounts`）
- [x] 用户完成日程记录（`user_completed_events` 表）
- [x] DeepSeek API Key 修复（`.env` 格式修复）
- [x] 时区感知解析（接收 timezone + utcOffset 参数）
- [x] 健康检查 API

### Flutter 前端
- [x] 日历页面（月视图 + 日视图）
- [x] 飞书日历同步（设置弹窗 + 重新授权）
- [x] 相册页面（OSS 上传/浏览）
- [x] 设备页面（改为"绑定日程管理平板设备"）
- [x] 我的页面（飞书连接状态）
- [x] 天气显示（日历页左上角）
- [x] 语音录入日程（底部弹窗 + JS 语音识别 + 时区参数）
- [x] 手动添加日程（右上角 + 按钮）
- [x] 同步日程到 Web（按钮调用 /api/web/events/sync）
- [x] 首次启动权限对话框（定位+麦克风）

### React Web 端
- [x] 完整 UI（PIN 登录、日历、相册、日程记录、设备账号管理）
- [x] 对接阿里云 RDS（取代 mock 数据）
- [x] 语音录入日程（Web Speech API + DeepSeek + 正则）
- [x] 权限对话框（定位+麦克风，首次访问）
- [x] 时区自动检测（Intl API + localStorage 持久化）
- [x] 设备账号管理（最多 5 账号，同步按钮）
- [x] 用户日程记录（完成事件汇总+详情查看）

### 基础设施
- [x] 阿里云 RDS PostgreSQL
- [x] 阿里云 OSS（北京，RAM 子账号）
- [x] 阿里云 DirectMail / 企业邮箱
- [x] 域名 framene.com / www.framene.com

---

*最后更新: 2026-06-17*
