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

            // 提取邮件正文
            let body = '';
            if (message.payload.parts) {
                for (const part of message.payload.parts) {
                    if (part.mimeType === 'text/html' || part.mimeType === 'text/plain') {
                        const data = part.body.data;
                        body = Buffer.from(data, 'base64').toString('utf-8');
                        break;
                    }
                }
            } else if (message.payload.body.data) {
                body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
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
}

export default GmailService;
