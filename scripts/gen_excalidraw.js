import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Excalidraw Element Generator
class ExcalidrawGen {
    constructor() {
        this.elements = [];
    }

    // Helper to Create Element ID
    id() {
        return Math.random().toString(36).substr(2, 9);
    }

    // Create Text Element
    text(text, x, y, options = {}) {
        const id = this.id();
        const fontSize = options.fontSize || 16;
        const fontFamily = options.fontFamily || 3; // 3 is Virgil
        const lines = text.split('\n');
        // Rough width estimation
        const approxWidth = Math.max(...lines.map(l => l.length)) * (fontSize * 0.6);
        const approxHeight = lines.length * (fontSize * 1.5);

        this.elements.push({
            id,
            type: "text",
            x,
            y,
            width: approxWidth,
            height: approxHeight,
            angle: 0,
            strokeColor: options.strokeColor || "#000000",
            backgroundColor: "transparent",
            fillStyle: "hachure",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 1,
            opacity: 100,
            groupIds: options.groupIds || [],
            roundness: null,
            seed: Math.floor(Math.random() * 100000),
            version: 1,
            versionNonce: 0,
            isDeleted: false,
            boundElements: null,
            updated: Date.now(),
            link: null,
            locked: false,
            text: text,
            fontSize: fontSize,
            fontFamily: fontFamily,
            textAlign: options.textAlign || "left",
            verticalAlign: "top",
            baseline: 18,
            ...options
        });
        return { id, x, y, width: approxWidth, height: approxHeight, type: "text" };
    }

    // Create Rectangle
    rect(x, y, width, height, options = {}) {
        const id = this.id();
        this.elements.push({
            id,
            type: "rectangle",
            x,
            y,
            width,
            height,
            angle: 0,
            strokeColor: options.strokeColor || "#000000",
            backgroundColor: options.backgroundColor || "transparent",
            fillStyle: options.fillStyle || "hachure",
            strokeWidth: options.strokeWidth || 1,
            strokeStyle: options.strokeStyle || "solid",
            roughness: 1, // Hand-drawn look
            opacity: 100,
            groupIds: options.groupIds || [],
            roundness: options.roundness || { type: 3 },
            seed: Math.floor(Math.random() * 100000),
            version: 1,
            versionNonce: 0,
            isDeleted: false,
            boundElements: null,
            updated: Date.now(),
            link: null,
            locked: false,
        });
        return { id, x, y, width, height, type: "rectangle" };
    }

    // Create Diamond
    diamond(x, y, width, height, options = {}) {
        const id = this.id();
        this.elements.push({
            id,
            type: "diamond",
            x,
            y,
            width,
            height,
            angle: 0,
            strokeColor: options.strokeColor || "#000000",
            backgroundColor: options.backgroundColor || "transparent",
            fillStyle: options.fillStyle || "hachure",
            strokeWidth: options.strokeWidth || 1,
            strokeStyle: options.strokeStyle || "solid",
            roughness: 1,
            opacity: 100,
            groupIds: options.groupIds || [],
            roundness: null,
            seed: Math.floor(Math.random() * 100000),
            version: 1,
            versionNonce: 0,
            isDeleted: false,
            boundElements: null,
            updated: Date.now(),
            link: null,
            locked: false,
        });
        return { id, x, y, width, height, type: "diamond" };
    }

    // Create Ellipse
    ellipse(x, y, width, height, options = {}) {
        const id = this.id();
        this.elements.push({
            id,
            type: "ellipse",
            x,
            y,
            width,
            height,
            angle: 0,
            strokeColor: options.strokeColor || "#000000",
            backgroundColor: options.backgroundColor || "transparent",
            fillStyle: options.fillStyle || "hachure",
            strokeWidth: options.strokeWidth || 1,
            strokeStyle: options.strokeStyle || "solid",
            roughness: 1,
            opacity: 100,
            groupIds: options.groupIds || [],
            roundness: null,
            seed: Math.floor(Math.random() * 100000),
            version: 1,
            versionNonce: 0,
            isDeleted: false,
            boundElements: null,
            updated: Date.now(),
            link: null,
            locked: false,
        });
        return { id, x, y, width, height, type: "ellipse" };
    }

