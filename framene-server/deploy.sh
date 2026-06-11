#!/bin/bash
# FrameNe 后端 FC 部署包构建脚本
# 使用方法：bash deploy.sh
# 生成 fc-deploy.zip，上传到阿里云函数计算控制台即可

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_FILE="$SCRIPT_DIR/fc-deploy.zip"
DEPLOY_DIR=$(mktemp -d)

echo "📦 构建 FC 部署包..."

# 1. 复制源码
echo "  复制源码..."
cp "$SCRIPT_DIR/index.js" "$DEPLOY_DIR/"
cp "$SCRIPT_DIR/package.json" "$DEPLOY_DIR/"
cp "$SCRIPT_DIR/package-lock.json" "$DEPLOY_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/bootstrap" "$DEPLOY_DIR/"

# 2. 设置 bootstrap 可执行权限
chmod +x "$DEPLOY_DIR/bootstrap"

# 3. 安装生产依赖（排除 devDependencies）
echo "  安装生产依赖..."
cd "$DEPLOY_DIR"
npm install --production --ignore-scripts 2>&1 | tail -1

# 4. 打包（不包含 node_modules/.cache）
echo "  打包..."
rm -rf node_modules/.cache 2>/dev/null || true
zip -q -r "$OUTPUT_FILE" . -x "*.git*" -x "*.md" > /dev/null

# 5. 清理
cd "$SCRIPT_DIR"
rm -rf "$DEPLOY_DIR"

# 6. 输出结果
SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
echo "✅ 部署包已生成: $OUTPUT_FILE"
echo "   大小: $SIZE"
echo ""
echo "下一步："
echo "  1. 打开 https://fcnext.console.aliyun.com/"
echo "  2. 创建函数 → 选择「自定义运行时」→ Node.js 20"
echo "  3. 上传 fc-deploy.zip"
echo "  4. 配置环境变量（从 .env 复制）"
echo "  5. 设置触发器 → 创建 HTTP 触发器（函数 URL）"
