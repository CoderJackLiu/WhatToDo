// 设置控制台输出编码为 UTF-8（解决 Windows PowerShell 中文乱码问题）
if (process.platform === 'win32') {
  try {
    // 设置 stdout 和 stderr 编码
    if (process.stdout.setDefaultEncoding) {
      process.stdout.setDefaultEncoding('utf8');
    }
    if (process.stderr.setDefaultEncoding) {
      process.stderr.setDefaultEncoding('utf8');
    }
    // 设置环境变量
    process.env.PYTHONIOENCODING = 'utf-8';
  } catch (e) {
    // 忽略错误
  }
}

// 全局日志开关（设置为 true 启用详细日志，false 禁用）
// 可以通过环境变量 DEBUG=true 来启用，或者直接修改这里的值
const DEBUG_MODE = process.env.DEBUG === 'true' || false;

// 日志包装函数
const debugLog = (...args) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

const { app, BrowserWindow, ipcMain, Menu, Tray, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const authService = require('../services/auth-service');
const dataService = require('../services/data-service');

// 设置缓存目录到用户可写的位置，避免权限错误
const userCacheDir = path.join(os.homedir(), '.electron-todolist-cache');
if (!fs.existsSync(userCacheDir)) {
  fs.mkdirSync(userCacheDir, { recursive: true });
}
process.env.ELECTRON_CACHE = userCacheDir;

// 禁用 GPU 硬件加速以解决 GPU 进程错误
app.disableHardwareAcceleration();
// 或者使用命令行参数方式（如果上面的方法不够）
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');

// 设置缓存目录，避免权限错误
app.commandLine.appendSwitch('disk-cache-dir', userCacheDir);
app.commandLine.appendSwitch('disk-cache-size', '104857600'); // 100MB

let mainWindow;
let groupWindows = new Map(); // 存储所有分组窗口
let tray;

// 设置文件路径（保留本地设置）
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// 确保设置文件存在
function ensureSettingsFile() {
  if (!fs.existsSync(settingsPath)) {
    fs.writeFileSync(settingsPath, JSON.stringify({ autoStart: false, themeMode: 'light', language: 'zh-CN' }, null, 2));
  }
}

// 创建主窗口（分组列表或登录界面）
function createWindow(initialFile = null) {
  const iconPath = path.join(__dirname, '../../build/icon.ico');
  let windowIcon;
  
  try {
    if (fs.existsSync(iconPath)) {
      windowIcon = iconPath;
    }
  } catch (error) {
    console.error('Failed to load window icon:', error.message);
  }
  
  mainWindow = new BrowserWindow({
    width: 500,
    height: 650,
    minWidth: 400,
    minHeight: 500,
    frame: false,
    transparent: false,
    resizable: true,
    backgroundColor: '#f5f5f5',
    icon: windowIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // 根据认证状态加载不同页面
  if (initialFile) {
    mainWindow.loadFile(initialFile);
    // 如果是登录页面，调整窗口大小
    if (initialFile && initialFile.includes('login.html')) {
      mainWindow.setSize(380, 520);
      mainWindow.setMinimumSize(360, 450);
    }
  } else {
    // 检查认证状态
    checkAuthAndLoad();
  }
  
  // 监听页面加载完成，如果是登录页面则调整窗口大小
  mainWindow.webContents.on('did-finish-load', () => {
    const url = mainWindow.webContents.getURL();
    if (url.includes('login.html')) {
      mainWindow.setSize(380, 520);
      mainWindow.setMinimumSize(360, 450);
    }
  });

  // 关闭窗口时最小化到托盘
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 创建分组窗口
function createGroupWindow(groupId, groupName) {
  // 如果该分组窗口已打开，则聚焦
  if (groupWindows.has(groupId)) {
    groupWindows.get(groupId).focus();
    return;
  }

  const iconPath = path.join(__dirname, '../../build/icon.ico');
  let windowIcon;
  
  try {
    if (fs.existsSync(iconPath)) {
      windowIcon = iconPath;
    }
  } catch (error) {
    console.error('Failed to load group window icon:', error.message);
  }
  
  const groupWindow = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 350,
    minHeight: 400,
    frame: false,
    transparent: false,
    resizable: true,
    backgroundColor: '#f5f5f5',
    title: 'TodoList', // 使用固定标题，不再显示分组名称
    icon: windowIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [`--group-id=${groupId}`]
    }
  });

  debugLog('[main] 创建分组窗口, groupId:', groupId, 'groupName:', groupName);
  
  // 监听渲染进程的控制台输出（备用方案）
  groupWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (DEBUG_MODE) {
      const prefix = '[group-detail-renderer-console]';
      if (level === 0) {
        console.log(`${prefix} ${message}`);
      } else if (level === 1) {
        console.warn(`${prefix} ${message}`);
      } else if (level === 2) {
        console.error(`${prefix} ${message}`);
      }
    }
  });
  
  // 监听页面错误
  groupWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[main] 分组窗口加载失败:', errorCode, errorDescription, validatedURL);
  });
  
  groupWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[main] 渲染进程崩溃:', details);
  });
  
  groupWindow.webContents.on('unresponsive', () => {
    console.warn('[main] 分组窗口无响应');
  });

  groupWindow.loadFile(path.join(__dirname, '../renderer/pages/group-detail.html'));

  // 窗口加载完成后发送分组信息（保留groupName字段，但不显示）
  groupWindow.webContents.on('did-finish-load', () => {
    debugLog('[main] 分组窗口加载完成，发送分组信息, groupId:', groupId, 'groupName:', groupName);
    
    // 延迟发送，确保脚本已加载
    setTimeout(() => {
    groupWindow.webContents.send('group-info', { groupId, groupName: groupName || '' });
      debugLog('[main] 分组信息已发送');
    }, 100);
    
    // 窗口加载完成后再打开开发者工具
    try {
      //groupWindow.webContents.openDevTools();
      debugLog('[main] 开发者工具已打开');
    } catch (error) {
      console.error('[main] 打开开发者工具失败:', error);
    }
  });

  // 监听窗口焦点变化
  groupWindow.on('focus', () => {
    groupWindow.webContents.send('window-focus');
  });

  groupWindow.on('blur', () => {
    groupWindow.webContents.send('window-blur');
  });

  // 监听窗口错误
  groupWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[main] 分组窗口加载失败:', errorCode, errorDescription);
  });

  groupWindow.on('closed', () => {
    groupWindows.delete(groupId);
  });

  groupWindows.set(groupId, groupWindow);
}

