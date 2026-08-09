# DeepSeek 智能问答桌面应用

基于 Electron + DeepSeek API 的本地 AI 对话应用。专为计算机专业学生设计，提供编程、算法、数据结构、操作系统、计算机网络等课程的智能答疑服务。

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Electron](https://img.shields.io/badge/Electron-28-purple)

## ✨ 功能特性

### 核心功能
- 🧠 **对话上下文记忆** — 多轮对话，AI 记得上下文
- 🎨 **Markdown 渲染** — 完美展示代码、列表、表格
- 💻 **代码高亮** — 支持 10 种编程语言（JS/Python/Java/C/C++/SQL/Bash/XML/CSS/JSON）
- 📋 **一键复制代码** — 代码块右上角复制按钮
- 🔒 **本地 API Key** — 安全存储，不上传第三方
- 🌐 **CDN 安全降级** — CDN 失败时自动回退纯文本模式

### 界面
- 🎯 简洁美观的聊天界面
- 📱 响应式布局
- 🌙 暗色代码块样式

## 🚀 快速开始

### 环境要求

- Node.js v18+
- npm v9+
- DeepSeek API Key

### 安装

```bash
git clone https://github.com/jzchen2007/ChatAgent.git
cd DeepSeek-ChatAgent
npm install
```

### 运行

```bash
npm start
```

### 配置 API Key

1. 启动应用后，在顶部输入你的 DeepSeek API Key
2. 点击"保存"按钮
3. 状态栏显示"已配置"后即可开始对话

## 📦 打包发布

### Windows

```bash
npm run build
```

打包产物在 `release/` 目录下：
- `DeepSeek智能问答-1.1.0-Setup.exe` — NSIS 安装包
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
DeepSeek-ChatAgent/
├── package.json          # 项目配置和依赖
├── main.js              # Electron 主进程（API 请求、配置管理）
├── preload.js           # 预加载脚本（IPC 桥接）
├── index.html           # 主页面（HTML 结构、CDN 引用）
├── style.css            # 样式文件
├── renderer.js          # 渲染进程（对话逻辑、Markdown 渲染）
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

### 开发注意事项

1. **环境变量**：确保未设置 `ELECTRON_RUN_AS_NODE=1`（会导致 Electron 以纯 Node 模式运行）
2. **npm 镜像**：国内用户建议使用 npmmirror：`npm install --registry=https://registry.npmmirror.com`
3. **allow-scripts**：npm 11+ 需要批准 electron 的 postinstall 脚本：`npm approve-scripts electron`

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

### v1.1.0 (2026-08-09)
- ✨ 新增对话上下文记忆（多轮对话）
- ✨ 新增 Markdown 渲染和代码高亮
- ✨ 新增代码块一键复制功能
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
