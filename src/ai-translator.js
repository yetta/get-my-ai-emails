import axios from 'axios';
import logger from './logger.js';

class AITranslator {
    constructor(service, apiKey, groupId = null) {
        this.service = service;
        this.apiKey = apiKey;
        this.groupId = groupId; // MiniMax 需要
    }

    async translate(emailContent, links = []) {
        if (this.service === 'minimax') {
            return await this.translateWithMiniMax(emailContent, links);
        } else if (this.service === 'zhipu') {
            return await this.translateWithZhipu(emailContent, links);
        } else {
            throw new Error(`不支持的 AI 服务: ${this.service}`);
        }
    }

    async translateWithMiniMax(emailContent, links = []) {
        try {
            logger.info('使用 MiniMax 翻译邮件内容');

            const prompt = this.buildPrompt(emailContent, links);

            const response = await axios.post(
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
                    max_tokens: 4000,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const result = response.data.choices[0].message.content;
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

            const response = await axios.post(
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
                    max_tokens: 4000,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const result = response.data.choices[0].message.content;
            logger.success('智谱 AI 翻译完成');
            return result;
        } catch (error) {
            logger.error('智谱 AI 翻译失败', error);
            throw error;
        }
    }

    buildPrompt(emailContent, links = []) {
        // 构建链接列表字符串
        let linksSection = '';
        if (links && links.length > 0) {
            linksSection = '\n\n**邮件中提取的链接：**\n';
            links.forEach((link, index) => {
                linksSection += `${index + 1}. [${link.text || 'Link'}](${link.url})\n`;
            });
        }

        return `你是一位专业的 AI 资讯编辑，请将以下英文邮件内容翻译为中文，并按照指定格式整理成精美的 Markdown 笔记。

**要求：**
1. 翻译要准确、流畅、专业
2. 摘要要详细，至少 3-5 句话，充分概括邮件的核心内容
3. 核心要点要全面，列出所有重要信息（至少 5-8 个要点）
4. 每个要点要有详细说明，不要只是简单列举
5. **必须使用下面提供的链接列表，将所有链接都包含在输出中**
6. 排版要美观，使用适当的 Markdown 格式（加粗、斜体、引用等）
7. **输出必须完整，不要截断内容**
8. **不要在输出中包含分隔线（---），直接输出内容即可**

**输出格式示例：**

# 📰 标题

> 📅 发布日期：[从邮件中提取日期]

## 📝 内容摘要

[用 3-5 段详细概括邮件的主要内容，包括背景、重点和意义]

## 🔑 核心要点

### 1. [要点标题]
[详细说明这个要点的内容，包括相关数据、影响等]

### 2. [要点标题]
[详细说明...]

[继续列出所有重要要点，至少 5-8 个]

## 🔗 相关链接

### 📄 文章资源
- [文章标题](URL) - 简短描述

### 🛠️ 工具产品
- [产品名称](URL) - 简短描述

### 🌐 其他资源
- [资源名称](URL) - 简短描述

**邮件原文：**
${emailContent}
${linksSection}

**重要提示：**
- **必须将上面提取的所有链接都包含在"相关链接"部分，不要遗漏任何一个**
- 根据链接的内容和上下文，将它们分类到合适的类别（文章资源、工具产品、其他资源）
- 如果邮件中没有某个分类的链接，可以省略该分类
- 核心要点要详细展开，不要只写一句话
- 使用 emoji 让排版更生动美观
- **确保输出完整，包含所有要点和链接**
- **输出的第一行就是标题，不要有空行或分隔线**
- 严格按照上述格式输出`;
    }
}

export default AITranslator;
