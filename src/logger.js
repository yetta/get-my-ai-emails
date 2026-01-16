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
        return new Date().toISOString();
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
