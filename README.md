# Gmail AI 邮件处理器

自动处理 Gmail 邮件，使用 AI 翻译整理并保存到 Obsidian。

## 功能特性

- ✉️ 自动获取来自指定发件人的未读邮件
- 🤖 使用 MiniMax 或智谱 AI 翻译和整理内容
- 📝 格式化为 Markdown（标题、摘要、核心要点、原文链接）
- 📁 自动保存到 Obsidian 笔记库
- ⏰ 支持定时任务（每日 8:00 自动执行）
- 📊 详细的日志记录

## 安装步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写你的配置：

```env
# 选择 AI 服务：minimax 或 zhipu
AI_SERVICE=minimax

# MiniMax API 配置
MINIMAX_API_KEY=your_minimax_api_key_here
MINIMAX_GROUP_ID=your_minimax_group_id_here

# 智谱 AI API 配置
ZHIPU_API_KEY=your_zhipu_api_key_here

# Obsidian 路径
OBSIDIAN_PATH=/Users/xuye/Documents/NoteBook/ObsidianVault/News/AI-Updates

# Gmail 配置
GMAIL_SENDER=The Rundown AI
DAYS_TO_CHECK=2
```

### 3. Gmail API 认证

确保已有以下文件：
- `gcp-oauth.keys.json` - OAuth 凭据
- `token.json` - 授权 token（首次运行时会生成）

## 使用方法

### 手动运行

处理当前未读邮件：

```bash
npm start
```

或：

```bash
node index.js
```

### 启动定时任务

每日 8:00 自动执行：

```bash
npm run scheduler
```

或：

```bash
node run-scheduler.js
```

### 后台运行（推荐）

使用 PM2 管理进程：

```bash
# 安装 PM2
npm install -g pm2

# 启动定时任务
pm2 start run-scheduler.js --name gmail-processor

# 查看日志
pm2 logs gmail-processor

# 停止
pm2 stop gmail-processor

# 设置开机自启
pm2 startup
pm2 save
```

### 使用 macOS launchd（推荐 - 系统级定时任务）

**优势**: 系统级服务，不受进程退出或系统休眠影响，自动重启失败任务。

#### 快速安装

```bash
cd launchd
./install.sh
```

#### 管理命令

```bash
# 查看服务状态
./status.sh

# 手动触发任务（测试用）
launchctl start com.xuye.gmail-processor

# 卸载服务
./uninstall.sh
```

#### 日志位置

- 应用日志: `logs/YYYY-MM-DD.log`
- 系统日志: `logs/launchd-stdout.log`
- 错误日志: `logs/launchd-stderr.log`
- 健康检查: `logs/health-check.log`

#### 故障排查

如果任务未执行，检查：

1. 服务状态: `./launchd/status.sh`
2. 错误日志: `cat logs/launchd-stderr.log`
3. 手动测试: `launchctl start com.xuye.gmail-processor`

## 项目结构

```
.
├── index.js                 # 主程序入口
├── run-scheduler.js         # 定时任务脚本 (node-cron 方案)
├── package.json            # 项目配置
├── .env                    # 环境变量（需自行创建）
├── .env.example            # 环境变量模板
├── gcp-oauth.keys.json     # Google OAuth 凭据
├── token.json              # Gmail API token
├── launchd/                # launchd 定时任务方案
│   ├── com.xuye.gmail-processor.plist  # launchd 配置
│   ├── run-task.sh         # 任务执行脚本
│   ├── install.sh          # 安装脚本
│   ├── uninstall.sh        # 卸载脚本
│   └── status.sh           # 状态查看脚本
├── src/
│   ├── gmail.js            # Gmail API 集成
│   ├── ai-translator.js    # AI 翻译模块
│   ├── html-parser.js      # HTML 解析
│   ├── obsidian-writer.js  # Obsidian 文件写入
│   ├── logger.js           # 日志工具
│   └── health-check.js     # 健康检查模块
└── logs/                   # 日志目录
```

## 日志

日志文件保存在 `logs/` 目录，按日期命名：`YYYY-MM-DD.log`

## 故障排除

### Gmail API 认证失败

确保 `gcp-oauth.keys.json` 和 `token.json` 文件存在且有效。

### AI API 调用失败

检查 `.env` 中的 API Key 是否正确，以及是否有足够的配额。

### 文件保存失败

确认 Obsidian 路径正确，且有写入权限。

## 许可证

MIT
