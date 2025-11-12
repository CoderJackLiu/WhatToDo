const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 分组管理
  loadGroups: () => ipcRenderer.invoke('load-groups'),
  saveGroups: (data) => ipcRenderer.invoke('save-groups', data),
  openGroup: (groupId, groupName) => ipcRenderer.send('open-group', { groupId, groupName }),
  notifyGroupsChanged: () => ipcRenderer.send('groups-changed'),
  onGroupsChanged: (callback) => ipcRenderer.on('groups-changed', () => callback()),
  
  // 接收分组信息（用于分组详情窗口）
  onGroupInfo: (callback) => ipcRenderer.on('group-info', (event, data) => callback(data)),
  
  // 窗口控制
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  toggleAlwaysOnTop: () => ipcRenderer.send('toggle-always-on-top'),
  onAlwaysOnTopChanged: (callback) => ipcRenderer.on('always-on-top-changed', (event, isOnTop) => callback(isOnTop)),
  
  // 窗口焦点状态
  onWindowFocus: (callback) => ipcRenderer.on('window-focus', () => callback()),
  onWindowBlur: (callback) => ipcRenderer.on('window-blur', () => callback()),
  
  // 获取用户数据路径
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  
  // 设置管理
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  setAutoStart: (enabled) => ipcRenderer.invoke('set-auto-start', enabled),
  getThemeMode: () => ipcRenderer.invoke('get-theme-mode'),
  notifyThemeChanged: () => ipcRenderer.send('theme-changed'),
  onThemeChanged: (callback) => ipcRenderer.on('theme-changed', () => callback())
});

