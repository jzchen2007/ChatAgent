// ChatAgent 启动入口
// 目的：删除 ELECTRON_RUN_AS_NODE 环境变量后以 GUI 模式启动 Electron。
// 该变量会被部分进程管理器（如 LobsterAI）注入，导致 Electron 以纯 Node 模式运行（app 为 undefined）。
// 注意：electron.cmd 依赖 PATH 中的 node（可能被劫持并重新注入该变量），
// 因此这里由真实 node 执行，直接 spawn electron 可执行文件，绕过 node 包装层。

delete process.env.ELECTRON_RUN_AS_NODE;

const { spawn } = require('child_process');

// 纯 Node 模式下 require('electron') 返回 electron 可执行文件的绝对路径
const electronPath = require('electron');

const child = spawn(electronPath, ['.'], { stdio: 'inherit', env: process.env });

child.on('close', (code, signal) => {
  if (code === null) {
    console.error('Electron exited with signal', signal);
    process.exit(1);
  }
  process.exit(code);
});

['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => {
    if (!child.killed) child.kill(sig);
  });
});
