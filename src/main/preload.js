const { contextBridge, ipcRenderer } = require('electron');

// 日志开关（从环境变量获取，与主进程保持一致）
const DEBUG_MODE = process.env.DEBUG === 'true' || false;

// 拦截 console 并转发到主进程（仅在 DEBUG_MODE 开启时）
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
  originalLog.apply(console, args);
  if (DEBUG_MODE) {
    ipcRenderer.send('renderer-log', 'log', args.join(' '));
  }
};

console.error = function(...args) {
  originalError.apply(console, args);
  // 错误始终转发
  ipcRenderer.send('renderer-log', 'error', args.join(' '));
};

console.warn = function(...args) {
  originalWarn.apply(console, args);
  // 警告始终转发
  ipcRenderer.send('renderer-log', 'warn', args.join(' '));
};

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
    },
    onSessionExpired: (callback) => {
      ipcRenderer.on('session-expired', (event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('session-expired');
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
      // 向主进程发送订阅请求
      ipcRenderer.send('subscribe-todos', groupId);
      // 监听待办变化消息
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
      // 返回取消订阅函数
      return () => {
        ipcRenderer.removeAllListeners(channel);
        // 注意：这里不发送取消订阅消息，因为主进程会管理订阅
      };
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
  showMainWindow: () => ipcRenderer.send('show-main-window'),
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
  onThemeChanged: (callback) => ipcRenderer.on('theme-changed', () => callback()),
  notifyLanguageChanged: (lang) => ipcRenderer.send('language-changed', lang),
  onLanguageChanged: (callback) => ipcRenderer.on('language-changed', (event, lang) => callback(lang)),
  
  // ========== 凭据管理 ==========
  credentials: {
    save: (email, password) => ipcRenderer.invoke('save-credentials', email, password),
    get: () => ipcRenderer.invoke('get-credentials'),
    clear: () => ipcRenderer.invoke('clear-credentials'),
    has: () => ipcRenderer.invoke('has-credentials')
  },
  
  // ========== 更新管理 ==========
  update: {
    check: () => ipcRenderer.invoke('update-check'),
    download: () => ipcRenderer.invoke('update-download'),
    install: () => ipcRenderer.invoke('update-install'),
    getStatus: () => ipcRenderer.invoke('update-get-status'),
    onStatusChange: (callback) => {
      ipcRenderer.on('update-status-changed', (event, status) => callback(status));
      return () => ipcRenderer.removeAllListeners('update-status-changed');
    }
  }
  
});

