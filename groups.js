// DOM 元素
const groupInput = document.getElementById('group-input');
const addGroupBtn = document.getElementById('add-group-btn');
const groupList = document.getElementById('group-list');
const groupCount = document.getElementById('group-count');
const deleteModeBtn = document.getElementById('delete-mode-btn');
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');

// 状态
let groups = [];
let deleteMode = false;

// 初始化应用
async function init() {
  await loadGroups();
  bindEvents();
  renderGroups();
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
  groupInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addGroup();
    }
  });
  
  // 管理模式切换
  deleteModeBtn.addEventListener('click', toggleDeleteMode);
  
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
  const name = groupInput.value.trim();
  
  if (!name) {
    return;
  }
  
  const newGroup = {
    id: generateId(),
    name: name,
    todos: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  groups.unshift(newGroup);
  groupInput.value = '';
  
  saveGroups();
  renderGroups();
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
  window.electronAPI.openGroup(id, name);
}

// 切换删除模式
function toggleDeleteMode() {
  deleteMode = !deleteMode;
  deleteModeBtn.textContent = deleteMode ? '完成' : '管理模式';
  deleteModeBtn.style.background = deleteMode ? '#ff6b6b' : '#f0f0f0';
  deleteModeBtn.style.color = deleteMode ? 'white' : '#666';
  
  renderGroups();
}

// 编辑分组名称
function startEdit(id) {
  if (deleteMode) return;
  
  const item = document.querySelector(`[data-group-id="${id}"]`);
  if (!item) return;
  
  const group = groups.find(g => g.id === id);
  if (!group) return;
  
  const nameElement = item.querySelector('.group-name');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'todo-edit-input';
  input.value = group.name;
  
  nameElement.replaceWith(input);
  input.focus();
  input.select();
  
  const saveEdit = () => {
    const newName = input.value.trim();
    if (newName) {
      group.name = newName;
      group.updatedAt = Date.now();
      saveGroups();
    }
    renderGroups();
  };
  
  input.addEventListener('blur', saveEdit);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveEdit();
    }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      renderGroups();
    }
  });
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
      
      // 分组名称
      const name = document.createElement('span');
      name.className = 'group-name';
      name.textContent = group.name;
      
      // 待办数量
      const count = document.createElement('span');
      count.className = 'group-count-badge';
      const totalCount = group.todos ? group.todos.length : 0;
      const completedCount = group.todos ? group.todos.filter(t => t.completed).length : 0;
      count.textContent = totalCount > 0 ? `${completedCount}/${totalCount}` : '0';
      
      // 右侧内容容器
      const rightContent = document.createElement('div');
      rightContent.className = 'group-right-content';
      rightContent.appendChild(count);
      
      if (deleteMode) {
        // 删除模式：显示删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn visible';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteGroup(group.id);
        });
        rightContent.appendChild(deleteBtn);
        
        li.addEventListener('click', () => {
          deleteGroup(group.id);
        });
      } else {
        // 正常模式：点击打开，双击编辑
        li.addEventListener('click', () => {
          openGroup(group.id, group.name);
        });
        
        li.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          startEdit(group.id);
        });
      }
      
      li.appendChild(icon);
      li.appendChild(name);
      li.appendChild(rightContent);
      
      groupList.appendChild(li);
    });
  }
  
  updateCount();
}

// 更新计数
function updateCount() {
  const totalGroups = groups.length;
  groupCount.textContent = `${totalGroups} 个分组`;
}

// 启动应用
init();

