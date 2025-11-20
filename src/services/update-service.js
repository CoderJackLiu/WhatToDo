const { autoUpdater } = require('electron-updater');
const { app } = require('electron');

// 更新状态
let updateStatus = {
  checking: false,
  available: false,
  downloaded: false,
  downloading: false,
  error: null,
  progress: 0,
  currentVersion: app.getVersion(),
  latestVersion: null,
  releaseNotes: null
};

// 状态变化回调列表
const statusCallbacks = [];

// 通知状态变化
function notifyStatusChange() {
  statusCallbacks.forEach(callback => {
    try {
      callback({ ...updateStatus });
    } catch (error) {
      console.error('Error in status callback:', error);
    }
  });
}

// 注册状态变化监听器
function onStatusChange(callback) {
  statusCallbacks.push(callback);
  // 立即返回当前状态
  callback({ ...updateStatus });
  
  // 返回取消监听的函数
  return () => {
    const index = statusCallbacks.indexOf(callback);
    if (index > -1) {
      statusCallbacks.splice(index, 1);
    }
  };
}

// 配置自动更新器
function configureUpdater() {
  // 仅在打包后的应用中启用更新检查
  if (!app.isPackaged) {
    console.log('[update-service] 开发环境，跳过更新检查');
    return false;
  }

  // 配置更新器
  autoUpdater.autoDownload = false; // 不自动下载，等待用户确认
  autoUpdater.autoInstallOnAppQuit = false; // 不自动安装

  // 监听更新检查事件
  autoUpdater.on('checking-for-update', () => {
    console.log('[update-service] 正在检查更新...');
    updateStatus.checking = true;
    updateStatus.error = null;
    notifyStatusChange();
  });

  // 监听更新可用事件
  autoUpdater.on('update-available', (info) => {
    console.log('[update-service] 发现新版本:', info.version);
    updateStatus.checking = false;
    updateStatus.available = true;
    updateStatus.latestVersion = info.version;
    updateStatus.releaseNotes = info.releaseNotes || '暂无更新日志';
    notifyStatusChange();
  });

  // 监听更新不可用事件
  autoUpdater.on('update-not-available', (info) => {
    console.log('[update-service] 当前已是最新版本:', info.version);
    updateStatus.checking = false;
    updateStatus.available = false;
    updateStatus.latestVersion = info.version;
    notifyStatusChange();
  });

  // 监听下载进度事件
  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    updateStatus.progress = percent;
    updateStatus.downloading = true;
    notifyStatusChange();
  });

  // 监听更新下载完成事件
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[update-service] 更新下载完成:', info.version);
    updateStatus.downloading = false;
    updateStatus.downloaded = true;
    updateStatus.latestVersion = info.version;
    notifyStatusChange();
  });

  // 监听错误事件
  autoUpdater.on('error', (error) => {
    console.error('[update-service] 更新错误:', error);
    updateStatus.checking = false;
    updateStatus.downloading = false;
    updateStatus.error = error.message || '更新检查失败';
    notifyStatusChange();
  });

  return true;
}

// 检查更新
async function checkForUpdates() {
  if (!app.isPackaged) {
    console.log('[update-service] 开发环境，跳过更新检查');
    return { error: '开发环境不支持更新检查' };
  }

  try {
    updateStatus.error = null;
    await autoUpdater.checkForUpdates();
    return { success: true };
  } catch (error) {
    console.error('[update-service] 检查更新失败:', error);
    updateStatus.error = error.message || '检查更新失败';
    notifyStatusChange();
    return { error: error.message || '检查更新失败' };
  }
}

// 下载更新
async function downloadUpdate() {
  if (!app.isPackaged) {
    return { error: '开发环境不支持下载更新' };
  }

  if (!updateStatus.available) {
    return { error: '没有可用的更新' };
  }

  try {
    updateStatus.error = null;
    updateStatus.downloading = true;
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error('[update-service] 下载更新失败:', error);
    updateStatus.downloading = false;
    updateStatus.error = error.message || '下载更新失败';
    notifyStatusChange();
    return { error: error.message || '下载更新失败' };
  }
}

// 安装更新并退出应用
function quitAndInstall() {
  if (!app.isPackaged) {
    return { error: '开发环境不支持安装更新' };
  }

  if (!updateStatus.downloaded) {
    return { error: '更新尚未下载完成' };
  }

  try {
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  } catch (error) {
    console.error('[update-service] 安装更新失败:', error);
    return { error: error.message || '安装更新失败' };
  }
}

// 获取当前状态
function getStatus() {
  return { ...updateStatus };
}

// 初始化
const isConfigured = configureUpdater();

module.exports = {
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  getStatus,
  onStatusChange,
  isConfigured
};

