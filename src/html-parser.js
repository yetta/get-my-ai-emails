import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import logger from './logger.js';

class HTMLParser {
    constructor() {
        this.turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
        });
    }

    parseHTML(html) {
        try {
            // 使用 cheerio 解析 HTML
            const $ = cheerio.load(html);

            // 移除脚本和样式标签
            $('script, style, meta, link').remove();

            // 提取主要内容
            const bodyText = $('body').text() || $.text();

            // 转换为 Markdown（如果需要）
            const markdown = this.turndownService.turndown(html);

            logger.info('HTML 解析完成');
            return {
                text: bodyText.trim(),
                markdown: markdown.trim(),
            };
        } catch (error) {
            logger.error('HTML 解析失败', error);
            // 如果解析失败，返回原始内容
            return {
                text: html,
                markdown: html,
            };
        }
    }

    extractLinks(html) {
        try {
            const $ = cheerio.load(html, { decodeEntities: true });
            const links = [];
            const seenUrls = new Set(); // 去重

            $('a').each((i, elem) => {
                let href = $(elem).attr('href');
                const text = $(elem).text().trim();

                // 跳过空链接和锚点
                if (!href || href.startsWith('#') || href.startsWith('mailto:')) {
                    return;
                }

                // 确保是完整的 URL
                if (!href.startsWith('http://') && !href.startsWith('https://')) {
                    // 跳过相对链接
                    return;
                }

                // 去重
                if (seenUrls.has(href)) {
                    return;
                }
                seenUrls.add(href);

                links.push({
                    text: text || href,
                    url: href
                });
            });

            logger.info(`提取到 ${links.length} 个链接`);
            return links;
        } catch (error) {
            logger.error('提取链接失败', error);
            return [];
        }
    }
}

export default HTMLParser;
