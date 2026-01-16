#!/bin/bash

# Gmail 邮件处理定时任务 - 安装脚本
# 将任务安装到 macOS launchd

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Gmail 邮件处理定时任务 - 安装${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 项目目录
PROJECT_DIR="/Users/xuye/Documents/AI-CODE/get-my-ai-emails"
PLIST_FILE="$PROJECT_DIR/launchd/com.xuye.gmail-processor.plist"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
TARGET_PLIST="$LAUNCH_AGENTS_DIR/com.xuye.gmail-processor.plist"

# 检查 plist 文件是否存在
if [ ! -f "$PLIST_FILE" ]; then
    echo -e "${RED}错误: 找不到 plist 文件${NC}"
    echo "路径: $PLIST_FILE"
    exit 1
fi

# 创建 LaunchAgents 目录(如果不存在)
if [ ! -d "$LAUNCH_AGENTS_DIR" ]; then
    echo "创建 LaunchAgents 目录..."
    mkdir -p "$LAUNCH_AGENTS_DIR"
fi

# 如果已经安装,先卸载
if [ -f "$TARGET_PLIST" ]; then
    echo -e "${YELLOW}检测到已安装的服务,先卸载...${NC}"
    launchctl unload "$TARGET_PLIST" 2>/dev/null || true
    rm -f "$TARGET_PLIST"
fi

# 复制 plist 文件
echo "复制配置文件到 LaunchAgents..."
cp "$PLIST_FILE" "$TARGET_PLIST"

# 加载服务
echo "加载服务到 launchd..."
launchctl load "$TARGET_PLIST"

# 验证安装
echo ""
echo -e "${GREEN}验证安装状态...${NC}"
if launchctl list | grep -q "com.xuye.gmail-processor"; then
    echo -e "${GREEN}✓ 服务安装成功!${NC}"
else
    echo -e "${RED}✗ 服务安装失败${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}安装完成!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "服务名称: com.xuye.gmail-processor"
echo "执行时间: 每天早上 8:00"
echo "工作目录: $PROJECT_DIR"
echo ""
echo -e "${YELLOW}常用命令:${NC}"
echo "  查看状态:   ./status.sh"
echo "  手动触发:   launchctl start com.xuye.gmail-processor"
echo "  卸载服务:   ./uninstall.sh"
echo ""
echo -e "${YELLOW}日志位置:${NC}"
echo "  应用日志:   $PROJECT_DIR/logs/"
echo "  系统日志:   $PROJECT_DIR/logs/launchd-stdout.log"
echo "  错误日志:   $PROJECT_DIR/logs/launchd-stderr.log"
echo ""
