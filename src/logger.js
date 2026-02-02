import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Logger {
    constructor() {
        this.logDir = path.join(path.dirname(__dirname), 'logs');
        this.ensureLogDir();
    }

    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    getTimestamp() {
        // 使用北京时间 (UTC+8)
        const date = new Date();
        const offset = 8 * 60; // 北京时间偏移量（分钟）
        const beijingTime = new Date(date.getTime() + offset * 60 * 1000);
        
        // 格式化为 ISO 8601 格式，但使用北京时区
        const year = beijingTime.getUTCFullYear();
        const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
        const day = String(beijingTime.getUTCDate()).padStart(2, '0');
        const hours = String(beijingTime.getUTCHours()).padStart(2, '0');
        const minutes = String(beijingTime.getUTCMinutes()).padStart(2, '0');
        const seconds = String(beijingTime.getUTCSeconds()).padStart(2, '0');
        const ms = String(beijingTime.getUTCMilliseconds()).padStart(3, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}+08:00`;
    }

    formatMessage(level, message) {
        return `[${this.getTimestamp()}] [${level}] ${message}`;
    }

    writeToFile(message) {
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.logDir, `${today}.log`);
        fs.appendFileSync(logFile, message + '\n');
    }

    info(message) {
        const formatted = this.formatMessage('INFO', message);
        console.log(formatted);
        this.writeToFile(formatted);
    }

    error(message, error = null) {
        const formatted = this.formatMessage('ERROR', message);
        console.error(formatted);
        if (error) {
            console.error(error);
            this.writeToFile(formatted + '\n' + error.stack);
        } else {
            this.writeToFile(formatted);
        }
    }

    success(message) {
        const formatted = this.formatMessage('SUCCESS', message);
        console.log('\x1b[32m%s\x1b[0m', formatted); // 绿色
        this.writeToFile(formatted);
    }

    warn(message) {
        const formatted = this.formatMessage('WARN', message);
        console.warn('\x1b[33m%s\x1b[0m', formatted); // 黄色
        this.writeToFile(formatted);
    }
}

export default new Logger();
