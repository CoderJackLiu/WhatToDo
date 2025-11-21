// DOM 元素
const addGroupBtn = document.getElementById('add-group-btn');
const groupList = document.getElementById('group-list');
const groupCount = document.getElementById('group-count');
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsMenu = document.getElementById('settings-menu');
const autoStartToggle = document.getElementById('auto-start-toggle');
const themeLightBtn = document.getElementById('theme-light-btn');
const themeDarkBtn = document.getElementById('theme-dark-btn');
const logoutBtn = document.getElementById('logout-btn');
const userEmail = document.getElementById('user-email');
const langZhBtn = document.getElementById('lang-zh-btn');
const langEnBtn = document.getElementById('lang-en-btn');

// 状态
let groups = [];
let previousGroups = []; // 保存上一次的分组数据，用于增量更新
let isLoading = false;
let groupsSubscription = null;

// 初始化应用
async function init() {
  // 初始化多语言
  await initLanguage();
  
  await loadUserInfo();
  await loadGroups();
  await loadSettings();
  bindEvents();
  renderGroups();
  
  // 如果没有设置主题，默认使用亮色主题
  if (!document.body.classList.contains('dark-theme') && !document.body.classList.contains('light-theme')) {
    document.body.classList.add('light-theme');
  }
  
  // 订阅分组数据变化（实时同步）
  subscribeToGroups();
  
  // 监听认证状态变化
  window.electronAPI.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      // 登出后跳转到登录页面
      window.location.href = 'login.html';
    }
  });
  
  // 监听更新状态变化
  subscribeToUpdates();
}

// 初始化语言
async function initLanguage() {
  try {
    const settings = await window.electronAPI.loadSettings();
    const lang = settings?.language || 'zh-CN';
    i18n.init(lang);
    updateUI();
  } catch (error) {
    console.error('初始化语言失败:', error);
    i18n.init('zh-CN');
    updateUI();
  }
}

// 更新界面文本
function updateUI() {
  // 更新所有带有 data-i18n 属性的元素
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = i18n.t(key);
  });
  
  // 更新所有带有 data-i18n-title 属性的元素的 title
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = i18n.t(key);
  });
  
  // 更新用户信息
  if (userEmail.textContent === '加载中...') {
    userEmail.textContent = i18n.t('loading');
  } else if (userEmail.textContent === '未登录') {
    userEmail.textContent = i18n.t('unknown');
  } else if (userEmail.textContent === '加载失败') {
    userEmail.textContent = i18n.t('failed');
  }
  
  // 更新计数
  updateCount();
  
  // 更新空状态
  updateEmptyState();
}

// 更新空状态文本
function updateEmptyState() {
  const emptyState = groupList.querySelector('.empty-state');
  if (emptyState) {
    const icon = emptyState.querySelector('.empty-state-icon');
    const text = emptyState.querySelector('.empty-state-text');
    if (icon && text) {
      text.innerHTML = `${i18n.t('groups.empty')}<br>${i18n.t('groups.emptyDesc')}`;
    }
  }
}

// 加载用户信息
async function loadUserInfo() {
  try {
    const result = await window.electronAPI.auth.getCurrentUser();
    if (result.success && result.user) {
      const email = result.user.email || result.user.user_metadata?.email || i18n.t('unknown');
      userEmail.textContent = email;
    } else {
      userEmail.textContent = i18n.t('unknown');
    }
  } catch (error) {
    console.error('加载用户信息失败:', error);
    userEmail.textContent = i18n.t('failed');
  }
}

// 加载分组数据（从云端）- 包含待办事项预览
async function loadGroups() {
  if (isLoading) return;
  
  isLoading = true;
  try {
    const result = await window.electronAPI.data.loadGroups();
    if (result.success) {
      // 转换数据格式：将云端数据转换为本地格式
      groups = await Promise.all(result.data.map(async (g) => {
        // 加载每个分组的待办事项（用于预览）
        let todos = [];
        try {
          const todosResult = await window.electronAPI.data.loadTodos(g.id);
          if (todosResult.success) {
            todos = todosResult.data.map(t => ({
              id: t.id,
              text: t.text,
              completed: t.completed,
              createdAt: new Date(t.created_at).getTime(),
              updatedAt: new Date(t.updated_at).getTime()
            }));
          }
        } catch (error) {
          console.error(`加载分组 ${g.id} 的待办失败:`, error);
        }
        
        return {
          id: g.id,
          name: g.name || '',
          theme: g.theme || 'default',
          todos: todos, // 包含待办事项用于预览
          createdAt: new Date(g.created_at).getTime(),
          updatedAt: new Date(g.updated_at).getTime()
        };
      }));
    } else {
      console.error('加载分组失败:', result.error);
      groups = [];
    }
  } catch (error) {
    console.error('加载分组失败:', error);
    groups = [];
  } finally {
    isLoading = false;
  }
}

