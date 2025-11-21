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
const updateService = require('../services/update-service');

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
let autoStartGroupsLoaded = false; // 标记是否已加载开机启动分组

// 设置文件路径（保留本地设置）
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// 确保设置文件存在
function ensureSettingsFile() {
  if (!fs.existsSync(settingsPath)) {
    fs.writeFileSync(settingsPath, JSON.stringify({ autoStart: false, themeMode: 'light', language: 'zh-CN', autoStartGroups: [] }, null, 2));
  }
}

// 获取图标路径（兼容开发环境和打包环境）
function getIconPath() {
  if (app.isPackaged) {
    // 打包后的路径：resources/build/icon.ico
    let iconPath = path.join(process.resourcesPath, 'build', 'icon.ico');
    if (fs.existsSync(iconPath)) {
      return iconPath;
    }
    // 如果 resourcesPath 不存在，尝试使用 appPath
    iconPath = path.join(app.getAppPath(), 'build', 'icon.ico');
    if (fs.existsSync(iconPath)) {
      return iconPath;
    }
    // 如果还是不存在，尝试直接使用 appPath 下的 icon.ico
    iconPath = path.join(app.getAppPath(), 'icon.ico');
    if (fs.existsSync(iconPath)) {
      return iconPath;
    }
    return null;
  } else {
    // 开发环境路径
    const iconPath = path.join(__dirname, '../../build/icon.ico');
    return fs.existsSync(iconPath) ? iconPath : null;
  }
}

// 创建主窗口（分组列表或登录界面）
function createWindow(initialFile = null) {
  const iconPath = getIconPath();
  let windowIcon = iconPath;
  
  if (!iconPath) {
    debugLog('[main] 窗口图标文件不存在，使用默认图标');
  }
  
  // 检查是否有分组窗口要打开，如果有则默认隐藏主窗口
  let showMainWindow = true;
  try {
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      const hasAutoStartGroups = settings.autoStartGroups && Array.isArray(settings.autoStartGroups) && settings.autoStartGroups.length > 0;
      if (hasAutoStartGroups) {
        showMainWindow = false; // 有分组窗口要打开，默认隐藏主窗口
      }
    }
  } catch (e) {
    // 忽略错误，使用默认值
  }
  
  mainWindow = new BrowserWindow({
    width: 425,
    height: 650,
    minWidth: 340,
    minHeight: 500,
    frame: false,
    transparent: false,
    resizable: true,
    backgroundColor: '#f5f5f5',
    icon: windowIcon,
    show: showMainWindow, // 根据是否有分组窗口决定是否显示
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
function createGroupWindow(groupId, groupName, alwaysOnTop = false, windowBounds = null) {
  // 如果该分组窗口已打开，则聚焦
  if (groupWindows.has(groupId)) {
    const existingWindow = groupWindows.get(groupId);
    existingWindow.focus();
    // 如果指定了置顶状态，更新它
    if (alwaysOnTop !== undefined) {
      existingWindow.setAlwaysOnTop(alwaysOnTop);
    }
    return;
  }

  const iconPath = getIconPath();
  let windowIcon = iconPath;
  
  if (!iconPath) {
    debugLog('[main] 分组窗口图标文件不存在，使用默认图标');
  }
  
  // 使用保存的位置和大小，如果没有则使用默认值
  const defaultWidth = 400;
  const defaultHeight = 600;
  const width = windowBounds?.width || defaultWidth;
  const height = windowBounds?.height || defaultHeight;
  const x = windowBounds?.x;
  const y = windowBounds?.y;
  
  const windowOptions = {
    width: width,
    height: height,
    minWidth: 350,
    minHeight: 400,
    frame: false,
    transparent: false,
    resizable: true,
    backgroundColor: '#f5f5f5',
    title: 'TodoList', // 使用固定标题，不再显示分组名称
    icon: windowIcon,
    alwaysOnTop: alwaysOnTop, // 设置初始置顶状态
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [`--group-id=${groupId}`]
    }
  };
  
  // 如果指定了位置，设置窗口位置
  if (x !== undefined && y !== undefined) {
    windowOptions.x = x;
    windowOptions.y = y;
  }
  
  const groupWindow = new BrowserWindow(windowOptions);

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

  // 监听窗口移动和调整大小，实时保存位置和大小
  let saveTimeout = null;
  const debouncedSaveBounds = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
      saveAllOpenGroupWindows();
    }, 500); // 防抖，500ms后保存
  };
  
  groupWindow.on('moved', debouncedSaveBounds);
  groupWindow.on('resized', debouncedSaveBounds);
  
  groupWindow.on('closed', () => {
    // 在删除窗口引用之前，保存该窗口的状态（即使关闭了也要保存）
    if (groupWindow && !groupWindow.isDestroyed()) {
      const bounds = groupWindow.getBounds();
      saveGroupWindowState(groupId, {
        alwaysOnTop: groupWindow.isAlwaysOnTop(),
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      });
    }
    
    groupWindows.delete(groupId);
    // 窗口关闭时保存所有打开的窗口状态
    saveAllOpenGroupWindows();
  });

  groupWindows.set(groupId, groupWindow);
}

