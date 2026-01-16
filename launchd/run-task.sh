#!/bin/bash

# Gmail 邮件处理任务执行脚本
# 由 launchd 调用

set -e  # 遇到错误立即退出

# 项目根目录
PROJECT_DIR="/Users/xuye/Documents/AI-CODE/get-my-ai-emails"
cd "$PROJECT_DIR"

# 加载环境变量
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 记录开始时间
echo "========================================" >> logs/task-execution.log
echo "任务开始: $(date '+%Y-%m-%d %H:%M:%S')" >> logs/task-execution.log

# 执行邮件处理任务
if node index.js; then
    echo "任务成功: $(date '+%Y-%m-%d %H:%M:%S')" >> logs/task-execution.log
    EXIT_CODE=0
else
    echo "任务失败: $(date '+%Y-%m-%d %H:%M:%S')" >> logs/task-execution.log
    EXIT_CODE=1
fi

# 执行健康检查
if [ -f "src/health-check.js" ]; then
    node src/health-check.js || true
fi

echo "========================================" >> logs/task-execution.log
echo "" >> logs/task-execution.log

exit $EXIT_CODE
