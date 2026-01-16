#!/bin/bash

# Gmail 邮件处理定时任务 - 状态查看脚本
# 查看服务运行状态和最近执行情况

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Gmail 邮件处理定时任务 - 状态${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

PROJECT_DIR="/Users/xuye/Documents/AI-CODE/get-my-ai-emails"
SERVICE_NAME="com.xuye.gmail-processor"

# 检查服务是否在运行
echo -e "${YELLOW}服务状态:${NC}"
if launchctl list | grep -q "$SERVICE_NAME"; then
    echo -e "${GREEN}✓ 服务已加载${NC}"
    
    # 显示服务详细信息
    launchctl list | grep "$SERVICE_NAME"
else
    echo -e "${RED}✗ 服务未加载${NC}"
    echo ""
    echo "请先运行安装脚本: ./install.sh"
    exit 1
fi

echo ""
echo -e "${YELLOW}定时配置:${NC}"
echo "执行时间: 每天早上 8:00 (Asia/Shanghai)"

echo ""
echo -e "${YELLOW}最近执行日志:${NC}"

# 查找最新的日志文件
LATEST_LOG=$(ls -t "$PROJECT_DIR/logs/"*.log 2>/dev/null | grep -E '[0-9]{4}-[0-9]{2}-[0-9]{2}\.log$' | head -1)

if [ -n "$LATEST_LOG" ]; then
    LOG_DATE=$(basename "$LATEST_LOG" .log)
    echo "最新日志: $LOG_DATE"
    echo ""
    echo "--- 日志摘要 (最后20行) ---"
    tail -20 "$LATEST_LOG"
else
    echo -e "${YELLOW}未找到执行日志${NC}"
fi

echo ""
echo -e "${YELLOW}系统日志:${NC}"
STDOUT_LOG="$PROJECT_DIR/logs/launchd-stdout.log"
STDERR_LOG="$PROJECT_DIR/logs/launchd-stderr.log"

if [ -f "$STDOUT_LOG" ]; then
    echo "标准输出: $STDOUT_LOG (最后5行)"
    tail -5 "$STDOUT_LOG" 2>/dev/null || echo "  (空)"
else
    echo "标准输出: 无"
fi

echo ""
if [ -f "$STDERR_LOG" ]; then
    echo "错误输出: $STDERR_LOG (最后5行)"
    tail -5 "$STDERR_LOG" 2>/dev/null || echo "  (空)"
else
    echo "错误输出: 无"
fi

echo ""
echo -e "${YELLOW}健康检查日志:${NC}"
HEALTH_LOG="$PROJECT_DIR/logs/health-check.log"
if [ -f "$HEALTH_LOG" ]; then
    tail -5 "$HEALTH_LOG"
else
    echo "  (未执行过健康检查)"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}常用命令:${NC}"
echo "  手动触发:   launchctl start $SERVICE_NAME"
echo "  重新加载:   launchctl unload ~/Library/LaunchAgents/$SERVICE_NAME.plist && launchctl load ~/Library/LaunchAgents/$SERVICE_NAME.plist"
echo "  卸载服务:   ./uninstall.sh"
echo ""