// 保存单个分组窗口状态（即使窗口已关闭）
function saveGroupWindowState(groupId, windowState) {
  try {
    let settings = { autoStart: false, themeMode: 'light', language: 'zh-CN', autoStartGroups: [] };
    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      } catch (e) {
        // 如果读取失败，使用默认值
      }
    }
    
    // 确保 autoStartGroups 是数组
    if (!Array.isArray(settings.autoStartGroups)) {
      settings.autoStartGroups = [];
    }
    
    // 查找是否已存在该分组的记录
    const existingIndex = settings.autoStartGroups.findIndex(g => g.groupId === groupId);
    
    // 合并窗口状态（保留置顶状态等）
    const groupState = {
      groupId: groupId,
      alwaysOnTop: windowState.alwaysOnTop || false,
      x: windowState.x,
      y: windowState.y,
      width: windowState.width,
      height: windowState.height
    };
    
    if (existingIndex >= 0) {
      // 更新现有记录
      settings.autoStartGroups[existingIndex] = groupState;
    } else {
      // 添加新记录
      settings.autoStartGroups.push(groupState);
    }
    
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    debugLog('[main] 已保存分组窗口状态:', groupId, groupState);
  } catch (error) {
    console.error('保存分组窗口状态失败:', error);
  }
}

// 保存所有当前打开的分组窗口状态
function saveAllOpenGroupWindows() {
  try {
    let settings = { autoStart: false, themeMode: 'light', language: 'zh-CN', autoStartGroups: [] };
    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      } catch (e) {
        // 如果读取失败，使用默认值
      }
    }
    
    // 确保 autoStartGroups 是数组
    if (!Array.isArray(settings.autoStartGroups)) {
      settings.autoStartGroups = [];
    }
    
    // 创建一个 Map 来存储当前打开的窗口状态
    const openWindowsMap = new Map();
    
    // 保存当前所有打开的分组窗口及其置顶状态、位置和大小
    groupWindows.forEach((window, groupId) => {
      if (window && !window.isDestroyed()) {
        const bounds = window.getBounds();
        openWindowsMap.set(groupId, {
          groupId: groupId,
          alwaysOnTop: window.isAlwaysOnTop(),
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        });
      }
    });
    
    // 合并：保留已关闭窗口的状态，更新打开窗口的状态
    const updatedGroups = [];
    
    // 先添加当前打开的窗口（会覆盖旧的状态）
    openWindowsMap.forEach((state) => {
      updatedGroups.push(state);
    });
    
    // 然后添加已关闭但之前打开过的窗口（保留它们的位置信息）
    settings.autoStartGroups.forEach((savedGroup) => {
      // 如果这个窗口当前没有打开，保留它的状态
      if (!openWindowsMap.has(savedGroup.groupId)) {
        updatedGroups.push(savedGroup);
      }
    });
    
    settings.autoStartGroups = updatedGroups;
    
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    debugLog('[main] 已保存窗口状态:', updatedGroups.length, '个窗口（', openWindowsMap.size, '个打开）');
  } catch (error) {
    console.error('保存分组窗口状态失败:', error);
  }
}

