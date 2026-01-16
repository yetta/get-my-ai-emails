import dotenv from 'dotenv';
import GmailService from './src/gmail.js';
import AITranslator from './src/ai-translator.js';
import HTMLParser from './src/html-parser.js';
import ObsidianWriter from './src/obsidian-writer.js';
import logger from './src/logger.js';

// 加载环境变量
dotenv.config();

async function processEmails() {
    try {
        logger.info('========== 开始处理邮件 ==========');

        // 读取配置
        const aiService = process.env.AI_SERVICE || 'minimax';
        const apiKey = aiService === 'minimax'
            ? process.env.MINIMAX_API_KEY
            : process.env.ZHIPU_API_KEY;
        const groupId = process.env.MINIMAX_GROUP_ID;
        const obsidianPath = process.env.OBSIDIAN_PATH;
        const labelName = process.env.GMAIL_LABEL || 'AI subscription';
        const daysToCheck = parseInt(process.env.DAYS_TO_CHECK || '2');

        // 验证配置
        if (!apiKey) {
            throw new Error(`请在 .env 文件中配置 ${aiService.toUpperCase()}_API_KEY`);
        }
        if (!obsidianPath) {
            throw new Error('请在 .env 文件中配置 OBSIDIAN_PATH');
        }

        // 初始化服务
        const gmailService = new GmailService();
        const aiTranslator = new AITranslator(aiService, apiKey, groupId);
        const htmlParser = new HTMLParser();
        const obsidianWriter = new ObsidianWriter(obsidianPath);

        // 认证 Gmail
        await gmailService.authenticate();

        // 搜索未读邮件
        const messages = await gmailService.searchUnreadEmailsByLabel(labelName, daysToCheck);

        if (messages.length === 0) {
            logger.info('没有找到未读邮件');
            return { processed: 0, failed: 0 };
        }

        let processed = 0;
        let failed = 0;

        // 处理每封邮件
        for (const message of messages) {
            try {
                logger.info(`\n处理邮件 ${processed + 1}/${messages.length}`);

                // 获取邮件内容
                const email = await gmailService.getEmailContent(message.id);

                // 解析 HTML 并提取链接
                const parsed = htmlParser.parseHTML(email.body);
                const links = htmlParser.extractLinks(email.body);

                logger.info(`提取到 ${links.length} 个链接`);

                // 使用 AI 翻译和整理，传递链接
                const translatedContent = await aiTranslator.translate(parsed.text, links);

                // 生成文件名
                const fileName = obsidianWriter.generateFileName(email.subject, email.date);

                // 保存到 Obsidian
                await obsidianWriter.saveToObsidian(fileName, translatedContent);

                // 标记为已读
                await gmailService.markAsRead(message.id);

                processed++;
                logger.success(`✓ 邮件处理完成: ${email.subject}`);
            } catch (error) {
                failed++;
                logger.error(`✗ 邮件处理失败`, error);
            }
        }

        logger.info('\n========== 处理完成 ==========');
        logger.info(`成功: ${processed} 封`);
        logger.info(`失败: ${failed} 封`);

        return { processed, failed };
    } catch (error) {
        logger.error('处理邮件时发生错误', error);
        throw error;
    }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
    processEmails()
        .then(result => {
            logger.success(`\n任务完成！处理了 ${result.processed} 封邮件`);
            process.exit(0);
        })
        .catch(error => {
            logger.error('任务失败', error);
            process.exit(1);
        });
}

export default processEmails;
