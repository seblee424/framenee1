# FrameNe API 合约文档

> 硬件端 & 前端通用 API 规范
> 前端（React Native）不应依赖 Supabase 具体实现

---

## 一、当前 Supabase 实现（内部细节 - 对前端隐藏）

> 以下内容只为后端维护者参考，前端**不应直接使用**这些表名、字段或查询。

### 1.1 数据表

#### `photo_assets` — 照片资产

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `uuid PK` | 主键 |
| `owner_email` | `text NOT NULL` | 所有者邮箱 |
| `uploaded_by` | `text NOT NULL` | 上传者名称 |
| `file_name` | `text NOT NULL` | 原始文件名 |
| `url` | `text NOT NULL` | 图片公网 URL |
| `storage_path` | `text UNIQUE` | Supabase Storage 内部路径 |
| `created_at` | `timestamptz` | 创建时间 |

索引：`owner_email`, `created_at DESC`

#### `google_calendar_tokens` — Google OAuth Token 存储

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `bigint PK` | 主键 |
| `user_id` | `text` | 用户标识（当前用邮箱） |
| `email` | `text` | Google 账号邮箱 |
| `access_token` | `text NOT NULL` | Google API 令牌 |
| `refresh_token` | `text` | 刷新令牌 |
| `token_expires_at` | `timestamptz` | 过期时间 |
| `created_at` | `timestamptz` | 创建时间 |

唯一约束：`user_id`

#### `calendar_events_cache` — 日历事件缓存

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `bigint PK` | 主键 |
| `user_id` | `text` | 用户标识 |
| `google_event_id` | `text` | Google 日历事件 ID |
| `title` | `text` | 标题 |
| `description` | `text` | 描述 |
| `start_at` | `timestamptz` | 开始时间 |
| `end_at` | `timestamptz` | 结束时间 |
| `location` | `text` | 地点 |
| `raw_data` | `jsonb` | Google 原始数据 |
| `created_at` | `timestamptz` | 创建时间 |

唯一约束：`(user_id, google_event_id)`

### 1.2 存储桶

| 桶名 | 用途 | 权限 |
|------|------|------|
| `frame-photos` | 照片文件存储 | 公开读取（public），匿名上传 |

### 1.3 RLS 策略

当前 MVP 使用 **service_role key（服务端）** 和 **anon key（客户端直连）** 进行访问控制：
- `photo_assets` 表：允许 anon 所有操作（SELECT, INSERT, DELETE）
- Storage `frame-photos` 桶：允许 anon 上传和读取
- `google_calendar_tokens`: 通过 Edge Function 操作，前端不直接访问

### 1.4 认证机制

```
前端              →    anon key（只用于照片 CRUD）
Edge Function     →    service_role key（用于日历 token 操作）
Google OAuth      →    前端跳转 → Edge Function 回调 → 存储 token
```

---

## 二、面向前端的稳定 API 合约

### 2.1 数据模型（TypeScript）

```typescript
// ========== 照片 ==========

interface PhotoAsset {
  id: string;              // UUID
  url: string;             // 公网可访问的图片 URL
  fileName: string;        // 原始文件名（如 "IMG_001.jpg"）
  createdAt: string;       // ISO 8601 时间戳
  uploadedBy: string;      // 上传者名称
  ownerEmail?: string;     // 所有者邮箱（可选）
}

// ========== 日历 ==========

interface CalendarEvent {
  id: string;              // 事件 ID
  title: string;           // 标题
  description?: string;    // 描述（可选）
  startAt: string;         // ISO 8601 开始时间
  endAt: string;           // ISO 8601 结束时间
  location?: string;       // 地点（可选）
  provider: string;        // 来源：'google' | 'manual'
  ownerEmail?: string;     // 所有者邮箱（可选）
}

// ========== 日/月视图 ==========

interface DayViewData {
  date: string;            // 选中日期 ISO 8601
  days: DayItem[];         // 附近 7 天
  events: CalendarEvent[]; // 当天事件
}

interface MonthViewData {
  year: number;
  month: number;
  days: DayItem[];         // 全月所有日期
  events: CalendarEvent[]; // 当月事件
}

interface DayItem {
  date: string;            // 日期 ISO 8601
  hasEvent: boolean;       // 是否有事件
  isToday: boolean;
  isSelected: boolean;
  dayOfWeek: number;       // 0=周日, 1=周一...
}

// ========== 设备 ==========

interface DeviceInfo {
  id: string;              // 设备 ID
  name: string;            // 设备名称
  type: 'frame' | 'tablet' | 'eink';
  lastSyncAt: string;      // 最后同步时间
  isOnline: boolean;
  bindCode?: string;       // 绑定码
  settings: DeviceSettings;
}

interface DeviceSettings {
  photoInterval: number;   // 照片轮播间隔（秒）
  timezone: string;        // 时区
  nightMode: boolean;      // 夜间模式
  brightness: number;      // 0-100
}
```

