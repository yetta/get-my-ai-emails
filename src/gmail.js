import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GmailService {
    constructor() {
        this.oauth2Client = null;
        this.gmail = null;
    }

    async authenticate() {
        try {
            const credentialsPath = path.join(path.dirname(__dirname), 'gcp-oauth.keys.json');
            const tokenPath = path.join(path.dirname(__dirname), 'token.json');

            if (!fs.existsSync(credentialsPath)) {
                throw new Error('OAuth 凭据文件不存在: gcp-oauth.keys.json');
            }

            const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
            const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

            this.oauth2Client = new google.auth.OAuth2(
                client_id,
                client_secret,
                redirect_uris[0]
            );

            // 检查是否已有 token
            if (fs.existsSync(tokenPath)) {
                const token = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
                this.oauth2Client.setCredentials(token);
            } else {
                throw new Error('Token 文件不存在，请先运行授权流程');
            }

            this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
            logger.info('Gmail API 认证成功');
        } catch (error) {
            logger.error('Gmail API 认证失败', error);
            throw error;
        }
    }

    async searchUnreadEmailsByLabel(labelName, daysAgo = 2) {
        try {
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            const dateString = date.toISOString().split('T')[0].replace(/-/g, '/');

            const query = `label:"${labelName}" is:unread after:${dateString}`;
            logger.info(`搜索邮件: ${query}`);

            const response = await this.gmail.users.messages.list({
                userId: 'me',
                q: query,
            });

            const messages = response.data.messages || [];
            logger.info(`找到 ${messages.length} 封带有标签 "${labelName}" 的未读邮件`);
            return messages;
        } catch (error) {
            logger.error('搜索邮件失败', error);
            throw error;
        }
    }

    async searchEmailsByLabel(labelName, daysAgo = 2) {
        try {
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            const dateString = date.toISOString().split('T')[0].replace(/-/g, '/');

            const query = `label:"${labelName}" after:${dateString}`;
            logger.info(`[DEBUG] 搜索邮件: ${query}`);

            const response = await this.gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: 1, // 调试模式只取1封
            });

            const messages = response.data.messages || [];
            logger.info(`[DEBUG] 找到 ${messages.length} 封带有标签 "${labelName}" 的邮件`);
            return messages;
        } catch (error) {
            logger.error('搜索邮件失败', error);
            throw error;
        }
    }

    async getEmailContent(messageId) {
        try {
            const response = await this.gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'full',
            });

            const message = response.data;
            const headers = message.payload.headers;

            // 提取邮件信息
            const subject = headers.find(h => h.name === 'Subject')?.value || '无标题';
            const from = headers.find(h => h.name === 'From')?.value || '';
            const date = headers.find(h => h.name === 'Date')?.value || '';

            // 递归查找 HTML 内容
            let body = '';
            const findHtmlContent = (parts) => {
                if (!parts) return false;
                for (const part of parts) {
                    if (part.mimeType === 'text/html' && part.body.data) {
                        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
                        return true;
                    }
                    if (part.parts && findHtmlContent(part.parts)) {
                        return true;
                    }
                }
                return false;
            };

            // 先尝试从 parts 中查找
            if (message.payload.parts) {
                findHtmlContent(message.payload.parts);
            }

            // 如果没有找到 HTML，尝试从 body 直接获取
            if (!body && message.payload.body.data) {
                body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
            }

            // 如果还是没有，尝试找 plain text
            if (!body && message.payload.parts) {
                for (const part of message.payload.parts) {
                    if (part.mimeType === 'text/plain' && part.body.data) {
                        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
                        break;
                    }
                }
            }

            logger.info(`获取邮件内容: ${subject}`);
            return { id: messageId, subject, from, date, body };
        } catch (error) {
            logger.error(`获取邮件内容失败: ${messageId}`, error);
            throw error;
        }
    }

    async markAsRead(messageId) {
        try {
            await this.gmail.users.messages.modify({
                userId: 'me',
                id: messageId,
                requestBody: {
                    removeLabelIds: ['UNREAD'],
                },
            });
            logger.info(`邮件已标记为已读: ${messageId}`);
        } catch (error) {
            logger.error(`标记邮件为已读失败: ${messageId}`, error);
            throw error;
        }
    }

    async extractImages(messageId) {
        try {
            const response = await this.gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'full',
            });

            const message = response.data;
            const images = [];

            // 递归提取图片
            const extractFromParts = async (parts) => {
                if (!parts) return;

                for (const part of parts) {
                    // 检查是否是图片类型
                    if (part.mimeType && part.mimeType.startsWith('image/')) {
                        const contentId = part.headers?.find(h => h.name.toLowerCase() === 'content-id')?.value;
                        const filename = part.filename || `image-${images.length + 1}.${part.mimeType.split('/')[1]}`;

                        let imageData = null;

                        // 如果有 attachmentId，需要额外请求获取数据
                        if (part.body.attachmentId) {
                            const attachment = await this.gmail.users.messages.attachments.get({
                                userId: 'me',
                                messageId: messageId,
                                id: part.body.attachmentId,
                            });
                            imageData = attachment.data.data;
                        } else if (part.body.data) {
                            imageData = part.body.data;
                        }

                        if (imageData) {
                            images.push({
                                cid: contentId ? contentId.replace(/[<>]/g, '') : null,
                                filename: filename,
                                mimeType: part.mimeType,
                                data: imageData, // base64 编码
                            });
                        }
                    }

                    // 递归处理嵌套 parts
                    if (part.parts) {
                        await extractFromParts(part.parts);
                    }
                }
            };

            // 从 payload 开始提取
            if (message.payload.parts) {
                await extractFromParts(message.payload.parts);
            }

            logger.info(`提取到 ${images.length} 张内嵌/附件图片`);
            return images;
        } catch (error) {
            logger.error(`提取图片失败: ${messageId}`, error);
            return [];
        }
    }
}

export default GmailService;
