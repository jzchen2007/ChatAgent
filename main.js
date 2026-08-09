const { app, BrowserWindow, ipcMain } = require('electron');

// 防御：检测 ELECTRON_RUN_AS_NODE 环境变量（会导致 Electron 以纯 Node 模式运行，app 为 undefined）
if (typeof app === 'undefined') {
  console.error('错误：检测到 ELECTRON_RUN_AS_NODE 环境变量，Electron 无法以 GUI 模式启动。');
  console.error('请执行以下命令清除后重试：');
  console.error('  set ELECTRON_RUN_AS_NODE=');
  process.exit(1);
}

const path = require('path');
const fs = require('fs');
const https = require('https');

let mainWindow;

// ========== 服务商模板（统一 OpenAI 兼容接口） ==========
const PROVIDERS = {
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    authHeader: 'bearer',
    note: 'DeepSeek 官方 API（deepseek-chat / deepseek-reasoner）'
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'o3-mini'],
    authHeader: 'bearer',
    note: 'OpenAI 官方 API（部分地区需代理）'
  },
  qwen: {
    label: '通义千问（阿里云百炼）',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'],
    authHeader: 'bearer',
    note: '阿里云百炼 DashScope 兼容模式'
  },
  zhipu: {
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4-plus', 'glm-4-air', 'glm-4-flash'],
    authHeader: 'bearer',
    note: '智谱 AI 开放平台'
  },
  moonshot: {
    label: 'Moonshot（Kimi）',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    authHeader: 'bearer',
    note: '月之暗面 Kimi 开放平台'
  },
  claude: {
    label: 'Claude（Anthropic）',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
    authHeader: 'x-api-key',
    extraHeaders: { 'anthropic-version': '2023-06-01' },
    note: 'Anthropic OpenAI 兼容端点'
  },
  custom: {
    label: '自定义（OpenAI 兼容）',
    baseUrl: '',
    models: [],
    authHeader: 'bearer',
    note: '任意兼容 OpenAI 格式的 API 网关（如 one-api、OpenRouter、本地 vLLM 等）'
  }
};

function getProviderDef(provider) {
  return PROVIDERS[provider] || PROVIDERS.deepseek;
}

// ========== 配置管理（存主进程，更安全） ==========
function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function getDefaultConfig() {
  return {
    apiKey: '',
    provider: 'deepseek',
    baseUrl: PROVIDERS.deepseek.baseUrl,
    model: PROVIDERS.deepseek.models[0]
  };
}

function readConfig() {
  try {
    const data = fs.readFileSync(getConfigPath(), 'utf-8');
    const parsed = JSON.parse(data);
    // 合并默认值，兼容旧版本只有 apiKey 的配置
    const def = getDefaultConfig();
    const provider = parsed.provider || def.provider;
    const providerDef = getProviderDef(provider);
    return {
      apiKey: parsed.apiKey || '',
      provider,
      baseUrl: parsed.baseUrl || providerDef.baseUrl || '',
      model: parsed.model || providerDef.models?.[0] || ''
    };
  } catch (e) {
    return getDefaultConfig();
  }
}

function writeConfig(config) {
  const merged = Object.assign(getDefaultConfig(), config);
  fs.writeFileSync(getConfigPath(), JSON.stringify(merged, null, 2), 'utf-8');
}

