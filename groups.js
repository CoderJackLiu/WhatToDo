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

// 状态
let groups = [];
let previousGroups = []; // 保存上一次的分组数据，用于增量更新
let isLoading = false;
let groupsSubscription = null;

// 初始化应用
async function init() {
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
}

// 加载用户信息
async function loadUserInfo() {
  try {
    const result = await window.electronAPI.auth.getCurrentUser();
    if (result.success && result.user) {
      const email = result.user.email || result.user.user_metadata?.email || '未知用户';
      userEmail.textContent = email;
    } else {
      userEmail.textContent = '未登录';
    }
  } catch (error) {
    console.error('加载用户信息失败:', error);
    userEmail.textContent = '加载失败';
  }
}

// 加载分组数据（从云端）
async function loadGroups() {
  if (isLoading) return;
  
  isLoading = true;
  try {
    const result = await window.electronAPI.data.loadGroups();
    if (result.success) {
      // 转换数据格式：将云端数据转换为本地格式
      groups = result.data.map(g => ({
        id: g.id,
        name: g.name || '',
        theme: g.theme || 'default',
        todos: [], // 待办事项在分组详情页面加载
        createdAt: new Date(g.created_at).getTime(),
        updatedAt: new Date(g.updated_at).getTime()
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

// 订阅分组变化（实时同步）
function subscribeToGroups() {
  if (groupsSubscription) {
    return; // 已经订阅
  }
  
  groupsSubscription = window.electronAPI.data.subscribeToGroups((payload) => {
    // 处理实时更新
    if (payload.eventType === 'INSERT') {
      // 新增分组
      loadGroups().then(() => updateGroups());
    } else if (payload.eventType === 'UPDATE') {
      // 更新分组
      loadGroups().then(() => updateGroups());
    } else if (payload.eventType === 'DELETE') {
      // 删除分组
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
  
  // 开机自启动开关
  autoStartToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    window.electronAPI.setAutoStart(enabled);
  });
  
  // 退出登录
  logoutBtn.addEventListener('click', async () => {
    if (confirm('确定要退出登录吗？')) {
      try {
        const result = await window.electronAPI.auth.signOut();
        if (result.success) {
          window.location.href = 'login.html';
        } else {
          alert('退出登录失败：' + (result.error || '未知错误'));
        }
      } catch (error) {
        console.error('退出登录失败:', error);
        alert('退出登录失败：' + error.message);
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
}

// 生成唯一 ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 添加分组（云端）
async function addGroup() {
  try {
    const result = await window.electronAPI.data.createGroup('', 'default');
    if (result.success) {
      // 重新加载分组列表
      await loadGroups();
      updateGroups();
      
      // 自动打开新创建的分组
      openGroup(result.data.id, '');
    } else {
      alert('创建分组失败：' + (result.error || '未知错误'));
    }
  } catch (error) {
    console.error('创建分组失败:', error);
    alert('创建分组失败：' + error.message);
  }
}

// 删除分组（云端）
async function deleteGroup(id) {
  if (!confirm('确定要删除这个分组吗？分组内的所有待办事项也会被删除。')) {
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
      alert('删除分组失败：' + (result.error || '未知错误'));
      if (item) {
        item.classList.remove('removing');
      }
    }
  } catch (error) {
    console.error('删除分组失败:', error);
    alert('删除分组失败：' + error.message);
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
    return '暂无待办事项';
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
    previewText += `\n...还有 ${todos.length - maxLines} 项`;
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
  
  // 分组内容预览（待办事项在详情页面加载，这里显示占位文本）
  const content = document.createElement('div');
  content.className = 'group-content';
  content.textContent = '点击查看待办事项';
  
  // 右侧内容容器
  const rightContent = document.createElement('div');
  rightContent.className = 'group-right-content';
  
  // 待办数量徽章（暂时不显示，因为待办在详情页面加载）
  const count = document.createElement('span');
  count.className = 'group-count-badge';
  count.textContent = '0';
  
  // 删除按钮（悬停时显示）
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = '×';
  deleteBtn.title = '删除分组';
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
  
  // 注意：待办事项预览和数量在详情页面加载，这里不更新
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
  
  // 注意：待办事项在详情页面加载，这里不比较
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
      <div class="empty-state-text">暂无分组<br>创建一个分组开始管理待办事项！</div>
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
      if (hasGroupChanged(oldGroup, group)) {
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
      <div class="empty-state-text">暂无分组<br>创建一个分组开始管理待办事项！</div>
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

async function handleDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  
  // 更新数据顺序
  const items = Array.from(groupList.querySelectorAll('.group-item'));
  const newGroupIds = items.map(item => {
    return item.getAttribute('data-group-id');
  }).filter(id => id);
  
  // 更新云端数据顺序
  try {
    const result = await window.electronAPI.data.reorderGroups(newGroupIds);
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
  groupCount.textContent = `${totalGroups} 个分组`;
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

// 启动应用
init();