// 订阅分组变化（实时同步）- 优化：减少不必要的重新加载
function subscribeToGroups() {
  if (groupsSubscription) {
    return; // 已经订阅
  }
  
  groupsSubscription = window.electronAPI.data.subscribeToGroups((payload) => {
    // 实时更新已由 data-service 处理缓存同步
    // 这里只需刷新UI（从已更新的缓存读取）
    
    // 如果是UPDATE事件且主题字段变化，直接更新DOM元素以确保颜色立即同步
    if (payload.eventType === 'UPDATE' && payload.new && payload.new.theme !== undefined) {
      const groupId = payload.new.id;
      const newTheme = payload.new.theme || 'default';
      
      console.log('[groups] 检测到主题更新:', { groupId, newTheme });
      
      // 直接更新对应的DOM元素（立即生效）
      const groupItem = document.querySelector(`[data-group-id="${groupId}"]`);
      if (groupItem) {
        const themeColor = themeColors[newTheme] || themeColors.default;
        groupItem.style.borderTopColor = themeColor.border;
        console.log('[groups] 已更新DOM元素主题颜色:', themeColor.border);
      } else {
        console.warn('[groups] 未找到对应的分组项:', groupId);
      }
      
      // 然后刷新数据并更新UI（确保数据同步）
      loadGroups().then(() => {
        // 刷新后再次确保主题颜色正确（因为updateGroups会总是更新主题颜色）
        updateGroups();
        console.log('[groups] 分组列表已刷新');
      });
    } else {
      // 其他变化，正常刷新
      loadGroups().then(() => updateGroups());
    }
  });
}

// 绑定事件
function bindEvents() {
  // 添加分组
  addGroupBtn.addEventListener('click', addGroup);
  
  // 设置按钮
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSettingsMenu();
  });
  
  // 主题模式切换
  themeLightBtn.addEventListener('click', () => {
    selectThemeMode('light');
  });
  
  themeDarkBtn.addEventListener('click', () => {
    selectThemeMode('dark');
  });
  
  // 语言切换
  langZhBtn.addEventListener('click', () => {
    selectLanguage('zh-CN');
  });
  
  langEnBtn.addEventListener('click', () => {
    selectLanguage('en-US');
  });
  
  // 开机自启动开关
  autoStartToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await window.electronAPI.setAutoStart(enabled);
  });
  
  // 退出登录
  logoutBtn.addEventListener('click', async () => {
    const confirmed = await showConfirm(i18n.t('message.logoutConfirm'), {
      title: i18n.t('message.confirm') || '确认',
      type: 'warning'
    });
    if (confirmed) {
      try {
        const result = await window.electronAPI.auth.signOut();
        if (result.success) {
          window.location.href = 'login.html';
        } else {
          await showAlert(i18n.t('message.logoutFailed') + (result.error || i18n.t('message.unknownError')), {
            title: i18n.t('message.error') || '错误',
            type: 'error'
          });
        }
      } catch (error) {
        console.error('退出登录失败:', error);
        await showAlert(i18n.t('message.logoutFailed') + error.message, {
          title: i18n.t('message.error') || '错误',
          type: 'error'
        });
      }
    }
  });
  
  // 点击外部关闭设置菜单
  document.addEventListener('click', (e) => {
    if (!settingsMenu.contains(e.target) && !settingsBtn.contains(e.target)) {
      hideSettingsMenu();
    }
  });
  
  // 窗口控制
  minimizeBtn.addEventListener('click', () => {
    window.electronAPI.minimizeWindow();
  });
  
  closeBtn.addEventListener('click', () => {
    window.electronAPI.closeWindow();
  });
  
  // 窗口获得焦点时刷新分组列表，确保主题颜色同步
  window.addEventListener('focus', () => {
    // 延迟一点，避免频繁刷新
    setTimeout(() => {
      loadGroups().then(() => updateGroups());
    }, 100);
  });
}

