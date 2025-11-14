const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // ========== 认证 API ==========
  auth: {
    signUp: (email, password) => ipcRenderer.invoke('auth-sign-up', email, password),
    signIn: (email, password) => ipcRenderer.invoke('auth-sign-in', email, password),
    resendConfirmation: (email) => ipcRenderer.invoke('auth-resend-confirmation', email),
    signInWithGitHub: () => ipcRenderer.invoke('auth-sign-in-github'),
    signOut: () => ipcRenderer.invoke('auth-sign-out'),
    getCurrentUser: () => ipcRenderer.invoke('auth-get-current-user'),
    getSession: () => ipcRenderer.invoke('auth-get-session'),
    onAuthStateChange: (callback) => {
      ipcRenderer.on('auth-state-changed', (event, ...args) => callback(...args));
      return () => ipcRenderer.removeAllListeners('auth-state-changed');
    },
    handleOAuthCallback: (url) => ipcRenderer.invoke('auth-handle-oauth-callback', url),
    onOAuthCallback: (callback) => {
      ipcRenderer.on('oauth-callback', (event, url) => callback(url));
      return () => ipcRenderer.removeAllListeners('oauth-callback');
    }
  },

  // ========== 数据操作 API ==========
  data: {
    // 分组操作
    loadGroups: () => ipcRenderer.invoke('data-load-groups'),
    createGroup: (name, theme) => ipcRenderer.invoke('data-create-group', name, theme),
    updateGroup: (id, updates) => ipcRenderer.invoke('data-update-group', id, updates),
    deleteGroup: (id) => ipcRenderer.invoke('data-delete-group', id),
    reorderGroups: (groupIds) => ipcRenderer.invoke('data-reorder-groups', groupIds),
    
    // 待办操作
    loadTodos: (groupId) => ipcRenderer.invoke('data-load-todos', groupId),
    createTodo: (groupId, text) => ipcRenderer.invoke('data-create-todo', groupId, text),
    updateTodo: (id, updates) => ipcRenderer.invoke('data-update-todo', id, updates),
    deleteTodo: (id) => ipcRenderer.invoke('data-delete-todo', id),
    deleteTodos: (ids) => ipcRenderer.invoke('data-delete-todos', ids),
    reorderTodos: (groupId, todoIds) => ipcRenderer.invoke('data-reorder-todos', groupId, todoIds),
    
    // 实时订阅
    subscribeToGroups: (callback) => {
      ipcRenderer.on('data-groups-changed', (event, ...args) => callback(...args));
      return () => ipcRenderer.removeAllListeners('data-groups-changed');
    },
    subscribeToTodos: (groupId, callback) => {
      const channel = `data-todos-changed-${groupId}`;
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
      return () => ipcRenderer.removeAllListeners(channel);
    }
  },

  // ========== 窗口控制 ==========
  openGroup: (groupId, groupName) => ipcRenderer.send('open-group', { groupId, groupName }),
  notifyGroupsChanged: () => ipcRenderer.send('groups-changed'),
  onGroupsChanged: (callback) => ipcRenderer.on('groups-changed', () => callback()),
  
  // 接收分组信息（用于分组详情窗口）
  onGroupInfo: (callback) => ipcRenderer.on('group-info', (event, data) => callback(data)),
  
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  toggleAlwaysOnTop: () => ipcRenderer.send('toggle-always-on-top'),
  onAlwaysOnTopChanged: (callback) => ipcRenderer.on('always-on-top-changed', (event, isOnTop) => callback(isOnTop)),
  
  // 窗口焦点状态
  onWindowFocus: (callback) => ipcRenderer.on('window-focus', () => callback()),
  onWindowBlur: (callback) => ipcRenderer.on('window-blur', () => callback()),
  
  // ========== 设置管理（保留本地设置） ==========
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  setAutoStart: (enabled) => ipcRenderer.invoke('set-auto-start', enabled),
  getThemeMode: () => ipcRenderer.invoke('get-theme-mode'),
  notifyThemeChanged: () => ipcRenderer.send('theme-changed'),
  onThemeChanged: (callback) => ipcRenderer.on('theme-changed', () => callback())
});

