const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let groupWindows = new Map(); // 存储所有分组窗口
let tray;

// 数据文件路径
const dataDir = path.join(app.getPath('userData'), 'data');
const groupsPath = path.join(dataDir, 'groups.json'); // 分组数据

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(groupsPath)) {
    fs.writeFileSync(groupsPath, JSON.stringify({ groups: [] }, null, 2));
  }
}

// 创建主窗口（分组列表）
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 650,
    minWidth: 400,
    minHeight: 500,
    frame: false,
    transparent: false,
    resizable: true,
    backgroundColor: '#f5f5f5',
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

  const groupWindow = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 350,
    minHeight: 400,
    frame: false,
    transparent: false,
    resizable: true,
    backgroundColor: '#f5f5f5',
    title: groupName,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [`--group-id=${groupId}`]
    }
  });

  groupWindow.loadFile('group-detail.html');

  // 窗口加载完成后发送分组信息
  groupWindow.webContents.on('did-finish-load', () => {
    groupWindow.webContents.send('group-info', { groupId, groupName });
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
  
  // 使用空图标（Windows 会显示默认图标）
  tray = new Tray(nativeImage.createEmpty());
  
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
  ensureDataDir();
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