// 创建系统托盘
function createTray() {
  const { nativeImage } = require('electron');
  
  // 使用应用图标
  const iconPath = path.join(__dirname, '../../build/icon.ico');
  let trayIcon;
  
  try {
    if (fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath);
      // 检查图标是否有效
      if (trayIcon && !trayIcon.isEmpty()) {
        // 设置托盘图标尺寸（Windows 推荐 16x16）
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
      } else {
        // 如果图标无效，使用空图标
        trayIcon = nativeImage.createEmpty();
      }
    } else {
      // 如果图标不存在，使用空图标
      trayIcon = nativeImage.createEmpty();
    }
  } catch (error) {
    console.error('Failed to load tray icon:', error.message);
    // 如果加载失败，使用空图标
    trayIcon = nativeImage.createEmpty();
  }
  
  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('TodoList');
  tray.setContextMenu(contextMenu);
  
  // 双击托盘图标显示主窗口
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

// 检查认证状态并加载相应页面
async function checkAuthAndLoad() {
  try {
    // 首先尝试恢复保存的 session
    const restoreResult = await authService.restoreSession();
    
    if (restoreResult.success && restoreResult.restored) {
      // Session 恢复成功，加载主界面
      debugLog('[main] Session 恢复成功，加载主界面');
      mainWindow.loadFile(path.join(__dirname, '../renderer/pages/groups.html'));
      return;
    }
    
    // Session 恢复失败，检查原因
    if (restoreResult.reason && restoreResult.reason.includes('过期')) {
      debugLog('[main] Session 已过期，显示过期提示');
      // 设置过期标志，登录页面会显示提示
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('session-expired', {
          reason: restoreResult.reason,
          expiresAt: restoreResult.expiresAt
        });
      });
    }
    
    // 如果恢复失败，检查当前 Supabase session
    const result = await authService.getSession();
    if (result.success && result.session) {
      // 已登录，加载主界面
      debugLog('[main] 当前有有效 session，加载主界面');
      mainWindow.loadFile(path.join(__dirname, '../renderer/pages/groups.html'));
    } else {
      // 未登录，加载登录界面
      debugLog('[main] 未登录，加载登录界面');
      mainWindow.loadFile(path.join(__dirname, '../renderer/pages/login.html'));
      // 调整登录窗口大小
      setTimeout(() => {
        mainWindow.setSize(380, 520);
        mainWindow.setMinimumSize(360, 450);
      }, 100);
    }
  } catch (error) {
    console.error('Failed to check auth status:', error);
    // 出错时加载登录界面
    mainWindow.loadFile('login.html');
    // 调整登录窗口大小
    setTimeout(() => {
      mainWindow.setSize(380, 520);
      mainWindow.setMinimumSize(360, 450);
    }, 100);
  }
}