// 生成唯一 ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 选择语言
async function selectLanguage(lang) {
  if (i18n.setLanguage(lang)) {
    // 更新语言按钮状态
    if (lang === 'zh-CN') {
      langZhBtn.classList.add('active');
      langEnBtn.classList.remove('active');
    } else {
      langEnBtn.classList.add('active');
      langZhBtn.classList.remove('active');
    }
    
    // 更新界面文本
    updateUI();
    
    // 保存设置
    try {
      const currentSettings = await window.electronAPI.loadSettings() || {};
      currentSettings.language = lang;
      await window.electronAPI.saveSettings(currentSettings);
      
      // 通知所有打开的分组窗口语言已变化
      window.electronAPI.notifyLanguageChanged(lang);
    } catch (error) {
      console.error('保存语言设置失败:', error);
    }
  }
}

// 添加分组（云端）- 优化：乐观更新，立即响应
async function addGroup() {
  try {
    // 乐观更新：data-service 会立即更新缓存
    const result = await window.electronAPI.data.createGroup('', 'default');
    if (result.success) {
      // 从缓存重新加载分组列表
      await loadGroups();
      updateGroups();
      
      // 自动打开新创建的分组
      openGroup(result.data.id, '');
    } else {
      await showAlert(i18n.t('groups.createFailed') + (result.error || i18n.t('message.unknownError')), {
        title: i18n.t('message.error') || '错误',
        type: 'error'
      });
      // 失败后重新加载（回滚）
      await loadGroups();
      updateGroups();
    }
  } catch (error) {
    console.error('创建分组失败:', error);
    await showAlert(i18n.t('groups.createFailed') + error.message, {
      title: i18n.t('message.error') || '错误',
      type: 'error'
    });
    await loadGroups();
    updateGroups();
  }
}

// 删除分组（云端）
async function deleteGroup(id) {
  const confirmed = await showConfirm(i18n.t('groups.deleteConfirm'), {
    title: i18n.t('message.confirm') || '确认',
    type: 'warning'
  });
  if (!confirmed) {
    return;
  }
  
  const item = document.querySelector(`[data-group-id="${id}"]`);
  if (item) {
    item.classList.add('removing');
  }
  
  try {
    const result = await window.electronAPI.data.deleteGroup(id);
    if (result.success) {
      // 重新加载分组列表
      await loadGroups();
      updateGroups();
    } else {
      await showAlert(i18n.t('groups.deleteFailed') + (result.error || i18n.t('message.unknownError')), {
        title: i18n.t('message.error') || '错误',
        type: 'error'
      });
      if (item) {
        item.classList.remove('removing');
      }
    }
  } catch (error) {
    console.error('删除分组失败:', error);
    await showAlert(i18n.t('groups.deleteFailed') + error.message, {
      title: i18n.t('message.error') || '错误',
      type: 'error'
    });
    if (item) {
      item.classList.remove('removing');
    }
  }
}

// 打开分组
function openGroup(id, name) {
  // 不再显示分组名称，但保留数据结构中的name字段
  window.electronAPI.openGroup(id, '');
}


// 生成任务缩略内容（最多5行）
function getGroupPreviewText(todos) {
  if (!todos || todos.length === 0) {
    return i18n.t('groups.noTodos');
  }
  
  const maxLines = 5;
  const previewTodos = todos.slice(0, maxLines);
  const hasMore = todos.length > maxLines;
  
  let previewText = previewTodos.map((todo) => {
    const prefix = todo.completed ? '✓' : '○';
    // 每行最多显示45个字符
    const maxLength = 45;
    let text = todo.text;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }
    return `${prefix} ${text}`;
  }).join('\n');
  
  if (hasMore) {
    const moreCount = todos.length - maxLines;
    previewText += `\n...${i18n.t('groups.moreItems')} ${moreCount}${i18n.t('groups.item')}`;
  }
  
  return previewText;
}

// 主题颜色映射（用于主界面显示）
const themeColors = {
  default: { border: '#e8dcc3' },
  blue: { border: '#b8d4e0' },
  green: { border: '#b8d4ba' },
  purple: { border: '#d4b8d4' },
  gray: { border: '#d0d0d0' },
  pink: { border: '#e8b8d0' }
};

