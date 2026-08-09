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
const API_URL = 'api.deepseek.com';

// ========== API Key 配置管理（存主进程，更安全） ==========
function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function readConfig() {
  try {
    const data = fs.readFileSync(getConfigPath(), 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

function writeConfig(config) {
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
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
    title: 'DeepSeek 智能问答'
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

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

// 保存 API Key
ipcMain.handle('save-api-key', (event, apiKey) => {
  const config = readConfig();
  config.apiKey = apiKey;
  writeConfig(config);
  return true;
});

// 读取 API Key（判断是否已配置）
ipcMain.handle('get-api-key', () => {
  const config = readConfig();
  return config.apiKey || '';
});

// 聊天请求（主进程发起，界面通过 IPC 调用）
// 支持传入对话历史（messages 数组），维持上下文
// 支持流式输出（SSE streaming）
ipcMain.handle('chat', async (event, messages) => {
  const config = readConfig();
  const apiKey = config.apiKey;

  if (!apiKey) {
    throw new Error('未配置 API Key，请在设置中填写');
  }

  // 确保传入的是数组格式
  const conversationMessages = Array.isArray(messages) ? messages : [{ role: 'user', content: messages }];

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'deepseek-chat',
      messages: conversationMessages,
      stream: true
    });

    const options = {
      hostname: API_URL,
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'text/event-stream'
      }
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