    // Detailed Node Builder
    node(textContent, x, y, width, height, style = {}) {
        const groupId = this.id();
        const startX = x - width / 2;
        const startY = y - height / 2;

        const options = {
            strokeColor: style.strokeColor || "#000000",
            backgroundColor: style.backgroundColor || "#ffffff",
            fillStyle: "hachure",
            strokeWidth: style.strokeWidth || 2,
            groupIds: [groupId],
            roundness: { type: 3 },
            strokeStyle: style.strokeStyle || "solid"
        };

        let shape;
        if (style.type === 'diamond') {
            shape = this.diamond(startX, startY, width, height, options);
        } else if (style.type === 'ellipse') {
            shape = this.ellipse(startX, startY, width, height, options);
        } else {
            shape = this.rect(startX, startY, width, height, options);
        }

        const padding = 15;
        const textOptions = {
            strokeColor: style.textColor || "#000000",
            fontSize: style.fontSize || 14,
            textAlign: style.textAlign || "left",
            groupIds: [groupId]
        };

        // Text Positioning
        let finalTextX = startX + padding;
        let finalTextY = startY + padding;

        if (style.textAlign === 'center') {
            // Center Alignment Approximation
            finalTextX = startX + width / 2;
            const lines = textContent.split('\n').length;
            const textH = lines * (textOptions.fontSize * 1.5);
            finalTextY = startY + (height - textH) / 2;
        }

        this.text(textContent, finalTextX, finalTextY, textOptions);

        return { id: shape.id, x: startX, y: startY, width, height, cx: x, cy: y, groupId };
    }

    // Connect Nodes
    connect(fromNode, toNode, color = "#000000", label = "") {
        const id = this.id();
        const startX = fromNode.cx;
        const startY = fromNode.y + fromNode.height;
        const endX = toNode.cx;
        const endY = toNode.y;

        // Custom Path Logic
        const points = [
            [0, 0],
            [0, (endY - startY) / 2],
            [endX - startX, (endY - startY) / 2],
            [endX - startX, endY - startY]
        ];

        if (Math.abs(startX - endX) < 10) {
            points.splice(1, 2);
        }

        this.elements.push({
            id,
            type: "arrow",
            x: startX,
            y: startY,
            width: Math.abs(endX - startX) || 1,
            height: Math.abs(endY - startY) || 1,
            angle: 0,
            strokeColor: color,
            backgroundColor: "transparent",
            fillStyle: "hachure",
            strokeWidth: 2,
            strokeStyle: "solid",
            roughness: 1,
            opacity: 100,
            groupIds: [],
            roundness: { type: 2 },
            seed: Math.floor(Math.random() * 100000),
            version: 1,
            versionNonce: 0,
            isDeleted: false,
            points: points,
            startArrowhead: null,
            endArrowhead: "arrow"
        });

        if (label) {
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            this.text(label, midX, midY - 15, {
                strokeColor: color, textAlign: "center", fontSize: 16, backgroundColor: "#ffffff"
            });
        }
    }

