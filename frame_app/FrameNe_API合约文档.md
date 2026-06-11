# FrameNe API 合约文档

> 前端 & 硬件端通用 API 规范
> 后端基于 Express.js + 阿里云 RDS PostgreSQL

---

## 一、数据模型

### CalendarEvent — 日历事件

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 事件 ID（后端自动生成） |
| `title` | `string` | 标题 |
| `description` | `string?` | 描述 |
| `startAt` / `start_at` | `string (ISO 8601)` | 开始时间 |
| `endAt` / `end_at` | `string (ISO 8601)` | 结束时间 |
| `location` | `string?` | 地点 |
| `provider` | `string` | 来源：`'manual'`（手动）、`'feishu'`（飞书同步） |
| `ownerEmail` / `owner_email` | `string` | 所有者邮箱 |

### PhotoAsset — 照片资产

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 照片 ID |
| `url` | `string` | OSS 签名 URL（有效期 1 小时） |
| `fileName` | `string` | 原始文件名 |
| `fileSize` | `number` | 文件大小（字节） |
| `mimeType` | `string` | MIME 类型 |
| `createdAt` | `string (ISO 8601)` | 上传时间 |
| `uploadedBy` | `string` | 上传者名称 |
| `ownerEmail` | `string` | 所有者邮箱 |

### AppUser — 用户

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `number` | 用户 ID |
| `email` | `string?` | 邮箱 |
| `phone` | `string?` | 手机号 |
| `name` | `string?` | 昵称 |
| `avatar` | `string?` | 头像 URL |
| `feishuCalendarConnected` | `boolean` | 是否已连接飞书日历 |
| `feishuName` | `string?` | 飞书用户名 |

---

## 二、API 端点

> 所有请求使用 `Authorization: Bearer <jwt_token>` 鉴权。
> 基础地址：开发环境 `http://localhost:3000`，生产环境 `https://api.framene.com`

### 2.1 用户认证

| 方法 | 端点 | 说明 |
|------|------|------|
| `POST` | `/api/auth/send-code` | 发送手机验证码 |
| `POST` | `/api/auth/login` | 手机验证码登录 |
| `POST` | `/api/auth/email-login` | 邮箱密码登录 |
| `POST` | `/api/auth/register` | 邮箱注册 |
| `GET` | `/api/auth/dingtalk` | 获取钉钉扫码 URL |
| `GET` | `/api/auth/dingtalk-callback` | 钉钉 OAuth 回调 |
| `GET` | `/api/auth/feishu-auth-url` | 获取飞书授权 URL |
| `GET` | `/api/auth/feishu-callback` | 飞书 OAuth 回调 |
| `GET` | `/api/me` | 获取当前用户信息 |

### 2.2 日历事件

| 方法 | 端点 | 说明 |
|------|------|------|
| `GET` | `/api/events?startAt=&endAt=&provider=` | 获取事件列表（支持时间范围 + provider 过滤） |
| `POST` | `/api/events` | 创建手动事件 |
| `PUT` | `/api/events/:id` | 更新事件 |
| `DELETE` | `/api/events/:id` | 删除事件 |
| `POST` | `/api/events/sync/feishu` | 同步飞书日历事件 |
| `GET` | `/api/events/sync-status` | 获取日历同步状态 |

### 2.3 照片（OSS 存储）

| 方法 | 端点 | 说明 |
|------|------|------|
| `POST` | `/api/photos/upload` | 上传照片（multipart/form-data） |
| `POST` | `/api/photos/upload-base64` | 上传照片（base64 JSON） |
| `GET` | `/api/photos?limit=&offset=` | 获取照片列表 |
| `GET` | `/api/photos/:id` | 获取单张照片详情 |
| `DELETE` | `/api/photos/:id` | 删除照片 |

### 2.4 健康检查

| 方法 | 端点 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 服务健康检查 |

### 2.5 飞书日历 OAuth 流程

```
用户点击"连接飞书日历"
        │
        ▼
前端 GET /api/auth/feishu-auth-url
        │
        ▼
返回飞书 OAuth URL → 跳转到飞书授权页面
        │
        ▼
用户授权 → 飞书回调到 /api/auth/feishu-callback?code=xxx&state=yyy
        │
        ▼
后端换取 token → 存入 feishu_calendar_tokens 表
        │
        ▼
前端检测到 feishu_just_connected → 刷新状态
        │
        ▼
用户点击"同步飞书日历" → POST /api/events/sync/feishu
        │
        ▼
获取飞书日历事件 → 存入 calendar_events 表（provider='feishu'）
```

---

## 三、JSON 响应格式

### 成功响应
```json
{
  "id": "1",
  "title": "打球",
  "start_at": "2026-06-11T14:00:00.000Z",
  "end_at": "2026-06-11T16:00:00.000Z",
  "provider": "feishu",
  ...
}
```

### 列表响应
```json
{
  "items": [ ... ]
}
```

### 错误响应
```json
{
  "error": "错误描述"
}
```

---

## 四、数据库表结构

### calendar_events

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `serial PK` | 事件 ID |
| `user_id` | `integer FK` | 用户 ID |
| `title` | `varchar(255)` | 标题 |
| `description` | `text` | 描述 |
| `provider` | `varchar(20)` | `'manual'` 或 `'feishu'` |
| `start_at` | `timestamptz` | 开始时间 |
| `end_at` | `timestamptz` | 结束时间 |
| `location` | `text` | 地点 |
| `source_event_id` | `varchar(255)` | 飞书事件 ID（去重用） |
| `created_at` | `timestamptz` | 创建时间 |
| `updated_at` | `timestamptz` | 更新时间 |

### feishu_calendar_tokens

| 字段 | 类型 | 说明 |
|------|------|------|
| `user_id` | `integer FK` | 用户 ID |
| `access_token` | `text` | 飞书 user_access_token |
| `refresh_token` | `text` | 刷新令牌 |
| `token_expires_at` | `timestamptz` | 过期时间 |
| `created_at` | `timestamptz` | 创建时间 |

### users

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `serial PK` | 用户 ID |
| `email` | `varchar(255)` | 邮箱 |
| `phone` | `varchar(20)` | 手机号 |
| `name` | `varchar(100)` | 昵称 |
| `dingtalk_openid` | `varchar(255)` | 钉钉 OpenID |
| `feishu_openid` | `varchar(255)` | 飞书 OpenID |
| `feishu_calendar_connected` | `boolean` | 飞书日历连接状态 |
| `created_at` | `timestamptz` | 创建时间 |

---

*文档版本: 2.0（MVP 精简版）| 最后更新: 2026-06-11*