// 创建单个分组项
function createGroupItem(group) {
  const li = document.createElement('li');
  li.className = 'todo-item group-item';
  li.setAttribute('data-group-id', group.id);
  
  // 应用分组的主题颜色边框
  const theme = group.theme || 'default';
  const themeColor = themeColors[theme] || themeColors.default;
  li.style.borderTopColor = themeColor.border;
  
  // 分组内容预览（显示待办事项预览）
  const content = document.createElement('div');
  content.className = 'group-content';
  const previewText = getGroupPreviewText(group.todos || []);
  content.textContent = previewText;
  
  // 右侧内容容器
  const rightContent = document.createElement('div');
  rightContent.className = 'group-right-content';
  
  // 待办数量徽章（显示实际数量）
  const count = document.createElement('span');
  count.className = 'group-count-badge';
  const todosCount = (group.todos || []).length;
  const activeCount = (group.todos || []).filter(t => !t.completed).length;
  if (todosCount === 0) {
    count.textContent = '0';
  } else if (activeCount === todosCount) {
    count.textContent = `${todosCount}`;
  } else {
    count.textContent = `${activeCount}/${todosCount}`;
  }
  
  // 删除按钮（悬停时显示）
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = '×';
  deleteBtn.title = i18n.t('groups.deleteGroup');
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteGroup(group.id);
  });
  
  rightContent.appendChild(count);
  rightContent.appendChild(deleteBtn);
  
  li.appendChild(content);
  li.appendChild(rightContent);
  
  // 点击打开分组
  li.addEventListener('click', () => {
    openGroup(group.id, '');
  });
  
  // 拖动排序
  li.setAttribute('draggable', 'true');
  li.addEventListener('dragstart', handleDragStart);
  li.addEventListener('dragover', handleDragOver);
  li.addEventListener('drop', handleDrop);
  li.addEventListener('dragend', handleDragEnd);
  
  return li;
}

// 更新单个分组项的内容
function updateGroupItem(li, group) {
  // 更新主题颜色边框
  const theme = group.theme || 'default';
  const themeColor = themeColors[theme] || themeColors.default;
  li.style.borderTopColor = themeColor.border;
  
  // 更新待办事项预览
  const content = li.querySelector('.group-content');
  if (content) {
    const previewText = getGroupPreviewText(group.todos || []);
    content.textContent = previewText;
  }
  
  // 更新待办数量徽章
  const count = li.querySelector('.group-count-badge');
  if (count) {
    const todosCount = (group.todos || []).length;
    const activeCount = (group.todos || []).filter(t => !t.completed).length;
    if (todosCount === 0) {
      count.textContent = '0';
    } else if (activeCount === todosCount) {
      count.textContent = `${todosCount}`;
    } else {
      count.textContent = `${activeCount}/${todosCount}`;
    }
  }
}

// 检查分组是否有变化
function hasGroupChanged(oldGroup, newGroup) {
  if (!oldGroup) return true;
  
  // 检查主题是否变化
  if ((oldGroup.theme || 'default') !== (newGroup.theme || 'default')) {
    return true;
  }
  
  // 检查 ID 是否变化（分组被删除或新增）
  if (oldGroup.id !== newGroup.id) {
    return true;
  }
  
  // 检查待办事项数量是否变化
  const oldTodosCount = (oldGroup.todos || []).length;
  const newTodosCount = (newGroup.todos || []).length;
  if (oldTodosCount !== newTodosCount) {
    return true;
  }
  
  // 检查待办事项内容是否变化（简单比较：比较前5项的文本）
  const oldTodos = (oldGroup.todos || []).slice(0, 5).map(t => t.text).join('|');
  const newTodos = (newGroup.todos || []).slice(0, 5).map(t => t.text).join('|');
  if (oldTodos !== newTodos) {
    return true;
  }
  
  return false;
}

