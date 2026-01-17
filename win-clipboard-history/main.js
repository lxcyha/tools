const { app, BrowserWindow, clipboard, globalShortcut, Tray, Menu, ipcMain, shell, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { execFile } = require('child_process');
const crypto = require('crypto');

// 初始化存储
const store = new Store({
  defaults: {
    history: [],
    settings: {
      maxHistory: 50000,
      clearOnExit: false
    }
  }
});

let mainWindow;
let tray;
let lastText = '';
let lastImageHash = '';
let clipboardInterval;

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();
    registerShortcuts();
    startClipboardWatcher();
    
    // 开机自启
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true,
      path: app.getPath('exe')
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 700,
    height: 450,
    frame: false, // 无边框窗口，类似 Alfred
    show: false,  // 默认不显示，等待快捷键唤起
    skipTaskbar: true, // 不在任务栏显示
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    alwaysOnTop: true,
    resizable: false,
    center: true
  });

  mainWindow.loadFile('src/index.html');
  
  // 调试结束，关闭自动打开的开发者工具 (如果需要调试可再次打开)
  // mainWindow.webContents.openDevTools({ mode: 'detach' });

  // 关键：失去焦点时隐藏窗口
  mainWindow.on('blur', () => {
    mainWindow.hide();
  });
}

function createTray() {
  // 优先使用 icon.png
  const iconPath = path.join(__dirname, 'icon.png');
  try {
    // 使用 nativeImage 创建图标，可以自动调整大小
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon.resize({ width: 16, height: 16 }));
  } catch (e) {
    console.error('Failed to create tray icon:', e);
    tray = new Tray(nativeImage.createEmpty()); 
  }

  updateTrayMenu(); // 初始渲染菜单
  
  tray.setToolTip('Clipboard History');
  tray.on('click', showWindow);
}

function updateTrayMenu() {
  const settings = app.getLoginItemSettings();
  
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示剪贴板', click: showWindow },
    { 
      label: '开机自启', 
      type: 'checkbox', 
      checked: settings.openAtLogin,
      click: () => toggleAutoLaunch()
    },
    { label: '清除历史', click: clearHistory },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ]);
  
  tray.setContextMenu(contextMenu);
}

function toggleAutoLaunch() {
  const settings = app.getLoginItemSettings();
  const newState = !settings.openAtLogin;
  
  app.setLoginItemSettings({
    openAtLogin: newState,
    openAsHidden: true,
    path: app.getPath('exe')
  });
  
  // 更新菜单勾选状态
  updateTrayMenu();
}

function registerShortcuts() {
  // 注册全局快捷键 Ctrl+Shift+C
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    showWindow();
  });
}

function showWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    // 通知渲染进程刷新数据
    mainWindow.webContents.send('refresh-data');
  }
}

function startClipboardWatcher() {
  // 轮询剪贴板
  clipboardInterval = setInterval(() => {
    checkClipboard();
  }, 1000);
}

function checkClipboard() {
  // 1. 检查文本
  const text = clipboard.readText();
  if (text && text !== lastText) {
    saveToHistory({ type: 'text', content: text, date: Date.now() });
    lastText = text;
    return;
  }

  // 2. 检查图片 (简单实现：比较 hash)
  const image = clipboard.readImage();
  if (!image.isEmpty()) {
    const dataUrl = image.toDataURL();
    const hash = crypto.createHash('md5').update(dataUrl).digest('hex');
    
    if (hash !== lastImageHash) {
      saveToHistory({ type: 'image', content: dataUrl, date: Date.now() });
      lastImageHash = hash;
    }
  }
}

function saveToHistory(item) {
  const history = store.get('history');
  // 去重：如果内容已存在，将其移到最前
  const existingIndex = history.findIndex(h => h.content === item.content);
  if (existingIndex > -1) {
    history.splice(existingIndex, 1);
  }
  
  history.unshift(item);
  
  // 限制数量
  const max = store.get('settings.maxHistory');
  if (history.length > max) {
    history.length = max;
  }
  
  store.set('history', history);
  
  // 如果窗口打开，实时刷新
  if (mainWindow && mainWindow.isVisible()) {
    mainWindow.webContents.send('refresh-data');
  }
}

function clearHistory() {
  store.set('history', []);
  if (mainWindow) mainWindow.webContents.send('refresh-data');
}

// IPC 监听
ipcMain.on('get-history', (event) => {
  event.returnValue = store.get('history');
});

ipcMain.on('paste-item', (event, item) => {
  // 1. 写入剪贴板
  if (item.type === 'text') {
    clipboard.writeText(item.content);
    lastText = item.content; // 避免被 watcher 再次记录
  } else if (item.type === 'image') {
    const img = nativeImage.createFromDataURL(item.content);
    clipboard.writeImage(img);
    // 更新 hash 避免重复
    lastImageHash = crypto.createHash('md5').update(item.content).digest('hex');
  }

  // 关键：将当前使用的项更新到历史记录顶部
  // 更新时间戳，确保它是最新的
  item.date = Date.now();
  saveToHistory(item);

  // 2. 释放焦点
  // 先最小化，强制 Windows 将焦点归还给上一个活动窗口
  mainWindow.minimize();
  // 此时不需要立即 hide，minimize 已经让它不可见了
  
  // 3. 模拟粘贴 (使用 VBScript)
  // 减少延时到 50ms，提高响应速度
  setTimeout(() => {
    // 动态计算脚本路径
    const scriptPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'paste.vbs') 
      : path.join(__dirname, 'paste.vbs');

    execFile('cscript', ['//Nologo', scriptPath], (err) => {
      if (err) console.error('Paste failed:', err);
      // 移除这里的 restore，避免不必要的闪烁
    });
  }, 50);
});

ipcMain.on('hide-window', () => {
  mainWindow.hide();
});

ipcMain.on('resize-window', (event, height) => {
    // 可选：根据内容动态调整高度
    // mainWindow.setSize(700, height);
});

// 清理
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  clearInterval(clipboardInterval);
});

