import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HealthCheck {
    constructor() {
        this.projectRoot = path.dirname(__dirname);
        this.logsDir = path.join(this.projectRoot, 'logs');
        this.healthLogFile = path.join(this.logsDir, 'health-check.log');
    }

    /**
     * 获取今天的日期字符串 YYYY-MM-DD
     */
    getTodayDateString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * 检查今天的日志文件是否存在
     */
    checkTodayLogExists() {
        const today = this.getTodayDateString();
        const todayLogFile = path.join(this.logsDir, `${today}.log`);
        return fs.existsSync(todayLogFile);
    }

    /**
     * 检查今天的日志内容
     */
    checkTodayLogContent() {
        const today = this.getTodayDateString();
        const todayLogFile = path.join(this.logsDir, `${today}.log`);

        if (!fs.existsSync(todayLogFile)) {
            return { success: false, reason: '今日日志文件不存在' };
        }

        const content = fs.readFileSync(todayLogFile, 'utf-8');

        // 检查是否包含任务开始标记
        if (!content.includes('开始处理邮件')) {
            return { success: false, reason: '日志中未找到任务开始标记' };
        }

        // 检查是否有错误
        if (content.includes('[ERROR]')) {
            return { success: false, reason: '日志中包含错误信息' };
        }

        // 检查是否有成功完成标记
        if (content.includes('处理完成') || content.includes('没有找到未读邮件')) {
            return { success: true, reason: '任务正常完成' };
        }

        return { success: false, reason: '任务可能未完成' };
    }

    /**
     * 发送 macOS 通知
     */
    sendNotification(title, message) {
        try {
            const script = `display notification "${message}" with title "${title}"`;
            execSync(`osascript -e '${script}'`);
        } catch (error) {
            console.error('发送通知失败:', error.message);
        }
    }

    /**
     * 记录健康检查结果
     */
    logHealthCheck(result) {
        const timestamp = new Date().toISOString();
        const status = result.success ? '✓ 正常' : '✗ 异常';
        const logEntry = `[${timestamp}] ${status} - ${result.reason}\n`;

        fs.appendFileSync(this.healthLogFile, logEntry);
    }

    /**
     * 执行健康检查
     */
    async run() {
        console.log('========== 健康检查开始 ==========');

        const today = this.getTodayDateString();
        console.log(`检查日期: ${today}`);

        // 检查日志文件
        const logExists = this.checkTodayLogExists();
        console.log(`日志文件存在: ${logExists ? '是' : '否'}`);

        if (!logExists) {
            const result = { success: false, reason: '今日日志文件不存在,任务可能未执行' };
            this.logHealthCheck(result);
            this.sendNotification('⚠️ 邮件处理任务异常', result.reason);
            console.log('健康检查结果: 异常');
            return result;
        }

        // 检查日志内容
        const contentCheck = this.checkTodayLogContent();
        console.log(`日志内容检查: ${contentCheck.success ? '通过' : '失败'}`);
        console.log(`原因: ${contentCheck.reason}`);

        this.logHealthCheck(contentCheck);

        if (!contentCheck.success) {
            this.sendNotification('⚠️ 邮件处理任务异常', contentCheck.reason);
        }

        console.log('========== 健康检查完成 ==========');
        return contentCheck;
    }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
    const healthCheck = new HealthCheck();
    healthCheck.run()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('健康检查失败:', error);
            process.exit(1);
        });
}

export default HealthCheck;