// 增量更新分组列表
function updateGroups() {
  // 如果没有分组，显示空状态
  if (groups.length === 0) {
    groupList.innerHTML = '';
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <div class="empty-state-icon">📁</div>
      <div class="empty-state-text">${i18n.t('groups.empty')}<br>${i18n.t('groups.emptyDesc')}</div>
    `;
    groupList.appendChild(emptyState);
    previousGroups = [];
    updateCount();
    return;
  }
  
  // 移除空状态
  const emptyState = groupList.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }
  
  // 获取现有的分组项
  const existingItems = Array.from(groupList.querySelectorAll('.group-item'));
  const existingIds = new Set(existingItems.map(item => item.getAttribute('data-group-id')));
  const newIds = new Set(groups.map(g => g.id));
  
  // 创建分组ID到元素的映射
  const itemMap = new Map();
  existingItems.forEach(item => {
    const id = item.getAttribute('data-group-id');
    itemMap.set(id, item);
  });
  
  // 创建分组ID到数据的映射
  const oldGroupMap = new Map();
  previousGroups.forEach(g => oldGroupMap.set(g.id, g));
  
  // 处理每个分组
  groups.forEach((group, index) => {
    const existingItem = itemMap.get(group.id);
    const oldGroup = oldGroupMap.get(group.id);
    
    if (existingItem) {
      // 分组已存在，检查是否需要更新
      // 特别检查主题是否变化，确保主题颜色能及时更新
      const themeChanged = oldGroup && (oldGroup.theme || 'default') !== (group.theme || 'default');
      
      // 总是更新主题颜色，确保颜色同步（即使其他数据没变化）
      const currentTheme = group.theme || 'default';
      const themeColor = themeColors[currentTheme] || themeColors.default;
      // 直接更新主题颜色，不比较（因为DOM中的颜色格式可能不同）
      existingItem.style.borderTopColor = themeColor.border;
      
      // 检查其他变化
      if (hasGroupChanged(oldGroup, group) || themeChanged) {
        updateGroupItem(existingItem, group);
      }
      
      // 确保顺序正确
      const currentIndex = Array.from(groupList.children).indexOf(existingItem);
      if (currentIndex !== index) {
        const nextSibling = groupList.children[index];
        if (nextSibling) {
          groupList.insertBefore(existingItem, nextSibling);
        } else {
          groupList.appendChild(existingItem);
        }
      }
    } else {
      // 新分组，创建新元素
      const newItem = createGroupItem(group);
      const nextSibling = groupList.children[index];
      if (nextSibling) {
        groupList.insertBefore(newItem, nextSibling);
      } else {
        groupList.appendChild(newItem);
      }
    }
  });
  
  // 移除已删除的分组
  existingItems.forEach(item => {
    const id = item.getAttribute('data-group-id');
    if (!newIds.has(id)) {
      item.remove();
    }
  });
  
  // 保存当前状态作为下一次的previousGroups
  previousGroups = JSON.parse(JSON.stringify(groups));
  
  updateCount();
}

// 渲染分组列表（首次加载时使用）
function renderGroups() {
  groupList.innerHTML = '';
  
  if (groups.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <div class="empty-state-icon">📁</div>
      <div class="empty-state-text">${i18n.t('groups.empty')}<br>${i18n.t('groups.emptyDesc')}</div>
    `;
    groupList.appendChild(emptyState);
  } else {
    groups.forEach(group => {
      const li = createGroupItem(group);
      groupList.appendChild(li);
    });
  }
  
  // 保存当前状态
  previousGroups = JSON.parse(JSON.stringify(groups));
  
  updateCount();
}

// 拖动排序相关
let draggedItem = null;
let dragStartPos = null;

// 防抖函数 - 用于优化拖拽排序
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function handleDragStart(e) {
  // 如果点击的是分组内容区域，不启动拖动
  if (e.target.classList.contains('group-content')) {
    e.preventDefault();
    return false;
  }
  
  draggedItem = this;
  dragStartPos = { x: e.clientX, y: e.clientY };
  this.style.opacity = '0.5';
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  if (!draggedItem) return;
  
  // 检查是否真的在拖动（移动了一定距离）
  if (dragStartPos) {
    const deltaX = Math.abs(e.clientX - dragStartPos.x);
    const deltaY = Math.abs(e.clientY - dragStartPos.y);
    if (deltaX < 5 && deltaY < 5) {
      return; // 移动距离太小，可能是点击，不处理拖动
    }
  }
  
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  const afterElement = getDragAfterElement(groupList, e.clientY);
  if (afterElement == null) {
    groupList.appendChild(draggedItem);
  } else {
    groupList.insertBefore(draggedItem, afterElement);
  }
}

// 创建防抖的排序更新函数（300ms延迟）
const debouncedReorderGroups = debounce(async (groupIds) => {
  try {
    const result = await window.electronAPI.data.reorderGroups(groupIds);
    if (result.success) {
      // 重新加载分组列表
      await loadGroups();
      updateGroups();
    } else {
      console.error('重新排序失败:', result.error);
    }
  } catch (error) {
    console.error('重新排序失败:', error);
  }
}, 300);

async function handleDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  
  // 更新数据顺序
  const items = Array.from(groupList.querySelectorAll('.group-item'));
  const newGroupIds = items.map(item => {
    return item.getAttribute('data-group-id');
  }).filter(id => id);
  
  // 使用防抖优化，避免拖动过程中频繁请求
  debouncedReorderGroups(newGroupIds);
}

