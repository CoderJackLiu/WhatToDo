// DOM 元素
const addGroupBtn = document.getElementById('add-group-btn');
const groupList = document.getElementById('group-list');
const groupCount = document.getElementById('group-count');
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');

// 状态
let groups = [];
let previousGroups = []; // 保存上一次的分组数据，用于增量更新

// 初始化应用
async function init() {
  await loadGroups();
  bindEvents();
  renderGroups();
  
  // 监听分组数据变化
  window.electronAPI.onGroupsChanged(async () => {
    await loadGroups();
    updateGroups(); // 使用增量更新而不是完全重新渲染
  });
}

// 加载分组数据
async function loadGroups() {
  try {
    const data = await window.electronAPI.loadGroups();
    groups = data.groups || [];
  } catch (error) {
    console.error('加载分组失败:', error);
    groups = [];
  }
}

// 保存分组数据
async function saveGroups() {
  try {
    await window.electronAPI.saveGroups({ groups });
  } catch (error) {
    console.error('保存分组失败:', error);
  }
}

// 绑定事件
function bindEvents() {
  // 添加分组
  addGroupBtn.addEventListener('click', addGroup);
  
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

// 添加分组
function addGroup() {
  const newGroup = {
    id: generateId(),
    name: '', // 不再需要名称
    todos: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  groups.unshift(newGroup);
  
  saveGroups();
  updateGroups(); // 使用增量更新
  
  // 自动打开新创建的分组
  openGroup(newGroup.id, '');
}

// 删除分组
function deleteGroup(id) {
  if (!confirm('确定要删除这个分组吗？分组内的所有待办事项也会被删除。')) {
    return;
  }
  
  const index = groups.findIndex(g => g.id === id);
  if (index !== -1) {
    const item = document.querySelector(`[data-group-id="${id}"]`);
    if (item) {
      item.classList.add('removing');
      setTimeout(() => {
        groups.splice(index, 1);
        saveGroups();
        updateGroups(); // 使用增量更新
      }, 300);
    }
  }
}

// 打开分组
function openGroup(id, name) {
  // 如果没有名称，使用默认名称
  const group = groups.find(g => g.id === id);
  const displayName = group && group.name ? group.name : '未命名分组';
  window.electronAPI.openGroup(id, displayName);
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

// 创建单个分组项
function createGroupItem(group) {
  const li = document.createElement('li');
  li.className = 'todo-item group-item';
  li.setAttribute('data-group-id', group.id);
  
  // 分组内容预览
  const content = document.createElement('div');
  content.className = 'group-content';
  const todos = group.todos || [];
  content.textContent = getGroupPreviewText(todos);
  
  // 右侧内容容器
  const rightContent = document.createElement('div');
  rightContent.className = 'group-right-content';
  
  // 待办数量徽章
  const count = document.createElement('span');
  count.className = 'group-count-badge';
  const totalCount = todos.length;
  const completedCount = todos.filter(t => t.completed).length;
  count.textContent = totalCount > 0 ? `${completedCount}/${totalCount}` : '0';
  
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
    openGroup(group.id, group.name);
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
  const content = li.querySelector('.group-content');
  const count = li.querySelector('.group-count-badge');
  
  if (content) {
    const todos = group.todos || [];
    content.textContent = getGroupPreviewText(todos);
  }
  
  if (count) {
    const todos = group.todos || [];
    const totalCount = todos.length;
    const completedCount = todos.filter(t => t.completed).length;
    count.textContent = totalCount > 0 ? `${completedCount}/${totalCount}` : '0';
  }
}

// 检查分组是否有变化
function hasGroupChanged(oldGroup, newGroup) {
  if (!oldGroup) return true;
  
  // 比较待办事项数量
  const oldTodos = oldGroup.todos || [];
  const newTodos = newGroup.todos || [];
  
  if (oldTodos.length !== newTodos.length) return true;
  
  // 比较每个待办事项
  for (let i = 0; i < newTodos.length; i++) {
    const oldTodo = oldTodos[i];
    const newTodo = newTodos[i];
    
    if (!oldTodo || 
        oldTodo.id !== newTodo.id || 
        oldTodo.text !== newTodo.text || 
        oldTodo.completed !== newTodo.completed) {
      return true;
    }
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

function handleDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  
  // 更新数据顺序
  const items = Array.from(groupList.querySelectorAll('.group-item'));
  const newGroups = items.map(item => {
    const groupId = item.getAttribute('data-group-id');
    return groups.find(g => g.id === groupId);
  }).filter(g => g);
  
  groups = newGroups;
  saveGroups();
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

// 启动应用
init();

