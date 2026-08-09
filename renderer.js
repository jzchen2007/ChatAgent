// ========== 配置 Markdown 渲染（CDN 安全降级） ==========
function setupMarkdown() {
  try {
    if (typeof marked === 'undefined') {
      console.warn('marked.js 未加载，将使用纯文本模式');
      return false;
    }
    marked.setOptions({
      breaks: true,
      gfm: true
    });
    return true;
  } catch (e) {
    console.warn('Markdown 配置失败:', e);
    return false;
  }
}
setupMarkdown();

// 渲染后对代码块进行语法高亮（marked v12+ 不再支持 highlight 选项）
function highlightCodeBlocks(container) {
  if (typeof hljs === 'undefined') return;
  const blocks = container.querySelectorAll('pre code');
  blocks.forEach((el) => {
    try {
      if (el.classList.length > 0 && hljs.getLanguage) {
        // 已有语言类名（如 language-python），直接高亮
        hljs.highlightElement(el);
      } else {
        hljs.highlightElement(el);
      }
    } catch (e) {
      console.warn('代码高亮失败:', e);
    }
  });
}

// ========== DOM 元素 ==========
const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const apiKeyInput = document.getElementById('apiKey');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const saveStatus = document.getElementById('saveStatus');

let hasApiKey = false;

// ========== 对话历史（上下文记忆） ==========
let conversationHistory = [
  { role: 'system', content: '你是 DeepSeek，一个由深度求索公司创造的人工智能助手。你特别擅长帮助大学计算机专业学生解答编程、算法、数据结构、操作系统、计算机网络等课程问题。请用友好、专业的方式回答，代码示例要加语言标签以便高亮。' }
];

// ========== 初始化 ==========
async function init() {
  // 先设置默认状态，防止一直显示"检查中..."
  updateApiStatus(false);

  // 检查 Electron API 是否可用
  if (!window.electronAPI) {
    console.error('Electron API 不可用，请确保通过 Electron 启动应用');
    statusText.textContent = 'Electron API 不可用';
    statusDot.classList.add('error');
    statusDot.classList.remove('connected');
    return;
  }

  try {
    const key = await window.electronAPI.getApiKey();
    hasApiKey = !!key;
    if (hasApiKey) {
      apiKeyInput.value = '********';
      updateApiStatus(true);
    } else {
      updateApiStatus(false);
    }
  } catch (err) {
    console.error('API Key 检查失败:', err);
    statusText.textContent = '检查失败';
    statusDot.classList.add('error');
    statusDot.classList.remove('connected');
  }

  sendBtn.addEventListener('click', sendMessage);
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  saveKeyBtn.addEventListener('click', saveApiKey);
  userInput.addEventListener('input', autoResize);
}

function updateApiStatus(connected) {
  if (connected) {
    statusDot.classList.add('connected');
    statusDot.classList.remove('error');
    statusText.textContent = '已配置';
  } else {
    statusDot.classList.remove('connected');
    statusDot.classList.add('error');
    statusText.textContent = '未配置 API Key';
  }
}

async function saveApiKey() {
  const key = apiKeyInput.value.trim();
  if (key && key !== '********') {
    await window.electronAPI.saveApiKey(key);
    hasApiKey = true;
    apiKeyInput.value = '********';
    saveStatus.textContent = '✓ 已保存';
    setTimeout(() => saveStatus.textContent = '', 2000);
    updateApiStatus(true);
  }
}

function autoResize() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
}