// 注册自定义协议（用于 OAuth 回调）
const PROTOCOL = 'com.electron.todolist';
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // 注册协议
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }

  // 处理协议调用（Windows）
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 查找协议 URL
    const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (url) {
      handleProtocolUrl(url);
    }
    
    // 聚焦窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // 处理协议调用（macOS）
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleProtocolUrl(url);
  });
}

// 处理协议 URL（OAuth 回调和邮箱确认回调）
function handleProtocolUrl(url) {
  // console.log('Received protocol URL:', url);
  
  // 如果窗口还未创建，等待窗口创建完成
  if (!mainWindow || mainWindow.isDestroyed()) {
    // 延迟处理，等待窗口创建
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('oauth-callback', url);
      }
    }, 1000);
  } else {
    mainWindow.webContents.send('oauth-callback', url);
    
    // 确保窗口可见
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
}

// 应用准备就绪
app.whenReady().then(() => {
  // 检查启动参数中的协议URL（Windows首次启动时）
  if (process.platform === 'win32' && process.argv.length >= 2) {
    const protocolUrl = process.argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (protocolUrl) {
      // 延迟处理，等待窗口创建
      setTimeout(() => {
        handleProtocolUrl(protocolUrl);
      }, 500);
    }
  }
  
  // 确保缓存目录存在
  if (!fs.existsSync(userCacheDir)) {
    try {
      fs.mkdirSync(userCacheDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to create cache directory:', error.message);
    }
  }
  
  ensureSettingsFile();
  
  // 加载设置并应用开机自启动
  try {
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      if (settings.autoStart) {
        app.setLoginItemSettings({
          openAtLogin: true,
          openAsHidden: false
        });
      }
    }
  } catch (error) {
    console.error('Error loading auto start settings:', error);
  }
  
  // 监听认证状态变化
  authService.onAuthStateChange((event, session) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('auth-state-changed', event, session);
      
      // 如果登出，跳转到登录页面
      if (event === 'SIGNED_OUT') {
        mainWindow.loadFile(path.join(__dirname, '../renderer/pages/login.html'));
        // 调整登录窗口大小
        setTimeout(() => {
          mainWindow.setSize(380, 520);
          mainWindow.setMinimumSize(360, 450);
        }, 100);
      }
      // 如果登录，跳转到主页面
      else if (event === 'SIGNED_IN' && session) {
        mainWindow.loadFile(path.join(__dirname, '../renderer/pages/groups.html'));
        // 恢复主窗口大小
        setTimeout(() => {
          mainWindow.setSize(500, 650);
          mainWindow.setMinimumSize(400, 500);
        }, 100);
      }
    }
  });
  
  // 监听数据变化（实时同步）
  dataService.subscribeToGroups((payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('data-groups-changed', payload);
    }
  });
  
  createWindow();
  createTray();
  
  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

// 所有窗口关闭时不退出，保持托盘运行
app.on('window-all-closed', (e) => {
  e.preventDefault();
});

// 退出前清理
app.on('before-quit', () => {
  app.isQuitting = true;
});

// ========== IPC 通信处理 ==========

// ========== 认证相关 IPC ==========
ipcMain.handle('auth-sign-up', async (event, email, password) => {
  return await authService.signUp(email, password);
});

ipcMain.handle('auth-sign-in', async (event, email, password) => {
  return await authService.signIn(email, password);
});

ipcMain.handle('auth-resend-confirmation', async (event, email) => {
  return await authService.resendConfirmationEmail(email);
});

ipcMain.handle('auth-sign-in-github', async () => {
  const result = await authService.signInWithGitHub();
  
  // 如果成功获取到URL，打开浏览器
  if (result.success && result.url) {
    try {
      await shell.openExternal(result.url);
    } catch (error) {
      console.error('打开浏览器失败:', error);
      return { success: false, error: '无法打开浏览器: ' + error.message };
    }
  }
  
  return result;
});

ipcMain.handle('auth-sign-out', async () => {
  return await authService.signOut();
});

ipcMain.handle('auth-get-current-user', async () => {
  return await authService.getCurrentUser();
});

ipcMain.handle('auth-get-session', async () => {
  return await authService.getSession();
});

ipcMain.handle('auth-handle-oauth-callback', async (event, url) => {
  return await authService.handleOAuthCallback(url);
});