// 兼容性迁移：应用改名后 userData 目录变化（deepseek-chat / DeepSeek智能问答 → chat-agent / ChatAgent）
// 将旧路径下的 config.json 复制到新路径，避免用户丢失已保存的 API Key
function migrateLegacyConfig() {
  const newPath = getConfigPath();
  if (fs.existsSync(newPath)) return; // 新配置已存在，无需迁移

  const userDataRoot = path.dirname(app.getPath('userData'));
  const legacyDirs = ['deepseek-chat', 'DeepSeek智能问答', 'deepseek-chat-app'];
  for (const dir of legacyDirs) {
    const oldPath = path.join(userDataRoot, dir, 'config.json');
    try {
      if (fs.existsSync(oldPath)) {
        fs.copyFileSync(oldPath, newPath);
        console.log('已迁移旧版配置:', oldPath, '→', newPath);
        return;
      }
    } catch (e) {
      console.error('配置迁移失败:', e.message);
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'build', 'icon.ico'),
    title: 'ChatAgent - AI 智能助手'
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  migrateLegacyConfig();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ========== IPC 接口 ==========

// 保存完整配置（apiKey / provider / baseUrl / model）
ipcMain.handle('save-config', (event, config) => {
  const current = readConfig();
  writeConfig(Object.assign({}, current, config));
  return true;
});

// 读取完整配置
ipcMain.handle('get-config', () => {
  return readConfig();
});

// 获取服务商模板列表（供设置面板渲染）
ipcMain.handle('get-providers', () => {
  return Object.entries(PROVIDERS).map(([id, p]) => ({
    id,
    label: p.label,
    baseUrl: p.baseUrl,
    models: p.models,
    note: p.note
  }));
});

// 聊天请求（主进程发起，界面通过 IPC 调用）
// 支持传入对话历史（messages 数组），维持上下文
// 支持流式输出（SSE streaming）
// 模型、API 地址、认证方式均从配置读取，适配任意 OpenAI 兼容接口
ipcMain.handle('chat', async (event, messages) => {
  const config = readConfig();
  const apiKey = config.apiKey;

  if (!apiKey) {
    throw new Error('未配置 API Key，请在设置中填写');
  }

  const providerDef = getProviderDef(config.provider);
  const baseUrl = (config.baseUrl || providerDef.baseUrl || '').replace(/\/+$/, '');
  const model = config.model || providerDef.models?.[0] || '';

  if (!baseUrl) {
    throw new Error('未配置 API 地址（Base URL），请在设置中填写');
  }
  if (!model) {
    throw new Error('未配置模型名称，请在设置中填写');
  }

  let endpoint;
  try {
    endpoint = new URL(baseUrl);
  } catch (e) {
    throw new Error('API 地址格式不正确: ' + baseUrl);
  }
  const pathname = (endpoint.pathname || '').replace(/\/+$/, '') + '/chat/completions';

  // 确保传入的是数组格式
  const conversationMessages = Array.isArray(messages) ? messages : [{ role: 'user', content: messages }];

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model,
      messages: conversationMessages,
      stream: true
    });

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream'
    };
    // 认证方式：默认 Bearer；Claude 兼容端点用 x-api-key
    if (providerDef.authHeader === 'x-api-key') {
      headers['x-api-key'] = apiKey;
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    // 服务商额外必需头（如 anthropic-version）
    if (providerDef.extraHeaders) {
      Object.assign(headers, providerDef.extraHeaders);
    }

    const options = {
      hostname: endpoint.hostname,
      port: endpoint.port || 443,
      path: pathname,
      method: 'POST',
      headers
    };

    const req = https.request(options, (res) => {
      res.setEncoding('utf-8');

      // 非 200 响应作为错误处理
      if (res.statusCode !== 200) {
        let errData = '';
        res.on('data', chunk => errData += chunk);
        res.on('end', () => {
          try {
            const errJson = JSON.parse(errData);
            reject(new Error(errJson.error?.message || `HTTP ${res.statusCode}`));
          } catch {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
        return;
      }

      let buffer = '';
      let fullContent = '';

      res.on('data', (chunk) => {
        buffer += chunk;
        // 解析 SSE 流
        const lines = buffer.split(/\r?\n/);
        // 最后一段可能不完整，保留在 buffer 中
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          if (line === 'data: [DONE]') {
            // 流结束
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('chat-stream-end', fullContent);
            }
            resolve(fullContent);
            return;
          }
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('chat-stream-chunk', delta);
                }
              }
            } catch {}
          }
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error('网络请求失败: ' + e.message));
    });

    req.write(postData);
    req.end();
  });
});
