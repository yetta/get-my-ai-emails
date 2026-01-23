import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import GmailService from './src/gmail.js';
import AITranslator from './src/ai-translator.js';
import HTMLParser from './src/html-parser.js';
import ObsidianWriter from './src/obsidian-writer.js';
import logger from './src/logger.js';

// 加载环境变量
dotenv.config();

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 缓存目录
const EMAILS_CACHE_DIR = path.join(__dirname, 'emails');
const PARSED_CACHE_DIR = path.join(__dirname, 'parsed');
const TRANSLATED_CACHE_DIR = path.join(__dirname, 'translated');

// 确保缓存目录存在
function ensureCacheDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`创建缓存目录: ${dir}`);
    }
}

// 从缓存加载文件
function loadFromCache(dir, filename) {
    const filePath = path.join(dir, filename);
    if (fs.existsSync(filePath)) {
        logger.info(`从缓存加载: ${filePath}`);
        return fs.readFileSync(filePath, 'utf-8');
    }
    return null;
}

// 保存到缓存
function saveToCache(dir, filename, content) {
    ensureCacheDir(dir);
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    logger.info(`保存到缓存: ${filePath}`);
}

async function processEmails() {
    try {
        logger.info('========== 开始处理邮件 ==========');

        // 读取配置
        const aiService = process.env.AI_SERVICE || 'minimax';
        const minimaxApiKey = process.env.MINIMAX_API_KEY;
        const zhipuApiKey = process.env.ZHIPU_API_KEY;
        const groupId = process.env.MINIMAX_GROUP_ID;
        const obsidianPath = process.env.OBSIDIAN_PATH;
        const labelName = process.env.GMAIL_LABEL || 'AI subscription';
        const daysToCheck = parseInt(process.env.DAYS_TO_CHECK || '2');
        const debugMode = process.env.DEBUG_MODE === 'true';

        // 主服务 API Key
        const apiKey = aiService === 'minimax' ? minimaxApiKey : zhipuApiKey;

        // 验证配置
        if (!apiKey) {
            throw new Error(`请在 .env 文件中配置 ${aiService.toUpperCase()}_API_KEY`);
        }
        if (!obsidianPath) {
            throw new Error('请在 .env 文件中配置 OBSIDIAN_PATH');
        }

        // 检查备用服务状态
        const backupService = aiService === 'minimax' ? 'zhipu' : 'minimax';
        const backupApiKey = aiService === 'minimax' ? zhipuApiKey : minimaxApiKey;
        if (backupApiKey) {
            logger.info(`✓ 已配置备用服务: ${backupService.toUpperCase()},支持自动降级`);
        } else {
            logger.warn(`⚠️  未配置备用服务 ${backupService.toUpperCase()},降级功能不可用`);
        }

        // 初始化服务
        const gmailService = new GmailService();
        const aiTranslator = new AITranslator(aiService, apiKey, groupId);
        const htmlParser = new HTMLParser();
        const obsidianWriter = new ObsidianWriter(obsidianPath);

        // 认证 Gmail
        await gmailService.authenticate();

        // 搜索邮件(DEBUG_MODE 时处理已读邮件)
        const messages = debugMode
            ? await gmailService.searchEmailsByLabel(labelName, daysToCheck)
            : await gmailService.searchUnreadEmailsByLabel(labelName, daysToCheck);

        if (debugMode) {
            logger.info('[DEBUG] 调试模式已启用,处理已读邮件');
        }

        if (messages.length === 0) {
            logger.info('没有找到未读邮件');
            return { processed: 0, failed: 0 };
        }

        let processed = 0;
        let failed = 0;

        // 处理每封邮件
        for (const message of messages) {
            try {
                logger.info(`\n处理邮件 ${processed + failed + 1}/${messages.length}`);

                // === 步骤 1: 获取邮件内容 ===
                let email;
                const emailCacheFile = `${message.id}.json`;
                const cachedEmail = loadFromCache(EMAILS_CACHE_DIR, emailCacheFile);

                if (cachedEmail) {
                    email = JSON.parse(cachedEmail);
                    logger.info('✓ 使用缓存的邮件内容');
                } else {
                    email = await gmailService.getEmailContent(message.id);
                    saveToCache(EMAILS_CACHE_DIR, emailCacheFile, JSON.stringify(email, null, 2));
                    logger.info('✓ 邮件内容已获取并缓存');
                }

                // === 步骤 2: 解析 HTML ===
                let parsed, links, linkMap;
                const parsedCacheFile = `${message.id}.json`;
                const cachedParsed = loadFromCache(PARSED_CACHE_DIR, parsedCacheFile);

                if (cachedParsed) {
                    const parsedData = JSON.parse(cachedParsed);
                    parsed = {
                        markdown: parsedData.markdown,
                        imageMap: new Map(parsedData.imageMap)
                    };
                    links = parsedData.links;
                    linkMap = new Map(parsedData.linkMap);
                    logger.info('✓ 使用缓存的解析结果');
                } else {
                    parsed = htmlParser.parseHTML(email.body);
                    const linkData = htmlParser.extractLinks(email.body);
                    links = linkData.links;
                    linkMap = linkData.linkMap;

                    const parsedData = {
                        markdown: parsed.markdown,
                        imageMap: Array.from(parsed.imageMap.entries()),
                        links: links,
                        linkMap: Array.from(linkMap.entries())
                    };
                    saveToCache(PARSED_CACHE_DIR, parsedCacheFile, JSON.stringify(parsedData, null, 2));
                    logger.info(`✓ 提取到 ${links.length} 个链接, ${parsed.imageMap.size} 张有效图片`);
                }

                // === 步骤 3: AI 翻译 ===
                let translatedContent;
                const translatedCacheFile = `${message.id}.md`;
                const cachedTranslated = loadFromCache(TRANSLATED_CACHE_DIR, translatedCacheFile);

                if (cachedTranslated) {
                    translatedContent = cachedTranslated;
                    logger.info('✓ 使用缓存的翻译结果');
                } else {
                    // 使用简化链接 ID 进行翻译
                    let rawTranslated = await aiTranslator.translate(parsed.markdown, links);
                    // 将链接 ID 替换回完整 URL
                    translatedContent = AITranslator.restoreLinks(rawTranslated, linkMap);
                    // 保存翻译结果到缓存(已恢复完整链接)
                    saveToCache(TRANSLATED_CACHE_DIR, translatedCacheFile, translatedContent);
                    logger.info('✓ 翻译完成并已缓存');
                }

                // === 步骤 4: 保存和标记 ===
                // 生成文件名
                const fileName = obsidianWriter.generateFileName(email.subject, email.date);

                // 保存到 Obsidian(下载图片并替换占位符)
                await obsidianWriter.saveWithImages(fileName, translatedContent, parsed.imageMap);

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