// 加载并打开开机启动的分组
async function loadAutoStartGroups() {
  // 如果已经加载过，不再重复加载
  if (autoStartGroupsLoaded) {
    return;
  }
  
  try {
    if (!fs.existsSync(settingsPath)) {
      return;
    }
    
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    const hasAutoStartGroups = settings.autoStartGroups && Array.isArray(settings.autoStartGroups) && settings.autoStartGroups.length > 0;
    const isAutoStartEnabled = settings.autoStart === true;
    
    // 如果没有保存的分组窗口状态，且没有设置开机启动，直接返回
    // 注意：即使没有设置开机启动，如果有保存的窗口状态，也应该恢复（支持重启恢复）
    if (!hasAutoStartGroups && !isAutoStartEnabled) {
      autoStartGroupsLoaded = true;
      return;
    }
    
    // 如果有保存的分组窗口状态，无论是否设置了开机启动，都应该恢复（支持重启恢复）
    
    // 等待认证完成
    const restoreResult = await authService.restoreSession();
    let isAuthenticated = false;
    
    if (restoreResult.success && restoreResult.restored) {
      isAuthenticated = true;
    } else {
      // 如果认证失败，检查当前session
      const sessionResult = await authService.getSession();
      if (sessionResult.success && sessionResult.session) {
        isAuthenticated = true;
      }
    }
    
    if (!isAuthenticated) {
      // 未登录，等待登录后再加载
      debugLog('[main] 未登录，等待登录后再打开开机启动分组');
      return;
    }
    
    // 如果有分组窗口要打开
    if (hasAutoStartGroups) {
      // 等待主窗口加载完成并确保分组数据已加载
      const waitForDataReady = async () => {
        // 等待主窗口存在
        let retries = 0;
        while ((!mainWindow || mainWindow.isDestroyed()) && retries < 10) {
          await new Promise(resolve => setTimeout(resolve, 200));
          retries++;
        }
        
        if (!mainWindow || mainWindow.isDestroyed()) {
          return false;
        }
        
        // 等待主窗口加载完成（groups.html）
        const url = mainWindow.webContents.getURL();
        if (!url.includes('groups.html')) {
          // 如果还没加载groups.html，等待加载
          await new Promise((resolve) => {
            const checkUrl = () => {
              const currentUrl = mainWindow.webContents.getURL();
              if (currentUrl.includes('groups.html')) {
                resolve();
              } else {
                setTimeout(checkUrl, 200);
              }
            };
            mainWindow.webContents.once('did-finish-load', () => {
              setTimeout(checkUrl, 300);
            });
            // 超时保护
            setTimeout(resolve, 5000);
          });
        }
        
        // 等待分组数据加载完成（给渲染进程时间加载数据）
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return true;
      };
      
      // 等待数据准备就绪
      const dataReady = await waitForDataReady();
      if (!dataReady) {
        debugLog('[main] 数据未准备就绪，延迟打开开机启动分组');
        // 延迟重试
        setTimeout(() => {
          if (!autoStartGroupsLoaded) {
            loadAutoStartGroups();
          }
        }, 2000);
        return;
      }
      
      // 加载分组数据以获取分组名称（重新加载确保数据最新）
      const groupsResult = await dataService.loadGroups();
      if (!groupsResult.success) {
        console.error('加载分组失败，无法打开开机启动分组');
        autoStartGroupsLoaded = true;
        // 如果加载失败，显示主窗口
        if (isAutoStartEnabled && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
        }
        return;
      }
      
      // 打开分组窗口
      let openedCount = 0;
      const groupsToOpen = [];
      
      settings.autoStartGroups.forEach((groupConfig) => {
        const groupId = groupConfig.groupId;
        const alwaysOnTop = groupConfig.alwaysOnTop || false;
        
        // 获取保存的窗口位置和大小
        const windowBounds = {
          x: groupConfig.x,
          y: groupConfig.y,
          width: groupConfig.width,
          height: groupConfig.height
        };
        
        // 验证分组是否存在
        const group = groupsResult.data.find(g => g.id === groupId);
        if (group) {
          groupsToOpen.push({
            groupId,
            groupName: group.name || '',
            alwaysOnTop,
            windowBounds
          });
        } else {
          console.warn(`开机启动分组 ${groupId} 不存在，已跳过`);
        }
      });
      
      // 打开所有有效的分组窗口
      groupsToOpen.forEach((config) => {
        createGroupWindow(config.groupId, config.groupName, config.alwaysOnTop, config.windowBounds);
        openedCount++;
        debugLog('[main] 打开开机启动分组:', config.groupId, '置顶:', config.alwaysOnTop, '位置:', config.windowBounds);
      });
      
      // 如果有分组窗口打开，隐藏主窗口
      if (openedCount > 0 && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
        debugLog('[main] 已打开', openedCount, '个分组窗口，隐藏主窗口');
      } else if (isAutoStartEnabled && mainWindow && !mainWindow.isDestroyed()) {
        // 如果没有成功打开任何分组窗口，但设置了开机启动，显示主窗口
        mainWindow.show();
        debugLog('[main] 没有分组窗口打开，显示主窗口');
      }
      
      autoStartGroupsLoaded = true; // 标记为已加载
    } else {
      // 没有分组窗口要打开，但设置了开机启动，显示主窗口
      if (isAutoStartEnabled && mainWindow && !mainWindow.isDestroyed()) {
        setTimeout(() => {
          mainWindow.show();
          debugLog('[main] 设置了开机启动但没有分组窗口，显示主窗口');
        }, 500);
      }
      autoStartGroupsLoaded = true;
    }
  } catch (error) {
    console.error('加载开机启动分组失败:', error);
    autoStartGroupsLoaded = true; // 即使失败也标记为已加载，避免重复尝试
    // 出错时，如果设置了开机启动，显示主窗口
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      if (settings.autoStart === true && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
      }
    } catch (e) {
      // 忽略错误
    }
  }
}