### 2.2 API 端点

所有请求使用 `Authorization: Bearer <anon_key>` 或在浏览器中通过 `apikey` header。

#### REST 风格（照片 CRUD）

| 方法 | 端点 | 说明 | 返回 |
|------|------|------|------|
| `GET` | `/photos?limit=20&offset=0` | 获取照片列表 | `{ items: PhotoAsset[], total: number }` |
| `POST` | `/photos/upload` | 上传照片（base64 JSON） | `PhotoAsset` |
| `DELETE` | `/photos/:id` | 删除照片 | `{ success: true }` |

#### 函数风格（日历 — 通过 Edge Function）

| 端点 | 参数 | 说明 | 返回 |
|------|------|------|------|
| `?action=url` | 无 | 获取 Google OAuth URL | `{ auth_url: string }` |
| `?action=callback&code=xxx` | `code` | OAuth 回调处理 | 302 重定向或 HTML |
| `?action=connected&email=xxx` | `email` | 检查连接状态 | `{ connected: boolean }` |
| `?action=sync&email=xxx` | `email` | 同步 Google 日历 | `{ success, events_synced, items: CalendarEvent[] }` |
| `?action=day&email=xxx&date=xxx` | `email, date` | 获取日视图数据 | `DayViewData` |
| `?action=month&email=xxx&year=&month=` | `email, year, month` | 获取月视图数据 | `MonthViewData` |

#### 设备绑定

| 方法 | 端点 | 说明 | 返回 |
|------|------|------|------|
| `POST` | `/devices/bind` | 扫码绑定设备 | `DeviceInfo` |
| `GET` | `/devices/:id/settings` | 获取设备配置 | `DeviceSettings` |
| `PUT` | `/devices/:id/settings` | 更新设备配置 | `DeviceSettings` |
| `GET` | `/devices/:id/feed` | 获取硬件端展示数据流 | `DeviceFeed` |

### 2.3 JSON 响应标准格式

```typescript
// 成功响应
{
  "status": "ok",
  "data": { ... }          // 具体数据
}

// 列表响应
{
  "status": "ok",
  "data": {
    "items": [ ... ],
    "total": 42,
    "hasMore": true
  }
}

// 错误响应
{
  "status": "error",
  "error": {
    "code": "NOT_FOUND",
    "message": "照片不存在"
  }
}
```

### 2.4 硬件端专用端点的响应

```typescript
interface DeviceFeed {
  photos: {
    current: PhotoAsset;         // 当前显示照片
    next: PhotoAsset;            // 下一张（预加载）
    interval: number;             // 切换间隔（秒）
  };
  calendar: {
    today: {                     // 今日概要
      date: string;
      count: number;
      events: CalendarEvent[];
    };
    upcoming: CalendarEvent[];   // 未来 7 天
  };
  device: {
    syncedAt: string;            // 数据同步时间
    ttl: number;                 // 缓存有效期（秒）
  };
}
```

---

## 三、未来迁移至阿里云的注意事项

### 3.1 分层架构

```
React Native / 硬件端
       │
       │  稳定 API 合约（本文件）
       │
       ▼
┌──────────────────┐
│   API  Gateway    │  ← 始终存在，不依赖具体云厂商
│   (Edge Function  │
│    / 阿里云 FC    │
│    / 自定义后端)  │
└──────┬───────────┘
       │
       ├── 照片 → Supabase Storage / 阿里云 OSS
       ├── 数据库 → Supabase PostgreSQL / 阿里云 RDS
       └── Token → Supabase / 阿里云 Redis
```

**前端永远不直接调用 Supabase 客户端**，而是通过 API Gateway 调用。这样迁移时只需改 Gateway 内部实现。

### 3.2 哪些应保持不变（对前端不可见变化）

