# 切换回 MySQL 版本指南

当前使用的是 **PostgreSQL 版本**（连接阿里云 RDS PostgreSQL）。

如需切换回 MySQL，按以下步骤操作：

---

## 第一步：还原 index.js

```bash
# PostgreSQL 版会保留为 index.pg.js
cp index.js index.pg.js

# 从备份还原 MySQL 版
cp index.mysql.js index.js
```

## 第二步：还原 package.json

把 `package.json` 中的 `pg` 改回 `mysql2`：

```json
// 删除:
"pg": "^8.13.1",

// 改为:
"mysql2": "^3.6.5",
```

## 第三步：安装依赖

```bash
npm install mysql2
npm uninstall pg
```

## 第四步：更新 .env 配置

在 `.env` 中使用 MySQL 连接配置：

```env
# MySQL 连接（阿里云 RDS MySQL）
DB_HOST=你的RDS内网地址
DB_PORT=3306
DB_USER=你的数据库用户名
DB_PASSWORD=你的数据库密码
DB_NAME=framene

# 删除 PostgreSQL 的 DATABASE_URL
# DATABASE_URL=postgresql://...
```

## 第五步：建表

在阿里云 RDS MySQL 中执行 `rds_schema.sql`（注意 PostgreSQL 语法，需转为 MySQL 语法）。

---

## 主要差异说明

| 差异项 | PostgreSQL | MySQL |
|--------|-----------|-------|
| 依赖库 | `pg` | `mysql2` |
| 连接方式 | `DATABASE_URL` | `DB_HOST/PORT/USER/PASSWORD` |
| 占位符 | `$1, $2, $3...` | `?` |
| 返回结果 | `result.rows` | `result[0]` |
| 自增 ID | `result.rows[0].id` | `result.insertId` |
| 时间函数 | `NOW() + INTERVAL '5 minutes'` | `DATE_ADD(NOW(), INTERVAL 5 MINUTE)` |
