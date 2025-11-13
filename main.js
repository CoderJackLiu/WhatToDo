const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

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

// 数据文件路径
const dataDir = path.join(app.getPath('userData'), 'data');
const groupsPath = path.join(dataDir, 'groups.json'); // 分组数据
const settingsPath = path.join(dataDir, 'settings.json'); // 设置数据

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(groupsPath)) {
    fs.writeFileSync(groupsPath, JSON.stringify({ groups: [] }, null, 2));
  }
  if (!fs.existsSync(settingsPath)) {
    fs.writeFileSync(settingsPath, JSON.stringify({ autoStart: false, themeMode: 'light' }, null, 2));
  }
}

// 创建主窗口（分组列表）
function createWindow() {
  const iconPath = path.join(__dirname, 'build', 'icon.ico');
  let windowIcon;
  
  try {
    if (fs.existsSync(iconPath)) {
      windowIcon = iconPath;
    }
  } catch (error) {
    console.error('加载窗口图标失败:', error.message);
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

  mainWindow.loadFile('groups.html');

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

  const iconPath = path.join(__dirname, 'build', 'icon.ico');
  let windowIcon;
  
  try {
    if (fs.existsSync(iconPath)) {
      windowIcon = iconPath;
    }
  } catch (error) {
    console.error('加载窗口图标失败:', error.message);
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

  groupWindow.loadFile('group-detail.html');

  // 窗口加载完成后发送分组信息（保留groupName字段，但不显示）
  groupWindow.webContents.on('did-finish-load', () => {
    groupWindow.webContents.send('group-info', { groupId, groupName: groupName || '' });
  });

  // 监听窗口焦点变化
  groupWindow.on('focus', () => {
    groupWindow.webContents.send('window-focus');
  });

  groupWindow.on('blur', () => {
    groupWindow.webContents.send('window-blur');
  });

  // 开发模式下打开开发者工具
  // groupWindow.webContents.openDevTools();

  groupWindow.on('closed', () => {
    groupWindows.delete(groupId);
  });

  groupWindows.set(groupId, groupWindow);
}

// 创建系统托盘
function createTray() {
  const { nativeImage } = require('electron');
  
  // 使用应用图标
  const iconPath = path.join(__dirname, 'build', 'icon.ico');
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
    console.error('加载托盘图标失败:', error.message);
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

// 应用准备就绪
app.whenReady().then(() => {
  // 确保缓存目录存在
  if (!fs.existsSync(userCacheDir)) {
    try {
      fs.mkdirSync(userCacheDir, { recursive: true });
    } catch (error) {
      console.warn('创建缓存目录失败:', error.message);
    }
  }
  
  ensureDataDir();
  
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

// IPC 通信处理

// 加载所有分组
ipcMain.handle('load-groups', async () => {
  try {
    const data = fs.readFileSync(groupsPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading groups:', error);
    return { groups: [] };
  }
});

// 保存所有分组
ipcMain.handle('save-groups', async (event, data) => {
  try {
    fs.writeFileSync(groupsPath, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving groups:', error);
    return { success: false, error: error.message };
  }
});

// 打开分组窗口
ipcMain.on('open-group', (event, { groupId, groupName }) => {
  createGroupWindow(groupId, groupName);
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

// 加载设置
ipcMain.handle('load-settings', async () => {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      return JSON.parse(data);
    }
    return { autoStart: false, themeMode: 'light' };
  } catch (error) {
    console.error('Error loading settings:', error);
    return { autoStart: false, themeMode: 'light' };
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
    let settings = { autoStart: false, themeMode: 'light' };
    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      } catch (e) {
        // 如果读取失败，使用默认值
      }
    }
    settings.autoStart = enabled;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('Error setting auto start:', error);
    return { success: false, error: error.message };
  }
});