| 组件 | 可能迁移到 | 前端影响 |
|------|-----------|---------|
| **照片文件** | Supabase Storage → 阿里云 OSS | ❌ 无影响 — URL 由 API 返回 |
| **照片元数据** | Supabase `photo_assets` → 阿里云 RDS MySQL | ❌ 无影响 — API 格式不变 |
| **日历 Token** | Supabase → 阿里云 Redis + RDS | ❌ 无影响 — Token 操作在服务端 |
| **日历事件缓存** | Supabase `calendar_events_cache` → 阿里云 RDS | ❌ 无影响 — 返回格式相同 |
| **Edge Function** | Supabase Edge Function → 阿里云函数计算 FC | ❌ 无影响 — 接口 URL 变，行为不变 |

### 3.3 哪些应对外部（前端）隐藏

| 内部实现细节 | 隐藏方式 | 迁移注意事项 |
|-------------|---------|-------------|
| `photo_assets` 表名 | 前端通过 `/photos` 端点操作 | 迁移后端点不变 |
| `storage_path` 字段 | 不返回给前端 | 迁移 OSS 后内部路径不同 |
| `raw_data`（Google 原始 JSON） | 只存缓存，不暴露 | 可清理或迁移 |
| `google_calendar_tokens` 表 | 完全通过服务端 API 操作 | 换 Redis 或阿里云 KMS 存储 |
| Supabase `anon_key` | 客户端不再直接调用 Supabase | 迁移后不再需要 anon key |
| 数据库 unique 约束 | 隐藏在后端逻辑中 | 迁 RDS 后重新建立索引 |

### 3.4 迁移阿里云的具体切换策略

```
阶段 1（当前 MVP）：Supabase 全栈
  前端 → API Gateway(Supabase Edge Function) → Supabase

阶段 2：照片迁移到阿里云 OSS
  前端 → API Gateway → ├─ 照片 → 阿里云 OSS
                       └─ 其他 → Supabase

阶段 3：数据迁移到阿里云 RDS
  前端 → API Gateway → ├─ 照片 → 阿里云 OSS
                       ├─ 数据 → 阿里云 RDS
                       └─ Token → 阿里云 Redis

阶段 4：全部迁移到阿里云，下线 Supabase
  前端 → API Gateway(阿里云 FC) → 阿里云全栈
```

### 3.5 前端开发注意事项

```typescript
// ❌ 错误做法：前端直接调用 Supabase
import { supabase } from '../supabase';
const { data } = await supabase.from('photo_assets').select('*');

// ✅ 正确做法：前端调用封装好的 API 函数
import { photos } from '../api';
const data = await photos.list();
```

```typescript
// api/photos.ts — 稳定 API 封装
export const photos = {
  list: (limit = 20, offset = 0): Promise<ApiResponse<PhotoAsset[]>> =>
    api.get('/photos', { limit, offset }),

  upload: (file: File): Promise<ApiResponse<PhotoAsset>> => {
    // 转换为 base64 或 formData
    return api.post('/photos/upload', { image: file });
  },

  delete: (id: string): Promise<ApiResponse<void>> =>
    api.del(`/photos/${id}`),
};

// api/calendar.ts
export const calendar = {
  connectGoogle: () => api.get('/google-calendar-auth', { action: 'url' }),
  isConnected: (email: string) =>
    api.get('/google-calendar-auth', { action: 'connected', email }),
  sync: (email: string) =>
    api.get('/google-calendar-auth', { action: 'sync', email }),
  getDayView: (email: string, date: string) =>
    api.get('/google-calendar-auth', { action: 'day', email, date }),
  getMonthView: (email: string, year: number, month: number) =>
    api.get('/google-calendar-auth', { action: 'month', email, year, month }),
};
```

---

## 四、硬件端数据流（推荐实现）

```
硬件端启动
    │
    ▼
扫码绑定 → POST /devices/bind → 获取 DeviceInfo
    │
    ▼
定时轮询 GET /devices/:id/feed
    │
    ├── 返回 DeviceFeed
    │   ├── photos.current → 显示照片
    │   ├── photos.next    → 预加载下一张
    │   ├── calendar.today → 底部显示今日日程
    │   └── device.ttl     → 下次轮询等待时间
    │
    ▼
等待 ttl 秒后再次轮询
```

---

*文档版本: 1.0 | 最后更新: 2026-05-19*
