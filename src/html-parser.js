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
            // 提取核心内容区域，减少输入 token
            let processedHtml = html;
            const startMarker = 'In today';  // 匹配 "In today's AI rundown"、"In today's robotics rundown" 等
            const endMarker = '<b>COMMUNITY</b>';

            const startIndex = html.indexOf(startMarker);
            const endIndex = html.indexOf(endMarker);

            if (startIndex > -1 && endIndex > startIndex) {
                // 只保留核心内容区域
                processedHtml = html.substring(startIndex, endIndex);
                logger.info(`内容范围提取: 从 ${startIndex} 到 ${endIndex}，节省 ${html.length - processedHtml.length} 字符`);
            } else if (endIndex > 0) {
                // 如果没找到起点标记，但找到了终点，从头开始提取
                processedHtml = html.substring(0, endIndex);
                logger.info(`内容范围提取: 从开始到 ${endIndex}，节省 ${html.length - processedHtml.length} 字符`);
            }

            // 使用 cheerio 解析 HTML
            const $ = cheerio.load(processedHtml);

            // 移除脚本和样式标签
            $('script, style, meta, link').remove();

            // 移除广告和推广内容（但保留正文中的赞助内容）
            const adKeywords = ['Subscribe', 'Sign up', 'Advertise', 'AI University', 'Get in touch', 'contact', 'referral'];
            $('a').each((i, elem) => {
                const text = $(elem).text().trim().toLowerCase();
                const href = $(elem).attr('href') || '';

                if (adKeywords.some(kw => text.includes(kw.toLowerCase()) || href.toLowerCase().includes(kw.toLowerCase()))) {
                    // 移除包含广告链接的整个段落或列表项
                    const parent = $(elem).parent();
                    if (parent.is('p') || parent.is('li') || parent.is('div')) {
                        parent.remove();
                    } else {
                        $(elem).remove();
                    }
                }
            });

            // 图片映射表：序号 -> URL
            const imageMap = new Map();
            let imageIndex = 1;

            // 社交图标 alt 标识
            const socialIcons = ['tw', 'ig', 'in', 'fb', 'thds', 'yt', 'tiktok'];

            // 需要过滤的品牌图片关键词
            const brandKeywords = ['the rundown ai', 'the rundown tech', 'the rundown robotics', 'therundown'];

            // 处理图片，替换为占位符
            $('img').each((i, elem) => {
                const src = $(elem).attr('src');
                const alt = $(elem).attr('alt') || '';
                const widthAttr = $(elem).attr('width');
                const heightAttr = $(elem).attr('height');

                // 解析尺寸，保留 undefined 表示未设置
                const width = widthAttr ? parseInt(widthAttr) : undefined;
                const height = heightAttr ? parseInt(heightAttr) : undefined;

                // 过滤规则
                // 1. 无 src
                if (!src) {
                    $(elem).remove();
                    return;
                }

                // 2. 追踪像素（尺寸明确小于 10px 或 gif 追踪链接）
                if ((width !== undefined && width < 10) || (height !== undefined && height < 10) || src.includes('/o/u001.')) {
                    $(elem).remove();
                    return;
                }

                // 3. 社交图标（alt 是短标识且尺寸明确小于 50px）
                if (socialIcons.includes(alt.toLowerCase()) &&
                    ((width !== undefined && width < 50) || (height !== undefined && height < 50))) {
                    $(elem).remove();
                    return;
                }

                // 4. 尺寸明确设置且过小的图标（两个尺寸都小于 50px）
                if (width !== undefined && height !== undefined && width < 50 && height < 50) {
                    $(elem).remove();
                    return;
                }

                // 5. 过滤 The Rundown 品牌图片（logo、标题图等）
                const srcLower = src.toLowerCase();
                const altLower = alt.toLowerCase();
                // 检查 URL 中 # 后面的实际地址（googleusercontent 代理 URL）
                const hashIndex = src.indexOf('#');
                const actualUrl = hashIndex > 0 ? src.substring(hashIndex + 1).toLowerCase() : '';

                // 品牌相关的 header 模式（只过滤 The Rundown 的品牌 header）
                const brandHeaderPatterns = ['roboticsheader', 'aiheader', 'techheader', 'rundownheader'];

                // 品牌图片过滤规则
                const isBrandImage =
                    brandKeywords.some(kw => srcLower.includes(kw) || altLower.includes(kw) || actualUrl.includes(kw)) ||
                    brandHeaderPatterns.some(p => srcLower.includes(p) || actualUrl.includes(p)) ||
                    srcLower.includes('logo') || actualUrl.includes('logo');  // logo 图片

                if (isBrandImage) {
                    $(elem).remove();
                    return;
                }

                // 6. 只保留 http/https 开头的外部图片
                if (!src.startsWith('http://') && !src.startsWith('https://')) {
                    $(elem).remove();
                    return;
                }

                // 有效图片：替换为占位符（直接替换，不包裹 p 标签，保持原位置）
                const placeholder = `\n\n{{IMG:${imageIndex}}}\n\n`;
                imageMap.set(imageIndex, src);
                $(elem).replaceWith(placeholder);
                imageIndex++;
            });

            // 提取主要内容
            const bodyText = $('body').text() || $.text();

            // 转换为 Markdown
            const markdown = this.turndownService.turndown($.html());

            logger.info(`HTML 解析完成，提取 ${imageMap.size} 张有效图片`);
            return {
                text: bodyText.trim(),
                markdown: markdown.trim(),
                imageMap: imageMap,
            };
        } catch (error) {
            logger.error('HTML 解析失败', error);
            return {
                text: html,
                markdown: html,
                imageMap: new Map(),
            };
        }
    }

    extractLinks(html) {
        try {
            const $ = cheerio.load(html, { decodeEntities: true });
            const links = [];
            const linkMap = new Map(); // ID -> 完整 URL 映射
            const seenUrls = new Set(); // 去重
            let linkIndex = 1;

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

                // 为链接分配简短 ID
                const linkId = `L${linkIndex}`;
                linkMap.set(linkId, href);

                links.push({
                    id: linkId,
                    text: text || href,
                    url: href
                });
                linkIndex++;
            });

            logger.info(`提取到 ${links.length} 个链接`);
            return { links, linkMap };
        } catch (error) {
            logger.error('提取链接失败', error);
            return { links: [], linkMap: new Map() };
        }
    }

    extractImageRefs(html) {
        try {
            const $ = cheerio.load(html, { decodeEntities: true });
            const imageRefs = [];
            const seenSrcs = new Set();

            $('img').each((i, elem) => {
                const src = $(elem).attr('src');
                const alt = $(elem).attr('alt') || '';

                if (!src || seenSrcs.has(src)) {
                    return;
                }
                seenSrcs.add(src);

                // 判断图片类型
                let type = 'external';
                let cid = null;

                if (src.startsWith('cid:')) {
                    type = 'cid';
                    cid = src.replace('cid:', '');
                } else if (src.startsWith('data:')) {
                    type = 'data';
                } else if (!src.startsWith('http://') && !src.startsWith('https://')) {
                    // 跳过其他相对路径
                    return;
                }

                imageRefs.push({
                    src: src,
                    alt: alt,
                    type: type,
                    cid: cid,
                });
            });

            logger.info(`提取到 ${imageRefs.length} 个图片引用`);
            return imageRefs;
        } catch (error) {
            logger.error('提取图片引用失败', error);
            return [];
        }
    }
}

export default HTMLParser;
