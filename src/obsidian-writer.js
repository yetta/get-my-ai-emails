import fs from 'fs';
import path from 'path';
import axios from 'axios';
import logger from './logger.js';

class ObsidianWriter {
    constructor(obsidianPath) {
        this.obsidianPath = obsidianPath;
        this.attachmentsPath = path.join(obsidianPath, 'attachments');
        this.ensureDirectory();
    }

    ensureDirectory() {
        if (!fs.existsSync(this.obsidianPath)) {
            fs.mkdirSync(this.obsidianPath, { recursive: true });
            logger.info(`创建 Obsidian 目录: ${this.obsidianPath}`);
        }
        if (!fs.existsSync(this.attachmentsPath)) {
            fs.mkdirSync(this.attachmentsPath, { recursive: true });
            logger.info(`创建附件目录: ${this.attachmentsPath}`);
        }
    }

    generateFileName(subject, date) {
        const dateObj = new Date(date);
        const dateStr = dateObj.toISOString().split('T')[0];

        const cleanSubject = subject
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);

        return `${dateStr}-${cleanSubject}.md`;
    }

    async saveToObsidian(fileName, content) {
        try {
            let filePath = path.join(this.obsidianPath, fileName);

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

    async saveWithImages(fileName, content, imageMap) {
        try {
            // 如果没有图片，直接保存
            if (!imageMap || imageMap.size === 0) {
                return await this.saveToObsidian(fileName, content);
            }

            // 创建笔记专属附件目录
            const noteName = path.basename(fileName, '.md');
            const noteAttachmentDir = path.join(this.attachmentsPath, noteName);
            if (!fs.existsSync(noteAttachmentDir)) {
                fs.mkdirSync(noteAttachmentDir, { recursive: true });
            }

            // 下载图片并构建序号到本地路径的映射
            const indexToPath = new Map();
            let savedCount = 0;

            for (const [index, url] of imageMap) {
                try {
                    const imgFilename = await this.downloadExternalImage(url, noteAttachmentDir);
                    if (imgFilename) {
                        const relativePath = `attachments/${noteName}/${imgFilename}`;
                        indexToPath.set(index, relativePath);
                        savedCount++;
                    }
                } catch (err) {
                    logger.warn(`下载图片 ${index} 失败: ${url}`);
                }
            }

            logger.info(`保存了 ${savedCount} 张图片到 ${noteAttachmentDir}`);

            // 替换内容中的占位符 {{IMG:n}} 为 Obsidian 嵌入语法
            let finalContent = content;
            for (const [index, relativePath] of indexToPath) {
                const placeholder = `{{IMG:${index}}}`;
                const obsidianEmbed = `\n![[${relativePath}]]\n`;
                finalContent = finalContent.replace(placeholder, obsidianEmbed);
            }

            // 移除未成功下载的占位符
            finalContent = finalContent.replace(/\{\{IMG:\d+\}\}/g, '');

            return await this.saveToObsidian(fileName, finalContent);
        } catch (error) {
            logger.error('保存带图片的笔记失败', error);
            return await this.saveToObsidian(fileName, content);
        }
    }

    async downloadExternalImage(url, targetDir) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });

            const contentType = response.headers['content-type'] || '';
            let ext = 'png';
            if (contentType.includes('jpeg') || contentType.includes('jpg')) {
                ext = 'jpg';
            } else if (contentType.includes('gif')) {
                ext = 'gif';
            } else if (contentType.includes('webp')) {
                ext = 'webp';
            }

            const filename = `img-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            const filePath = path.join(targetDir, filename);

            fs.writeFileSync(filePath, response.data);
            return filename;
        } catch (error) {
            logger.warn(`下载图片失败: ${url} - ${error.message}`);
            return null;
        }
    }

    sanitizeFilename(filename) {
        return filename
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .substring(0, 100);
    }
}

export default ObsidianWriter;
