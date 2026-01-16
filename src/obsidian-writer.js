import fs from 'fs';
import path from 'path';
import logger from './logger.js';

class ObsidianWriter {
    constructor(obsidianPath) {
        this.obsidianPath = obsidianPath;
        this.ensureDirectory();
    }

    ensureDirectory() {
        if (!fs.existsSync(this.obsidianPath)) {
            fs.mkdirSync(this.obsidianPath, { recursive: true });
            logger.info(`创建 Obsidian 目录: ${this.obsidianPath}`);
        }
    }

    generateFileName(subject, date) {
        // 从日期字符串提取日期
        const dateObj = new Date(date);
        const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD

        // 清理文件名，移除特殊字符
        const cleanSubject = subject
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50); // 限制长度

        return `${dateStr}-${cleanSubject}.md`;
    }

    async saveToObsidian(fileName, content) {
        try {
            let filePath = path.join(this.obsidianPath, fileName);

            // 处理文件名冲突
            let counter = 1;
            while (fs.existsSync(filePath)) {
                const ext = path.extname(fileName);
                const base = path.basename(fileName, ext);
                const newFileName = `${base}-${counter}${ext}`;
                filePath = path.join(this.obsidianPath, newFileName);
                counter++;
            }

            fs.writeFileSync(filePath, content, 'utf-8');
            logger.success(`文件已保存: ${path.basename(filePath)}`);
            return filePath;
        } catch (error) {
            logger.error('保存文件失败', error);
            throw error;
        }
    }
}

export default ObsidianWriter;
