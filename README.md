# ChatAgent - AI 智能问答桌面应用

基于 Electron 的多模型 AI 对话桌面应用，专为计算机专业学生设计，提供编程、算法、数据结构、操作系统、计算机网络等课程的智能答疑服务。

支持 **DeepSeek / OpenAI / 通义千问 / 智谱 GLM / Moonshot(Kimi) / Claude** 等主流 API 服务商，以及任意 **OpenAI 兼容格式** 的接口（one-api、OpenRouter、本地 vLLM 等）。

![Version](https://img.shields.io/badge/version-1.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Electron](https://img.shields.io/badge/Electron-28-purple)

## ✨ 功能特性

### 核心功能
- 🧠 **对话上下文记忆** — 多轮对话，AI 记得上下文
- 🎨 **Markdown 渲染** — 完美展示代码、列表、表格
- 💻 **代码高亮** — 支持 10+ 种编程语言（内置全量语言包）
- 📋 **一键复制代码** — 代码块右上角复制按钮
- 📐 **可折叠侧边栏** — 配置/设置收纳左侧，一键折叠为图标
- 🔌 **多模型接入** — 设置面板选择服务商 + 模型，统一 OpenAI 兼容格式
- ⚡ **流式输出** — SSE 打字机效果，实时渲染 Markdown
- 🔒 **本地 API Key** — 安全存储，不上传第三方
- 📦 **本地资源** — Markdown/高亮库本地化，离线可用，启动更快

### 界面
- 🎯 简洁美观的聊天界面
- 📱 响应式布局
- 🌙 暗色代码块样式

## 🚀 快速开始

### 环境要求

- Node.js v18+
- npm v9+
- 任一支持的 AI 服务商 API Key

### 安装

```bash
git clone https://github.com/jzchen2007/ChatAgent.git
cd ChatAgent
npm install
```

### 运行

```bash
npm start
```

### 配置 API

1. 启动应用后，在顶部设置面板中选择**服务商**（DeepSeek / OpenAI / 通义千问 / 智谱 / Kimi / Claude / 自定义）
2. 选择或输入**模型名称**（如 `deepseek-chat`、`gpt-4o-mini`、`qwen-plus`）
3. 确认 **API 地址**（切换服务商时自动填充，也可手动修改）
4. 输入对应的 **API Key**，点击"保存配置"
5. 状态栏显示"已配置"后即可开始对话

### 自定义服务商

选择"自定义（OpenAI 兼容）"，填入任意兼容 OpenAI 格式的接口：

| 字段 | 示例 |
|------|------|
| API 地址 | `https://openrouter.ai/api/v1` |
| 模型 | `anthropic/claude-3.5-sonnet` |
| API Key | 对应平台的 Key |

## 🏷️ 内置服务商

| 服务商 | API 地址 | 常用模型 |
|--------|----------|----------|
| DeepSeek | `api.deepseek.com/v1` | deepseek-chat, deepseek-reasoner |
| OpenAI | `api.openai.com/v1` | gpt-4o, gpt-4o-mini, gpt-4.1 |
| 通义千问（阿里云百炼） | `dashscope.aliyuncs.com/compatible-mode/v1` | qwen-max, qwen-plus, qwen-turbo |
| 智谱 GLM | `open.bigmodel.cn/api/paas/v4` | glm-4-plus, glm-4-air, glm-4-flash |
| Moonshot（Kimi） | `api.moonshot.cn/v1` | moonshot-v1-8k/32k/128k |
| Claude（Anthropic） | `api.anthropic.com/v1` | claude-sonnet-4, claude-3-5-sonnet |

> 所有服务商均通过 OpenAI 兼容接口调用；Claude 使用 Anthropic 官方 OpenAI 兼容端点（`x-api-key` 认证）。

## 📦 打包发布

### Windows

```bash
npm run build
```

打包产物在 `release/` 目录下：
- `ChatAgent-1.2.0-Setup.exe` — NSIS 安装包
- `win-unpacked/` — 免安装绿色版

### macOS

```bash
npm run build:mac
```

### Linux

```bash
npm run build:linux
```

## 🛠️ 开发指南

### 项目结构

```
ChatAgent/
├── package.json          # 项目配置和依赖
├── main.js              # Electron 主进程（API 请求、服务商模板、配置管理）
├── preload.js           # 预加载脚本（IPC 桥接）
├── index.html           # 主页面（HTML 结构、CDN 引用）
├── style.css            # 样式文件
├── renderer.js          # 渲染进程（对话逻辑、设置面板、Markdown 渲染）
├── electron-builder.yml # 打包配置
├── build/
│   └── icon.ico         # 应用图标
└── release/             # 打包输出目录
```

### 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | 28.3.3 | 桌面框架 |
| marked | 18.x | Markdown 渲染 |
| highlight.js | 11.9.0 | 代码语法高亮 |
| electron-builder | 24.x | 应用打包 |

### 配置存储

配置保存在主进程用户数据目录（`userData/config.json`），结构：

```json
{
  "apiKey": "sk-xxx",
  "provider": "deepseek",
  "baseUrl": "https://api.deepseek.com/v1",
  "model": "deepseek-chat"
}
```

新增服务商：在 `main.js` 的 `PROVIDERS` 对象中添加模板（label / baseUrl / models / authHeader）即可。

### 开发注意事项

1. **环境变量**：确保未设置 `ELECTRON_RUN_AS_NODE=1`（会导致 Electron 以纯 Node 模式运行）
2. **npm 镜像**：国内用户建议使用 npmmirror：`npm install --registry=https://registry.npmmirror.com`
3. **allow-scripts**：npm 11+ 需要批准 electron 的 postinstall 脚本：`npm approve-scripts electron`
4. **PATH 劫持**：若 `node` 命令指向非真实 Node.js，构建时请使用真实 Node 路径（如 `D:\nodejs\node.exe`）

## 📖 使用说明

### 对话示例

```
你：用 Python 实现快速排序
AI：[返回带高亮的 Python 快速排序代码]

你：这段代码的时间复杂度是多少？
AI：[基于上文继续回答]
```

### 支持的代码高亮语言

JavaScript、Python、Java、C、C++、SQL、Bash、XML、CSS、JSON

## 🔧 故障排查

### 请求失败 / 返回错误
1. 检查 API Key 是否属于当前所选服务商
2. 检查模型名称是否在该服务商存在（切换服务商时模型列表会自动更新）
3. 部分服务商（如 OpenAI）需要代理网络

### 中文乱码
确保 API 响应使用 UTF-8 编码（已在 v1.1.0 修复）

### "检查中..."卡住
1. 检查是否设置了 `ELECTRON_RUN_AS_NODE=1` 环境变量
2. 清除环境变量：`set ELECTRON_RUN_AS_NODE=`
3. 重新启动应用

### Electron 安装失败
```bash
# 使用国内镜像
npm install --registry=https://registry.npmmirror.com

# 批准 postinstall 脚本
npm approve-scripts electron
```

## 📝 更新日志

### v1.3.0 (2026-08-10)
- ✨ 新增可折叠侧边栏：配置/设置收纳左侧，支持折叠为图标条
- ✨ 配置面板收纳服务商、模型、API 地址、API Key 四项配置
- ✨ 新增设置面板：一键清空对话、关于信息
- 🔧 marked/highlight.js 本地化（lib/ 目录），去除 CDN 依赖，离线可用
- 🐛 修复代码高亮失效（此前 highlight.js 加载的是 CommonJS 版，浏览器无法执行；改用官方浏览器构建）

### v1.2.1 (2026-08-10)
- 🐛 修复 HTTP 协议 API 网关支持（如本地 OmniRoute）
- 🐛 修复模型名配置错误导致的请求失败

### v1.2.0 (2026-08-09)
- ✨ 新增多模型支持：内置 DeepSeek / OpenAI / 通义千问 / 智谱 / Kimi / Claude 服务商模板
- ✨ 设置面板增加服务商选择器、模型选择器、API 地址配置
- ✨ 支持任意 OpenAI 兼容格式接口（自定义服务商）
- 🔧 应用更名为 ChatAgent，去除 DeepSeek 单一品牌绑定

### v1.1.0 (2026-08-09)
- ✨ 新增对话上下文记忆（多轮对话）
- ✨ 新增 Markdown 渲染和代码高亮
- ✨ 新增代码块一键复制功能
- ✨ 新增流式输出（SSE 打字机效果）
- 🐛 修复中文乱码问题（UTF-8 编码）
- 🐛 修复 ELECTRON_RUN_AS_NODE 环境变量问题
- 🐛 修复"检查中..."状态卡死问题
- 🔧 优化 CDN 安全降级机制

### v1.0.0 (2026-08-08)
- 🎉 初始版本发布

## 📄 License

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

- GitHub: [jzchen2007](https://github.com/jzchen2007)
- Email: 1719660563@qq.com
