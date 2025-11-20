// 多语言支持
const i18n = {
  // 当前语言
  currentLang: 'zh-CN',
  
  // 翻译文本
  translations: {
    'zh-CN': {
      // 通用
      'settings': '设置',
      'minimize': '最小化',
      'close': '关闭',
      'loading': '加载中...',
      'unknown': '未知',
      'failed': '加载失败',
      'confirm': '确定',
      'cancel': '取消',
      
      // 设置菜单
      'settings.title': '设置',
      'settings.themeMode': '主题模式',
      'settings.themeLight': '浅色',
      'settings.themeDark': '深色',
      'settings.autoStart': '随系统启动',
      'settings.autoStartDesc': '应用将在系统启动时自动运行',
      'settings.language': '语言',
      'settings.languageDesc': '选择界面显示语言',
      'settings.logout': '退出登录',
      
      // 分组页面
      'groups.title': 'TodoList',
      'groups.newGroup': '新建分组',
      'groups.count': '个分组',
      'groups.empty': '暂无分组',
      'groups.emptyDesc': '创建一个分组开始管理待办事项！',
      'groups.deleteConfirm': '确定要删除这个分组吗？分组内的所有待办事项也会被删除。',
      'groups.deleteFailed': '删除分组失败：',
      'groups.createFailed': '创建分组失败：',
      'groups.noTodos': '暂无待办事项',
      'groups.moreItems': '还有',
      'groups.item': '项',
      'groups.deleteGroup': '删除分组',
      
      // 待办事项
      'todos.addPlaceholder': '添加新的待办事项...',
      'todos.count': '个待办事项',
      'todos.clearCompleted': '清除已完成',
      'todos.empty': '暂无待办事项',
      'todos.emptyDesc': '添加一个开始吧！',
      'todos.addFailed': '添加待办失败：',
      'todos.deleteFailed': '删除待办失败：',
      'todos.clearFailed': '清除失败：',
      'todos.clearConfirm': '确定要删除 {count} 个已完成的待办事项吗？',
      
      // 登录页面
      'login.title': '📝 TodoList',
      'login.subtitle': '登录以同步您的数据',
      'login.email': '邮箱地址',
      'login.password': '密码',
      'login.passwordMin': '密码（至少6位）',
      'login.passwordConfirm': '确认密码',
      'login.login': '登录',
      'login.logging': '登录中...',
      'login.register': '注册',
      'login.registering': '注册中...',
      'login.noAccount': '还没有账号？',
      'login.hasAccount': '已有账号？',
      'login.registerNow': '立即注册',
      'login.loginNow': '立即登录',
      'login.or': '或',
      'login.github': '使用 GitHub 登录',
      'login.emailNotConfirmed': '您的邮箱尚未确认',
      'login.checkEmail': '请检查您的邮箱（包括<strong>垃圾邮件/垃圾箱</strong>文件夹）并点击确认链接。',
      'login.qqEmailTip': '⚠️ QQ 邮箱用户请注意：邮件可能被标记为垃圾邮件，请务必检查"垃圾箱"文件夹！',
      'login.noEmail': '没有收到邮件？',
      'login.resendEmail': '重新发送确认邮件',
      'login.sessionExpired': '您的登录已过期',
      'login.sessionExpiredDesc': '为了您的账户安全，登录状态已过期（10天），请重新登录。',
      
      // 分组详情页面
      'detail.title': 'TodoList',
      'detail.openMain': '打开主界面',
      'detail.moreOptions': '更多选项',
      'detail.pinWindow': '置顶窗口',
      'detail.selectTheme': '选择颜色风格',
      'detail.themeDefault': '默认',
      'detail.themeBlue': '蓝色',
      'detail.themeGreen': '绿色',
      'detail.themePurple': '紫色',
      'detail.themeGray': '灰色',
      'detail.themePink': '粉色',
      
      // 消息提示
      'message.confirm': '确认',
      'message.error': '错误',
      'message.warning': '警告',
      'message.info': '提示',
      'message.success': '成功',
      'message.logoutConfirm': '确定要退出登录吗？',
      'message.logoutFailed': '退出登录失败：',
      'message.unknownError': '未知错误',
      
      // 时间格式化
      'time.justNow': '刚刚',
      'time.minutesAgo': '分钟前',
      'time.hoursAgo': '小时前',
      'time.monthDay': '月',
      'time.day': '日'
    },
    
    'en-US': {
      // Common
      'settings': 'Settings',
      'minimize': 'Minimize',
      'close': 'Close',
      'loading': 'Loading...',
      'unknown': 'Unknown',
      'failed': 'Failed to load',
      'confirm': 'Confirm',
      'cancel': 'Cancel',
      
      // Settings menu
      'settings.title': 'Settings',
      'settings.themeMode': 'Theme Mode',
      'settings.themeLight': 'Light',
      'settings.themeDark': 'Dark',
      'settings.autoStart': 'Start with System',
      'settings.autoStartDesc': 'Application will automatically run when system starts',
      'settings.language': 'Language',
      'settings.languageDesc': 'Select interface display language',
      'settings.logout': 'Logout',
      
      // Groups page
      'groups.title': 'TodoList',
      'groups.newGroup': 'New Group',
      'groups.count': ' groups',
      'groups.empty': 'No groups',
      'groups.emptyDesc': 'Create a group to start managing todos!',
      'groups.deleteConfirm': 'Are you sure you want to delete this group? All todos in this group will also be deleted.',
      'groups.deleteFailed': 'Failed to delete group: ',
      'groups.createFailed': 'Failed to create group: ',
      'groups.noTodos': 'No todos',
      'groups.moreItems': 'more',
      'groups.item': ' items',
      'groups.deleteGroup': 'Delete Group',
      
      // Todos
      'todos.addPlaceholder': 'Add a new todo...',
      'todos.count': ' todos',
      'todos.clearCompleted': 'Clear Completed',
      'todos.empty': 'No todos',
      'todos.emptyDesc': 'Add one to get started!',
      'todos.addFailed': 'Failed to add todo: ',
      'todos.deleteFailed': 'Failed to delete todo: ',
      'todos.clearFailed': 'Failed to clear: ',
      'todos.clearConfirm': 'Are you sure you want to delete {count} completed todos?',
      
      // Login page
      'login.title': '📝 TodoList',
      'login.subtitle': 'Sign in to sync your data',
      'login.email': 'Email address',
      'login.password': 'Password',
      'login.passwordMin': 'Password (at least 6 characters)',
      'login.passwordConfirm': 'Confirm password',
      'login.login': 'Sign In',
      'login.logging': 'Signing in...',
      'login.register': 'Sign Up',
      'login.registering': 'Signing up...',
      'login.noAccount': "Don't have an account?",
      'login.hasAccount': 'Already have an account?',
      'login.registerNow': 'Sign up now',
      'login.loginNow': 'Sign in now',
      'login.or': 'or',
      'login.github': 'Sign in with GitHub',
      'login.emailNotConfirmed': 'Your email has not been confirmed',
      'login.checkEmail': 'Please check your email (including <strong>spam/junk</strong> folder) and click the confirmation link.',
      'login.qqEmailTip': '⚠️ QQ Email users: Emails may be marked as spam, please check the "Junk" folder!',
      'login.noEmail': "Didn't receive the email?",
      'login.resendEmail': 'Resend confirmation email',
      'login.sessionExpired': 'Your session has expired',
      'login.sessionExpiredDesc': 'For your account security, your login session has expired (10 days), please log in again.',
      
      // Group detail page
      'detail.title': 'TodoList',
      'detail.openMain': 'Open Main Window',
      'detail.moreOptions': 'More Options',
      'detail.pinWindow': 'Pin Window',
      'detail.selectTheme': 'Select Color Theme',
      'detail.themeDefault': 'Default',
      'detail.themeBlue': 'Blue',
      'detail.themeGreen': 'Green',
      'detail.themePurple': 'Purple',
      'detail.themeGray': 'Gray',
      'detail.themePink': 'Pink',
      
      // Messages
      'message.confirm': 'Confirm',
      'message.error': 'Error',
      'message.warning': 'Warning',
      'message.info': 'Information',
      'message.success': 'Success',
      'message.logoutConfirm': 'Are you sure you want to logout?',
      'message.logoutFailed': 'Logout failed: ',
      'message.unknownError': 'Unknown error',
      
      // Time formatting
      'time.justNow': 'Just now',
      'time.minutesAgo': ' minutes ago',
      'time.hoursAgo': ' hours ago',
      'time.monthDay': '',
      'time.day': ''
    }
  },
  
  // 初始化
  init(lang) {
    this.currentLang = lang || 'zh-CN';
    // 更新 HTML lang 属性
    document.documentElement.lang = this.currentLang;
  },
  
  // 获取翻译文本
  t(key) {
    const translation = this.translations[this.currentLang];
    if (!translation) {
      console.warn(`Translation not found for language: ${this.currentLang}`);
      return key;
    }
    
    const value = translation[key];
    if (value === undefined) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    
    return value;
  },
  
  // 设置语言
  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLang = lang;
      document.documentElement.lang = lang;
      return true;
    }
    return false;
  },
  
  // 获取当前语言
  getLanguage() {
    return this.currentLang;
  },
  
  // 格式化时间（支持多语言）
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) {
      return this.t('time.justNow');
    }
    
    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return minutes + this.t('time.minutesAgo');
    }
    
    // Less than 1 day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return hours + this.t('time.hoursAgo');
    }
    
    // Show date
    const month = date.getMonth() + 1;
    const day = date.getDate();
    if (this.currentLang === 'zh-CN') {
      return `${month}${this.t('time.monthDay')}${day}${this.t('time.day')}`;
    } else {
      return `${month}/${day}`;
    }
  }
};

// 如果在浏览器环境中，将 i18n 挂载到 window
if (typeof window !== 'undefined') {
  window.i18n = i18n;
}

// 如果在 Node.js 环境中，导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = i18n;
}

