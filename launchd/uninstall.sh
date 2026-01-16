#!/bin/bash

# Gmail 邮件处理定时任务 - 卸载脚本
# 从 macOS launchd 卸载任务

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Gmail 邮件处理定时任务 - 卸载${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
TARGET_PLIST="$LAUNCH_AGENTS_DIR/com.xuye.gmail-processor.plist"

# 检查服务是否已安装
if [ ! -f "$TARGET_PLIST" ]; then
    echo -e "${YELLOW}服务未安装,无需卸载${NC}"
    exit 0
fi

# 卸载服务
echo "停止并卸载服务..."
launchctl unload "$TARGET_PLIST" 2>/dev/null || true

# 删除 plist 文件
echo "删除配置文件..."
rm -f "$TARGET_PLIST"

# 验证卸载
echo ""
echo -e "${GREEN}验证卸载状态...${NC}"
if launchctl list | grep -q "com.xuye.gmail-processor"; then
    echo -e "${RED}✗ 服务卸载失败${NC}"
    exit 1
else
    echo -e "${GREEN}✓ 服务卸载成功!${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}卸载完成!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}注意: 日志文件未被删除,如需清理请手动删除${NC}"
echo ""