// ========== 发送消息（带上下文，流式输出） ==========
async function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  if (!hasApiKey) {
    addMessage('assistant', '❌ 请先在设置中配置 API Key！');
    return;
  }

  // 添加到对话历史
  conversationHistory.push({ role: 'user', content: message });
  addMessage('user', message);
  userInput.value = '';
  userInput.style.height = 'auto';

  const loadingMsg = addLoadingMessage();
  sendBtn.disabled = true;

  try {
    // 流式输出：先创建空消息，再逐步填充内容
    const streamMsg = addMessage('assistant', '');
    const contentDiv = streamMsg.querySelector('.message-content');
    let streamFinished = false;
    let offChunk;
    let offEnd;

    // 注册流式监听
    offChunk = window.electronAPI.onChatStreamChunk((chunk) => {
      if (streamFinished || !contentDiv) return;
      // 增量追加文本并实时渲染 Markdown
      const accumulated = (contentDiv.dataset.accumulated || '') + chunk;
      contentDiv.dataset.accumulated = accumulated;
      if (typeof marked !== 'undefined') {
        contentDiv.innerHTML = marked.parse(accumulated);
        highlightCodeBlocks(contentDiv);
        addCopyButtons(contentDiv);
      } else {
        contentDiv.textContent = accumulated;
      }
      scrollToBottom();
    });
    
    offEnd = window.electronAPI.onChatStreamEnd(() => {
      streamFinished = true;
      if (offChunk) offChunk();
    });
    
    // 初始化累计文本
    contentDiv.dataset.accumulated = '';
    
    // 发送请求（主进程会通过 webContents.send 推送 chunk）
    const response = await window.electronAPI.chat(conversationHistory);
    
    // 清理加载动画
    removeMessage(loadingMsg);
    
    // 流式输出已完成，无需重复渲染
    if (streamFinished) {
      if (offEnd) offEnd();
      // 将流式输出内容添加到对话历史
      const streamedContent = contentDiv?.dataset.accumulated || response;
      conversationHistory.push({ role: 'assistant', content: streamedContent });
      return;
    }
    
    // 回退：流式未触发，手动渲染完整内容
    if (contentDiv) {
      if (typeof marked !== 'undefined') {
        contentDiv.innerHTML = marked.parse(response);
        highlightCodeBlocks(contentDiv);
        addCopyButtons(contentDiv);
      } else {
        contentDiv.textContent = response;
      }
    }
    
    // 添加到对话历史（上下文记忆）
    conversationHistory.push({ role: 'assistant', content: response });
  } catch (error) {
    removeMessage(loadingMsg);
    addMessage('assistant', `❌ 发生错误：${error.message}\n\n请检查：\n1. API Key 是否正确\n2. 网络连接是否正常`);
  }

  sendBtn.disabled = false;
}

// ========== 消息渲染 ==========
function addMessage(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const label = role === 'user' ? '我' : 'DeepSeek';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  if (role === 'assistant') {
    // 使用 marked 渲染 Markdown（安全降级）
    if (typeof marked !== 'undefined') {
      contentDiv.innerHTML = marked.parse(content);
      // 渲染后对代码块进行语法高亮
      highlightCodeBlocks(contentDiv);
      // 为代码块添加复制按钮
      addCopyButtons(contentDiv);
    } else {
      contentDiv.textContent = content;
    }
  } else {
    // 用户消息保持纯文本（转义）
    contentDiv.textContent = content;
  }

  const labelDiv = document.createElement('div');
  labelDiv.className = 'message-label';
  labelDiv.textContent = label;

  messageDiv.appendChild(labelDiv);
  messageDiv.appendChild(contentDiv);

  chatContainer.appendChild(messageDiv);
  scrollToBottom();

  return messageDiv;
}

// 为代码块添加复制按钮
function addCopyButtons(container) {
  const preElements = container.querySelectorAll('pre');
  preElements.forEach(pre => {
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const btn = document.createElement('button');
    btn.className = 'copy-code-btn';
    btn.textContent = '复制';
    wrapper.appendChild(btn);

    btn.addEventListener('click', () => {
      const code = pre.querySelector('code');
      const text = code ? code.textContent : pre.textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = '已复制 ✓';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = '复制';
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  });
}

function addLoadingMessage() {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant loading';
  messageDiv.innerHTML = `
    <div class="message-label">DeepSeek</div>
    <div class="message-content"><span class="loading-dots">正在思考</span></div>
  `;
  chatContainer.appendChild(messageDiv);
  scrollToBottom();
  return messageDiv;
}

function removeMessage(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ========== 启动 ==========
// 立即设置默认状态，防止"检查中..."一直不消失
updateApiStatus(false);

init().catch(err => {
  console.error('初始化失败:', err);
  statusText.textContent = '初始化失败';
  statusDot.classList.add('error');
  statusDot.classList.remove('connected');
});