// ========== 数据操作相关 IPC ==========
ipcMain.handle('data-load-groups', async () => {
  return await dataService.loadGroups();
});

ipcMain.handle('data-create-group', async (event, name, theme) => {
  return await dataService.createGroup(name, theme);
});

ipcMain.handle('data-update-group', async (event, id, updates) => {
  return await dataService.updateGroup(id, updates);
});

ipcMain.handle('data-delete-group', async (event, id) => {
  return await dataService.deleteGroup(id);
});

ipcMain.handle('data-reorder-groups', async (event, groupIds) => {
  return await dataService.reorderGroups(groupIds);
});

ipcMain.handle('data-load-todos', async (event, groupId) => {
  return await dataService.loadTodos(groupId);
});

ipcMain.handle('data-create-todo', async (event, groupId, text) => {
  return await dataService.createTodo(groupId, text);
});

ipcMain.handle('data-update-todo', async (event, id, updates) => {
  return await dataService.updateTodo(id, updates);
});

ipcMain.handle('data-delete-todo', async (event, id) => {
  return await dataService.deleteTodo(id);
});

ipcMain.handle('data-delete-todos', async (event, ids) => {
  return await dataService.deleteTodos(ids);
});

ipcMain.handle('data-reorder-todos', async (event, groupId, todoIds) => {
  return await dataService.reorderTodos(groupId, todoIds);
});

// 订阅待办变化
ipcMain.on('subscribe-todos', (event, groupId) => {
  debugLog('[main] 收到订阅待办请求, groupId:', groupId);
  dataService.subscribeToTodos(groupId, (payload) => {
    debugLog('[main] 待办变化，发送给渲染进程, groupId:', groupId, 'payload:', payload);
    event.sender.send(`data-todos-changed-${groupId}`, payload);
  });
});

// 接收渲染进程的日志
ipcMain.on('renderer-log', (event, level, message) => {
  if (DEBUG_MODE) {
    const prefix = '[group-detail-renderer]';
    if (level === 'error') {
      console.error(`${prefix} ${message}`);
    } else if (level === 'warn') {
      console.warn(`${prefix} ${message}`);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }
});

// 打开分组窗口
ipcMain.on('open-group', (event, { groupId, groupName }) => {
  debugLog('[main] 收到打开分组请求, groupId:', groupId, 'groupName:', groupName);
  try {
  createGroupWindow(groupId, groupName);
    debugLog('[main] 分组窗口创建成功');
  } catch (error) {
    console.error('[main] 创建分组窗口失败:', error);
  }
});

// 分组数据变化通知
ipcMain.on('groups-changed', () => {
  // 通知主窗口刷新
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('groups-changed');
  }
});

// 主题变化通知
ipcMain.on('theme-changed', () => {
  // 通知所有打开的分组窗口刷新主题
  groupWindows.forEach((window) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('theme-changed');
    }
  });
});

// 窗口控制（支持多窗口）
ipcMain.on('minimize-window', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) {
    window.minimize();
  }
});

ipcMain.on('close-window', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) {
    window.close();
  }
});

// 显示主窗口
ipcMain.on('show-main-window', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  } else {
    // 如果主窗口不存在，创建一个新的
    createWindow();
  }
});

// 切换窗口置顶状态
ipcMain.on('toggle-always-on-top', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) {
    const isAlwaysOnTop = window.isAlwaysOnTop();
    window.setAlwaysOnTop(!isAlwaysOnTop);
    // 返回新的置顶状态
    event.reply('always-on-top-changed', !isAlwaysOnTop);
  }
});

// 获取用户数据路径
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

// ========== 设置管理（保留本地设置） ==========
ipcMain.handle('load-settings', async () => {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      return JSON.parse(data);
    }
    return { autoStart: false, themeMode: 'light', language: 'zh-CN' };
  } catch (error) {
    console.error('Error loading settings:', error);
    return { autoStart: false, themeMode: 'light', language: 'zh-CN' };
  }
});

// 保存设置
ipcMain.handle('save-settings', async (event, settings) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false, error: error.message };
  }
});

// 设置开机自启动
ipcMain.handle('set-auto-start', async (event, enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: false
    });
    
    // 保存设置（保留其他设置）
    let settings = { autoStart: false, themeMode: 'light', language: 'zh-CN' };
    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      } catch (e) {
        // 如果读取失败，使用默认值
      }
    }
    settings.autoStart = enabled;
    // 确保 language 字段存在
    if (!settings.language) {
      settings.language = 'zh-CN';
    }
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('Error setting auto start:', error);
    return { success: false, error: error.message };
  }
});