function handleDragEnd(e) {
  this.style.opacity = '1';
  draggedItem = null;
  dragStartPos = null;
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.group-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 更新计数
function updateCount() {
  const totalGroups = groups.length;
  groupCount.textContent = `${totalGroups}${i18n.t('groups.count')}`;
}

// 加载设置
async function loadSettings() {
  try {
    const settings = await window.electronAPI.loadSettings();
    if (settings) {
      if (settings.autoStart !== undefined) {
        autoStartToggle.checked = settings.autoStart;
      }
      if (settings.themeMode) {
        applyThemeMode(settings.themeMode);
      }
      if (settings.language) {
        // 设置语言按钮状态
        if (settings.language === 'zh-CN') {
          langZhBtn.classList.add('active');
          langEnBtn.classList.remove('active');
        } else {
          langEnBtn.classList.add('active');
          langZhBtn.classList.remove('active');
        }
      }
    }
  } catch (error) {
    console.error('加载设置失败:', error);
  }
}

// 选择主题模式
async function selectThemeMode(mode) {
  applyThemeMode(mode);
  // 保存设置
  try {
    const currentSettings = await window.electronAPI.loadSettings() || {};
    currentSettings.themeMode = mode;
    await window.electronAPI.saveSettings(currentSettings);
    // 通知所有打开的分组窗口主题已变化
    window.electronAPI.notifyThemeChanged();
  } catch (error) {
    console.error('保存主题设置失败:', error);
  }
}

// 应用主题模式
function applyThemeMode(mode) {
  const body = document.body;
  
  if (mode === 'dark') {
    body.classList.add('dark-theme');
    body.classList.remove('light-theme');
    themeLightBtn.classList.remove('active');
    themeDarkBtn.classList.add('active');
  } else {
    body.classList.add('light-theme');
    body.classList.remove('dark-theme');
    themeLightBtn.classList.add('active');
    themeDarkBtn.classList.remove('active');
  }
}

// 切换设置菜单显示
function toggleSettingsMenu() {
  if (settingsMenu.classList.contains('visible')) {
    hideSettingsMenu();
  } else {
    showSettingsMenu();
  }
}

// 显示设置菜单
function showSettingsMenu() {
  settingsMenu.classList.add('visible');
}

// 隐藏设置菜单
function hideSettingsMenu() {
  settingsMenu.classList.remove('visible');
}

// 订阅更新状态变化
let updateStatusUnsubscribe = null;
let isUpdating = false; // 防止重复提示

function subscribeToUpdates() {
  updateStatusUnsubscribe = window.electronAPI.update.onStatusChange(async (status) => {
    // 发现更新可用
    if (status.available && !isUpdating) {
      isUpdating = true;
      const message = i18n.t('update.availableDesc').replace('{version}', status.latestVersion);
      const confirmed = await showConfirm(message, {
        title: i18n.t('update.available'),
        type: 'info',
        confirmText: i18n.t('update.download'),
        cancelText: i18n.t('update.cancel')
      });
      
      if (confirmed) {
        // 用户确认，开始下载
        try {
          const result = await window.electronAPI.update.download();
          if (result.error) {
            await showAlert(i18n.t('update.downloadFailed') + result.error, {
              title: i18n.t('message.error'),
              type: 'error'
            });
            isUpdating = false;
          }
          // 下载成功会通过状态变化通知用户
        } catch (error) {
          console.error('下载更新失败:', error);
          await showAlert(i18n.t('update.downloadFailed') + error.message, {
            title: i18n.t('message.error'),
            type: 'error'
          });
          isUpdating = false;
        }
      } else {
        isUpdating = false;
      }
    }
    
    // 更新下载完成
    if (status.downloaded && isUpdating) {
      isUpdating = false;
      const confirmed = await showConfirm(i18n.t('update.downloaded'), {
        title: i18n.t('update.available'),
        type: 'success',
        confirmText: i18n.t('update.install'),
        cancelText: i18n.t('cancel')
      });
      
      if (confirmed) {
        // 用户确认安装，退出应用并安装
        window.electronAPI.update.install();
      }
    }
    
    // 下载进度更新（静默处理，不打扰用户）
    if (status.downloading && status.progress !== undefined) {
      // 下载中，静默处理
    }
    
    // 下载进度更新（可选：显示进度提示）
    if (status.downloading && status.progress !== undefined) {
      // 可以在这里显示进度，但为了简单，我们只在下载完成时提示
    }
    
    // 检查更新失败
    if (status.error && !status.checking && !status.downloading) {
      // 静默失败，不打扰用户
      console.error('更新检查失败:', status.error);
    }
  });
}

// 启动应用
init();


