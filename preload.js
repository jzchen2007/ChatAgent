const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 聊天请求（OpenAI 兼容格式，主进程按配置选择服务商/模型）
  chat: (messages) => ipcRenderer.invoke('chat', messages),
  // 配置读写
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  // 服务商模板列表
  getProviders: () => ipcRenderer.invoke('get-providers'),
  // 流式输出监听
  onChatStreamChunk: (callback) => {
    const fn = (_, chunk) => callback(chunk);
    ipcRenderer.on('chat-stream-chunk', fn);
    return () => ipcRenderer.removeListener('chat-stream-chunk', fn);
  },
  onChatStreamEnd: (callback) => {
    const fn = (_, content) => callback(content);
    ipcRenderer.on('chat-stream-end', fn);
    return () => ipcRenderer.removeListener('chat-stream-end', fn);
  }
});