// 创建系统托盘
function createTray() {
  const { nativeImage } = require('electron');
  
  // 获取图标路径（兼容开发环境和打包环境）
  let iconPath;
  if (app.isPackaged) {
    // 打包后的路径：resources/build/icon.ico
    iconPath = path.join(process.resourcesPath, 'build', 'icon.ico');
    // 如果 resourcesPath 不存在，尝试使用 appPath
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(app.getAppPath(), 'build', 'icon.ico');
    }
    // 如果还是不存在，尝试直接使用 appPath 下的 icon.ico
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(app.getAppPath(), 'icon.ico');
    }
  } else {
    // 开发环境路径
    iconPath = path.join(__dirname, '../../build/icon.ico');
  }
  
  let trayIcon;
  
  try {
    if (fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath);
      // 检查图标是否有效
      if (trayIcon && !trayIcon.isEmpty()) {
        // 设置托盘图标尺寸（Windows 推荐 16x16）
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
        debugLog('[main] 托盘图标加载成功:', iconPath);
      } else {
        console.warn('[main] 托盘图标文件无效:', iconPath);
        // 如果图标无效，尝试使用应用图标
        trayIcon = app.getAppIcon();
        if (trayIcon && !trayIcon.isEmpty()) {
          trayIcon = trayIcon.resize({ width: 16, height: 16 });
        } else {
          trayIcon = nativeImage.createEmpty();
        }
      }
    } else {
      console.warn('[main] 托盘图标文件不存在:', iconPath);
      // 如果图标不存在，尝试使用应用图标
      trayIcon = app.getAppIcon();
      if (trayIcon && !trayIcon.isEmpty()) {
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
      } else {
        trayIcon = nativeImage.createEmpty();
      }
    }
  } catch (error) {
    console.error('[main] 加载托盘图标失败:', error.message);
    console.error('[main] 尝试的路径:', iconPath);
    // 如果加载失败，尝试使用应用图标
    try {
      trayIcon = app.getAppIcon();
      if (trayIcon && !trayIcon.isEmpty()) {
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
      } else {
        trayIcon = nativeImage.createEmpty();
      }
    } catch (e) {
      trayIcon = nativeImage.createEmpty();
    }
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
  authService.onAuthStateChange(async (event, session) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('auth-state-changed', event, session);
      
      // 如果登出，跳转到登录页面
      if (event === 'SIGNED_OUT') {
        // 关闭所有分组窗口
        groupWindows.forEach((window, groupId) => {
          if (window && !window.isDestroyed()) {
            try {
              window.close();
            } catch (error) {
              console.error(`关闭分组窗口失败 (${groupId}):`, error);
            }
          }
        });
        groupWindows.clear();
        
        // 清空开机启动分组设置
        try {
          let settings = { autoStart: false, themeMode: 'light', language: 'zh-CN', autoStartGroups: [] };
          if (fs.existsSync(settingsPath)) {
            try {
              settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
            } catch (e) {
              // 如果读取失败，使用默认值
            }
          }
          settings.autoStartGroups = []; // 清空分组窗口记录
          fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        } catch (error) {
          console.error('清空开机启动分组设置失败:', error);
        }
        
        mainWindow.loadFile(path.join(__dirname, '../renderer/pages/login.html'));
        // 调整登录窗口大小
        setTimeout(() => {
          mainWindow.setSize(380, 520);
          mainWindow.setMinimumSize(360, 450);
        }, 100);
        // 重置开机启动分组加载标志
        autoStartGroupsLoaded = false;
      }
      // 如果登录，跳转到主页面
      else if (event === 'SIGNED_IN' && session) {
        mainWindow.loadFile(path.join(__dirname, '../renderer/pages/groups.html'));
        // 恢复主窗口大小
        setTimeout(() => {
          mainWindow.setSize(425, 650);
          mainWindow.setMinimumSize(340, 500);
        }, 100);
        // 登录后尝试加载开机启动分组
        setTimeout(() => {
          loadAutoStartGroups();
        }, 500);
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
  
  // 延迟加载开机启动分组，等待认证完成
  // 如果认证成功，会在认证状态变化监听器中加载
  // 如果认证失败，这里也会尝试加载（可能用户已经登录）
  setTimeout(() => {
    loadAutoStartGroups();
  }, 2000); // 延迟2秒，确保认证流程完成
  
  // 延迟检查更新（避免影响启动速度）
  if (updateService.isConfigured) {
    setTimeout(() => {
      debugLog('[main] 开始自动检查更新...');
      updateService.checkForUpdates().catch(err => {
        debugLog('[main] 自动检查更新失败:', err);
      });
    }, 5000); // 延迟5秒检查更新
    
    // 监听更新状态变化，发送给渲染进程
    updateService.onStatusChange((status) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-status-changed', status);
      }
    });
  }
  
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
  // 退出前保存所有打开的窗口状态
  saveAllOpenGroupWindows();
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
  const result = await dataService.deleteGroup(id);
  
  // 如果删除成功，关闭对应的分组窗口
  if (result.success && groupWindows.has(id)) {
    const window = groupWindows.get(id);
    if (window && !window.isDestroyed()) {
      try {
        window.close();
        debugLog('[main] 分组删除成功，已关闭对应的窗口:', id);
      } catch (error) {
        console.error(`关闭分组窗口失败 (${id}):`, error);
      }
    }
    groupWindows.delete(id);
    
    // 更新保存的窗口状态（移除已删除的分组）
    saveAllOpenGroupWindows();
  }
  
  return result;
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
    // 尝试加载保存的窗口位置、大小和置顶状态
    let savedBounds = null;
    let savedAlwaysOnTop = false;
    try {
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        const savedGroup = settings.autoStartGroups?.find(g => g.groupId === groupId);
        if (savedGroup) {
          if (savedGroup.x !== undefined && savedGroup.y !== undefined) {
            savedBounds = {
              x: savedGroup.x,
              y: savedGroup.y,
              width: savedGroup.width,
              height: savedGroup.height
            };
          }
          if (savedGroup.alwaysOnTop !== undefined) {
            savedAlwaysOnTop = savedGroup.alwaysOnTop;
          }
        }
      }
    } catch (e) {
      // 忽略错误，使用默认位置
    }
    
    createGroupWindow(groupId, groupName, savedAlwaysOnTop, savedBounds);
    // 窗口打开后保存状态
    setTimeout(() => {
      saveAllOpenGroupWindows();
    }, 100);
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

