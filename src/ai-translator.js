import axios from 'axios';
import logger from './logger.js';

class AITranslator {
    constructor(service, apiKey, groupId = null) {
        this.service = service;
        this.apiKey = apiKey;
        this.groupId = groupId; // MiniMax 需要
    }


    async requestWithRetry(fn, retries = 4, delay = 3000) {
        try {
            return await fn();
        } catch (error) {
            if (retries > 0) {
                const nextDelay = Math.min(delay * 2, 30000); // 最大延迟 30 秒
                logger.info(`请求失败: ${error.message}。${delay / 1000} 秒后重试... (剩余重试次数: ${retries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.requestWithRetry(fn, retries - 1, nextDelay);
            } else {
                throw error;
            }
        }
    }

    async translate(emailContent, links = []) {
        // 优先使用配置的服务
        try {
            if (this.service === 'minimax') {
                return await this.translateWithMiniMax(emailContent, links);
            } else if (this.service === 'zhipu') {
                return await this.translateWithZhipu(emailContent, links);
            } else {
                throw new Error(`不支持的 AI 服务: ${this.service}`);
            }
        } catch (error) {
            // 如果主服务失败,尝试降级到备用服务
            logger.warn(`${this.service.toUpperCase()} 翻译失败,尝试降级到备用服务`);

            if (this.service === 'minimax' && process.env.ZHIPU_API_KEY) {
                logger.info('🔄 降级到智谱 AI');
                try {
                    return await this.translateWithZhipu(emailContent, links);
                } catch (fallbackError) {
                    logger.error('备用服务(智谱 AI)也失败了', fallbackError);
                    throw error; // 抛出原始错误
                }
            } else if (this.service === 'zhipu' && process.env.MINIMAX_API_KEY) {
                logger.info('🔄 降级到 MiniMax');
                try {
                    return await this.translateWithMiniMax(emailContent, links);
                } catch (fallbackError) {
                    logger.error('备用服务(MiniMax)也失败了', fallbackError);
                    throw error; // 抛出原始错误
                }
            } else {
                logger.warn('⚠️  未配置备用服务,无法降级');
                throw error;
            }
        }
    }

    async translateWithMiniMax(emailContent, links = []) {
        try {
            logger.info('使用 MiniMax 翻译邮件内容');

            const prompt = this.buildPrompt(emailContent, links);

            const response = await this.requestWithRetry(async () => {
                return await axios.post(
                    `https://api.minimax.chat/v1/text/chatcompletion_v2`,
                    {
                        model: 'abab6.5-chat',
                        messages: [
                            {
                                role: 'user',
                                content: prompt,
                            },
                        ],
                        temperature: 0.3,
                        max_tokens: 8000,
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        timeout: 180000, // 180秒超时
                    }
                );
            });

            const result = response.data?.choices?.[0]?.message?.content;
            if (!result) {
                throw new Error('API 返回空内容');
            }

            // 输出 token 消耗
            const usage = response.data?.usage;
            if (usage) {
                logger.info(`Token 消耗: 输入 ${usage.prompt_tokens || usage.total_tokens}, 输出 ${usage.completion_tokens || 0}, 总计 ${usage.total_tokens}`);
            }

            logger.success('MiniMax 翻译完成');
            return result;
        } catch (error) {
            logger.error('MiniMax 翻译失败', error);
            throw error;
        }
    }

    async translateWithZhipu(emailContent, links = []) {
        try {
            logger.info('使用智谱 AI 翻译邮件内容');

            const prompt = this.buildPrompt(emailContent, links);

            const response = await this.requestWithRetry(async () => {
                return await axios.post(
                    'https://open.bigmodel.cn/api/paas/v4/chat/completions',
                    {
                        model: 'glm-4',
                        messages: [
                            {
                                role: 'user',
                                content: prompt,
                            },
                        ],
                        temperature: 0.3,
                        max_tokens: 8000,
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        timeout: 180000, // 180秒超时
                    }
                );
            });

            const result = response.data.choices[0].message.content;

            // 输出 token 消耗
            const usage = response.data?.usage;
            if (usage) {
                logger.info(`Token 消耗: 输入 ${usage.prompt_tokens}, 输出 ${usage.completion_tokens}, 总计 ${usage.total_tokens}`);
            }

            logger.success('智谱 AI 翻译完成');
            return result;
        } catch (error) {
            logger.error('智谱 AI 翻译失败', error);
            throw error;
        }
    }

    buildPrompt(emailContent, links = []) {
        // 构建链接列表字符串（使用简化 ID 节省 token）
        let linksSection = '';
        if (links && links.length > 0) {
            linksSection = '\n\n**资讯中提取的链接（使用简化 ID）：**\n';
            links.forEach((link) => {
                // 使用简化格式：[ID] 文本
                linksSection += `- [${link.id}] ${link.text}\n`;
            });
        }

        return `你是一位专业的 AI 资讯编辑，请将以下英文资讯内容翻译为中文，并按照指定格式整理成精美的 Markdown 笔记。

**要求：**
1. 翻译要准确、流畅、专业
2. 摘要要详细，至少 3-5 句话，充分概括资讯的核心内容
3. 核心要点要全面，列出所有重要信息（至少 5-8 个要点）。**注意：一条新闻严格对应一个核心要点，不要把第一条新闻的内容重复生成到其他要点中。**
4. 每个要点要有详细说明，不要只是简单列举
5. **必须使用下面提供的链接列表，将所有链接都包含在输出中**
6. 排版要美观，使用适当的 Markdown 格式（加粗、斜体、引用等）
7. **输出必须完整，不要截断内容**
8. **不要在输出中包含分隔线（---），直接输出内容即可**
9. **严禁包含任何广告、推广、订阅邀请或联系方式等无关内容**
10. **【重要】内容中的 {{IMG:数字}} 是图片占位符，严格按以下规则处理：**
   - 这些占位符代表原文中的配图，数字表示图片在原文中的顺序
   - **绝对不要混淆图片归属！确保图片紧随其所属的那条新闻内容之后**
   - **参考原文中图片与内容的对应关系**，将占位符放在对应的核心要点之后
   - **不要调换占位符的顺序**，必须按照原文中占位符出现的顺序放置
   - 每个占位符应该紧跟在其对应的内容段落之后，单独占一行
   - 不要删除或修改这些占位符

**输出格式示例：**

# 📰 标题

## 📝 内容摘要

[用 3-5 段详细概括资讯的主要内容，包括背景、重点和意义]

## 🔑 核心要点

### 1. [要点标题]
[详细说明这个要点的内容，包括相关数据、影响等]

{{IMG:1}}

### 2. [要点标题]
[详细说明...]

{{IMG:2}}

[继续列出所有重要要点，至少 5-8 个，每个要点后面如果原文有配图就保留对应的占位符]

## 🔗 相关链接

### 📄 文章资源
- [文章标题](URL) - 简短描述

### 🛠️ 工具产品
- [产品名称](URL) - 简短描述

### 🌐 其他资源
- [资源名称](URL) - 简短描述

**原文内容：**
${emailContent}
${linksSection}

**重要提示：**
- **必须将上面提取的所有链接都包含在"相关链接"部分，不要遗漏任何一个**
- **如果原文中包含"Subscribe"、"Sign up"、"Advertise"等广告链接，请直接忽略，不要包含在输出中**
- 根据链接的内容和上下文，将它们分类到合适的类别（文章资源、工具产品、其他资源）
- 如果原文中没有某个分类的链接，可以省略该分类
- 核心要点要详细展开，不要只写一句话
- 使用 emoji 让排版更生动美观
- **确保输出完整，包含所有要点和链接**
- **输出的第一行就是标题，不要有空行或分隔线**
- **务必保留所有 {{IMG:数字}} 占位符，参考原文将其放在对应内容附近，单独占一行**
- **链接格式：在相关链接部分，使用 [链接标题](链接ID) 格式，如 [OpenAI 官方公告](L5)**
- 严格按照上述格式输出`;
    }

    // 静态方法：将链接 ID 替换回完整 URL
    static restoreLinks(content, linkMap) {
        if (!linkMap || linkMap.size === 0) {
            return content;
        }

        let result = content;
        // 替换格式：(L1) -> (完整URL)
        linkMap.forEach((url, id) => {
            // 匹配 markdown 链接格式中的链接 ID：[文本](L1)
            const pattern = new RegExp(`\\]\\(${id}\\)`, 'g');
            result = result.replace(pattern, `](${url})`);
        });

        return result;
    }
}

export default AITranslator;
