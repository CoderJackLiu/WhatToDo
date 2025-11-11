// DOM 元素
const addGroupBtn = document.getElementById('add-group-btn');
const groupList = document.getElementById('group-list');
const groupCount = document.getElementById('group-count');
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');

// 状态
let groups = [];

// 初始化应用
async function init() {
  await loadGroups();
  bindEvents();
  renderGroups();
  
  // 监听分组数据变化
  window.electronAPI.onGroupsChanged(async () => {
    await loadGroups();
    renderGroups();
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
  renderGroups();
  
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
        renderGroups();
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

// 渲染分组列表
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
      const li = document.createElement('li');
      li.className = 'todo-item group-item';
      li.setAttribute('data-group-id', group.id);
      
      // 分组图标
      const icon = document.createElement('span');
      icon.className = 'group-icon';
      icon.textContent = '📁';
      
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
      
      li.appendChild(icon);
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
      
      groupList.appendChild(li);
    });
  }
  
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