// 语言变化通知
ipcMain.on('language-changed', (event, lang) => {
  // 通知所有打开的分组窗口更新语言
  groupWindows.forEach((window) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('language-changed', lang);
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
    const newState = !isAlwaysOnTop;
    window.setAlwaysOnTop(newState);
    
    // 找到对应的 groupId 并保存该窗口状态
    const groupId = findGroupIdByWindow(window);
    if (groupId) {
      const bounds = window.getBounds();
      saveGroupWindowState(groupId, {
        alwaysOnTop: newState,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      });
    }
    
    // 保存所有打开的窗口状态
    saveAllOpenGroupWindows();
    
    // 返回新的置顶状态
    event.reply('always-on-top-changed', newState);
  }
});

// 通过窗口查找对应的groupId
function findGroupIdByWindow(window) {
  for (const [groupId, groupWindow] of groupWindows.entries()) {
    if (groupWindow === window) {
      return groupId;
    }
  }
  return null;
}

// 获取用户数据路径
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

// ========== 更新相关 IPC ==========
ipcMain.handle('update-check', async () => {
  return await updateService.checkForUpdates();
});

ipcMain.handle('update-download', async () => {
  return await updateService.downloadUpdate();
});

ipcMain.handle('update-install', async () => {
  return updateService.quitAndInstall();
});

ipcMain.handle('update-get-status', async () => {
  return updateService.getStatus();
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
    let settings = { autoStart: false, themeMode: 'light', language: 'zh-CN', autoStartGroups: [] };
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
    // 确保 autoStartGroups 字段存在
    if (!settings.autoStartGroups) {
      settings.autoStartGroups = [];
    }
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('Error setting auto start:', error);
    return { success: false, error: error.message };
  }
});

