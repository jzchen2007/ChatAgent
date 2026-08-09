const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  chat: (message) => ipcRenderer.invoke('chat', message),
  saveApiKey: (apiKey) => ipcRenderer.invoke('save-api-key', apiKey),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
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