    build() {
        const centerX = 400;
        let currentY = 100;

        // --- 1. Scheduling Layer ---
        const schedule = this.node(
            "⏰ 定时任务\n(Schedule)",
            centerX, currentY,
            200, 80,
            { type: 'ellipse', backgroundColor: "#fff9c4", strokeColor: "#fbc02d", textColor: "#f57f17", textAlign: "center", fontSize: 18 }
        );

        currentY += 150;

        // --- 2. Initialization ---
        const initText = "1. 初始化 & 认证\n\n" +
            "• 加载 .env 配置 (API Keys)\n" +
            "• Gmail API 认证 (OAuth2Client)\n" +
            "• 实例化 AI Translator / HTMLParser";
        const init = this.node(
            initText, centerX, currentY,
            300, 120,
            { backgroundColor: "#e3f2fd", strokeColor: "#1565c0", textColor: "#0d47a1" }
        );
        this.connect(schedule, init, "#fbc02d");

        currentY += 180;

        // --- 3. Search & Fetch (Detailed) ---
        const searchY = currentY;
        const searchLeft = centerX - 250;

        const searchText = "2. 搜索邮件 \n(Gmail API)\n\n" +
            "• Query: label:\"AI subscription\"\n" +
            "• Filter: is:unread, after:2d\n" +
            "• Return: Message IDs List";
        const search = this.node(
            searchText, searchLeft, searchY,
            300, 150,
            { backgroundColor: "#e3f2fd", strokeColor: "#1565c0", textColor: "#0d47a1" }
        );

        // Branch to Cache
        const cacheY = currentY;
        const cacheRight = centerX + 250;

        const cacheText = "3. 缓存检查 & 获取\n(Caching)\n\n" +
            "• 检查 emails/{id}.json\n" +
            "• Hit: 读取本地 JSON\n" +
            "• Miss: users.messages.get\n" +
            "  -> 保存原始 Body 到本地";
        const cache = this.node(
            cacheText, cacheRight, cacheY,
            300, 150,
            { backgroundColor: "#f3e5f5", strokeColor: "#7b1fa2", textColor: "#4a148c" }
        );

        this.connect(init, search, "#1565c0");
        this.connect(search, cache, "#1565c0");

        currentY += 220;

        // --- 4. Parsing (Green) ---
        const parseText = "4. 解析与清洗 (HTML Parser)\n\n" +
            "核心逻辑:\n" +
            "• HTML -> Markdown (Turndown)\n" +
            "• 正则提取链接 -> Map(L1, L2...)\n" +
            "• 识别配图 -> 替换为 {{IMG:n}}";
        const parse = this.node(
            parseText, centerX, currentY,
            350, 140,
            { backgroundColor: "#e8f5e9", strokeColor: "#2e7d32", textColor: "#1b5e20" }
        );

        // Connect from both search/cache logical flow
        this.connect(cache, parse, "#7b1fa2");


        currentY += 200;

        // --- 5. AI Process Loop (Red - Core) ---
        const aiPromptText = "5. 构建 Prompt (Prompt Eng)\n\n" +
            "输入:\n• 清洗后的 Markdown 文本\n• 编号化的链接列表 (节省Token)\n" +
            "要求:\n• 翻译摘要 + 核心要点\n• 必须包含原文链接\n• 严格的 MD 格式输出";
        const aiPrompt = this.node(
            aiPromptText, centerX, currentY,
            350, 140,
            { backgroundColor: "#ffebee", strokeColor: "#c62828", textColor: "#b71c1c" }
        );
        this.connect(parse, aiPrompt, "#2e7d32");

        currentY += 200;

        // AI Request & Retry (Complex Node)
        const aiReqText = "6. AI 请求与重试 (Core)\n(MiniMax / Zhipu API)\n\n" +
            "Parameters:\n• model: abab6.5 / glm-4\n• temperature: 0.3\n• timeout: 120s\n\n" +
            "⚠️ Retry Mechanism:\n• Catch: Network/Timeout Error\n• Backoff: 2s -> 4s -> 8s\n• Max Retries: 3";
        const aiReq = this.node(
            aiReqText, centerX, currentY,
            350, 200,
            { backgroundColor: "#ffebee", strokeColor: "#c62828", textColor: "#b71c1c", strokeWidth: 3 }
        );
        this.connect(aiPrompt, aiReq, "#c62828");

        currentY += 250;

        // --- 6. Post Processing ---
        const restoreText = "7. 后处理 (Post-process)\n\n" +
            "• 还原链接: L1 -> URL\n" +
            "• 缓存翻译结果: translated/{id}.md";
        const restore = this.node(
            restoreText, centerX, currentY,
            350, 100,
            { backgroundColor: "#e3f2fd", strokeColor: "#1565c0", textColor: "#0d47a1" }
        );
        this.connect(aiReq, restore, "#c62828");

        currentY += 150;

        // --- 7. Obsidian Writer ---
        const obsText = "8. 写入 Obsidian\n(Obsidian Writer)\n\n" +
            "• 下载图片 -> attachments/\n" +
            "• 替换占位符 -> ![[image.jpg]]\n" +
            "• 写入最终 .md -> /News/AI-Updates/";
        const obs = this.node(
            obsText, centerX, currentY,
            350, 140,
            { backgroundColor: "#e0f2f1", strokeColor: "#00695c", textColor: "#004d40" }
        );
        this.connect(restore, obs, "#1565c0");

        currentY += 180;

        // End
        const end = this.node(
            "✅ 任务完成\n(Mark Read & Log)",
            centerX, currentY,
            200, 80,
            { type: 'ellipse', backgroundColor: "#fff9c4", strokeColor: "#fbc02d", textColor: "#f57f17", textAlign: "center", fontSize: 16 }
        );
        this.connect(obs, end, "#00695c");

        // --- Side Notes / Legends ---
        const legendX = centerX + 400;
        const legendY = 300;

        // Retry Legend
        this.node(
            "🔥 新增特性: 智能重试\n\n" +
            "针对 2026-01-22 任务失败优化:\n" +
            "• 解决 Socket Hang up 问题\n" +
            "• 60s -> 120s 超时延长\n" +
            "• 自动指数退避重试",
            legendX, legendY,
            280, 200,
            { backgroundColor: "#fff3e0", strokeColor: "#ff9800", textColor: "#e65100", strokeStyle: "dashed" }
        );

        // File Structure Legend
        this.node(
            "📂 项目文件结构\n\n" +
            "/emails (JSON Cache)\n" +
            "/translated (MD Cache)\n" +
            "/logs (Daily Logs)\n" +
            "src/\n  gmail.js\n  ai-translator.js\n  html-parser.js",
            legendX, legendY + 300,
            280, 200,
            { backgroundColor: "#f3e5f5", strokeColor: "#ab47bc", textColor: "#7b1fa2", strokeStyle: "dashed" }
        );

        return JSON.stringify({
            type: "excalidraw",
            version: 2,
            source: "https://excalidraw.com",
            elements: this.elements,
            appState: {
                viewBackgroundColor: "#ffffff",
                currentItemFontFamily: 3
            },
            files: {}
        }, null, 2);
    }
}

// Generate
const generator = new ExcalidrawGen();
const jsonContent = generator.build();
const outputPath = path.join(__dirname, '../excalidraw_workflow.excalidraw');

fs.writeFileSync(outputPath, jsonContent);
console.log(`Excalidraw file generated at: ${outputPath}`);
