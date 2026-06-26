# FrameNe 启动 & ngrok & API 测试指南

> 每次需要启动 Web 端和 App 端的前后端时，按照此流程操作。

## 目录

1. [重启完整流程](#1-重启完整流程)
2. [ngrok 隧道管理](#2-ngrok-隧道管理)
3. [API 全面测试](#3-api-全面测试)
4. [飞书重新授权](#4-飞书重新授权)
5. [常见问题](#5-常见问题)

---

## 1. 重启完整流程

### 1.1 杀掉旧进程

```bash
# 强制释放所有端口
kill $(lsof -t -i :3000) 2>/dev/null
kill $(lsof -t -i :5173) 2>/dev/null
kill $(lsof -t -i :8080) 2>/dev/null
kill $(pgrep -f "ngrok http 3000") 2>/dev/null
sleep 1

# 验证端口空闲
lsof -i :3000 -P 2>/dev/null | grep LISTEN || echo "3000 free"
lsof -i :5173 -P 2>/dev/null | grep LISTEN || echo "5173 free"
lsof -i :8080 -P 2>/dev/null | grep LISTEN || echo "8080 free"
```

### 1.2 启动 ngrok 隧道

```bash
ngrok http 3000 --log=stdout 2>&1 &
sleep 3

# 获取 ngrok 公网 URL
curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json; print([x['public_url'] for x in json.load(sys.stdin).get('tunnels',[])][0])"
```

**注意：** 如果 ngrok URL 变了，需要更新 `.env` 中的回调地址：
```bash
# 假设新URL为 https://xxx.ngrok-free.dev
sed -i '' "s|DINGTALK_CALLBACK_URL=.*|DINGTALK_CALLBACK_URL=https://xxx.ngrok-free.dev/api/auth/dingtalk-callback|" framene-server/.env
sed -i '' "s|FEISHU_CALLBACK_URL=.*|FEISHU_CALLBACK_URL=https://xxx.ngrok-free.dev/api/auth/feishu-callback|" framene-server/.env
sed -i '' "s|DINGTALK_CALLBACK_URL=.*|DINGTALK_CALLBACK_URL=https://xxx.ngrok-free.dev/api/auth/dingtalk-callback|" framene-server/scripts/.env
sed -i '' "s|FEISHU_CALLBACK_URL=.*|FEISHU_CALLBACK_URL=https://xxx.ngrok-free.dev/api/auth/feishu-callback|" framene-server/scripts/.env
```

### 1.3 启动后端 (Express, port 3000)

```bash
cd framene-server

# 确保 .env 从 scripts/.env 同步
cp scripts/.env .env 2>/dev/null

# 启动（后台）
node index.js &

# 等待启动完成
sleep 3

# 验证
curl -s http://localhost:3000/api/health
# 应返回: {"status":"ok","timestamp":"..."}
```

### 1.4 启动 Web 前端 (Vite, port 5173)

```bash
cd frame_app
# 如果 node_modules 不存在则先安装
# npm install
npm run dev &

sleep 3
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:5173
# 应返回: HTTP 200
```

### 1.5 启动 App 前端 (Flutter Web, port 8080)

```bash
cd frame_app/flutter_oss_example

# 如果 build 不存在或代码有变化需要先构建
# flutter build web

cd build/web && python3 -m http.server 8080 &

sleep 2
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:8080
# 应返回: HTTP 200
```

---

## 2. ngrok 隧道管理

### 2.1 查看当前 ngrok URL

```bash
curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json; t=json.load(sys.stdin); print(t['tunnels'][0]['public_url'] if t['tunnels'] else 'no tunnel')"
```

### 2.2 检查 ngrok 回调是否可达

```bash
# 获取 ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])")

# 测试回调
curl -s -o /dev/null -w "HTTP %{http_code}" "$NGROK_URL/api/health"
# 应返回: HTTP 200（通过 ngrok 代理访问后端）
```

### 2.3 检查 ngrok 代理的后端日志

```bash
# ngrok web 界面
open http://localhost:4040
```

---

## 3. API 全面测试

### 3.1 准备 JWT Token

```bash
cd /Users/erzhuonie/Documents/GitHub/framenee1/framene-server
TOKEN=$(node -e "const jwt=require('jsonwebtoken');console.log(jwt.sign({userId:5},'framene-dev-secret-key',{expiresIn:'1h'}));")
```

### 3.2 旧 API 测试

```bash
echo "=== 旧 API ==="
curl -s http://localhost:3000/api/health | head -c 60
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/auth/me | head -c 60
curl -s http://localhost:3000/api/photos | head -c 60
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/events | head -c 60
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/members | head -c 60
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/auth/feishu-auth-url | head -c 60
curl -s http://localhost:3000/api/auth/dingtalk-auth-url | head -c 60
```

### 3.3 新 Web API 测试

```bash
echo "=== Web API ==="
curl -s http://localhost:3000/api/web/events | head -c 60
curl -s http://localhost:3000/api/web/events/completed-summary
curl -s http://localhost:3000/api/web/events/completed-records
curl -s http://localhost:3000/api/web/accounts
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"text":"明天早上八点去吃饭","timezone":"Asia/Shanghai","utcOffset":480}' \
  http://localhost:3000/api/web/events/parse-voice
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"items":[{"title":"test","startAt":"2026-06-17T10:00:00Z","endAt":"2026-06-17T10:30:00Z"}]}' \
  http://localhost:3000/api/web/events/voice-create
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"1849083010n@gmail.com"}' \
  http://localhost:3000/api/web/events/sync-from-account
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","name":"test"}' \
  http://localhost:3000/api/web/accounts/sync
```

---

## 4. 飞书重新授权

当飞书 access_token 过期（2小时有效期）时，需要重新走 OAuth 授权流程：

### 4.1 获取飞书授权 URL

```bash
cd /Users/erzhuonie/Documents/GitHub/framenee1/framene-server
TOKEN=$(node -e "const jwt=require('jsonwebtoken');console.log(jwt.sign({userId:5},'framene-dev-secret-key',{expiresIn:'1h'}));")
AUTH_URL=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/auth/feishu-auth-url | python3 -c "import sys,json;print(json.load(sys.stdin).get('auth_url',''))")
echo "$AUTH_URL"
# 在浏览器中打开此 URL
```

### 4.2 检查授权结果

```bash
# 确认飞书已连接
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/auth/me | python3 -c "import sys,json;d=json.load(sys.stdin);print('飞书连接:', d.get('feishu_calendar_connected'), '飞书用户:', d.get('feishu_name'))"
```

### 4.3 测试飞书同步

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/events/sync/feishu | python3 -c "import sys,json;d=json.load(sys.stdin);print('同步结果:', d.get('events_synced','错误'), d.get('error',''))"
```

---

## 5. 常见问题

### 5.1 ngrok URL 变了

每次重启 ngrok（如果免费版），URL 可能变化。更新 `.env` 和 `scripts/.env` 中的回调地址：
- `DINGTALK_CALLBACK_URL`
- `FEISHU_CALLBACK_URL`
- `APP_URL` — 如果有需要

### 5.2 .env 文件同步

`framene-server/` 下有两个 `.env` 相关文件：
- `framene-server/.env` — 后端启动时读取
- `framene-server/scripts/.env` — 备份/模板

启动后端时执行 `cp scripts/.env .env` 确保同步。

### 5.3 DeepSeek API Key 格式

正确的格式（dotenv 要求）：
```ini
DEEPSEEK_API_KEY=sk-你的key
```
错误格式（不会被读取）：
```ini
Deepseek api key = sk-xxx     # ❌ 空格+大小写
DeepSeek API Key = sk-xxx     # ❌
```

### 5.4 JWT 认证

测试需要 JWT token 的 API 时，使用 `framene-dev-secret-key`（默认密钥，如果 `.env` 中没有设置 `JWT_SECRET` 的话）。

```bash
# 生成测试 token（user_id=5）
node -e "const jwt=require('jsonwebtoken');console.log(jwt.sign({userId:5},'framene-dev-secret-key',{expiresIn:'1h'}));"
```

### 5.5 端口占用

| 端口 | 服务 | 检查命令 |
|------|------|----------|
| 3000 | 后端 Express | `lsof -i :3000` |
| 5173 | Web 前端 Vite | `lsof -i :5173` |
| 8080 | App 前端 Flutter | `lsof -i :8080` |
| 4040 | ngrok 管理界面 | `lsof -i :4040` |

