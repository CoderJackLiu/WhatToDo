// DOM 元素
const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const todoCount = document.getElementById('todo-count');
const clearCompletedBtn = document.getElementById('clear-completed');
const pinBtn = document.getElementById('pin-btn');
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');
const windowTitle = document.getElementById('window-title');
const titlebar = document.querySelector('.titlebar');
const titlebarTrigger = document.querySelector('.titlebar-trigger');
const inputSection = document.querySelector('.input-section');
const footer = document.querySelector('.footer');

// 当前分组信息
let currentGroupId = null;
let currentGroupName = '';
let groups = [];
let todos = [];
let isAlwaysOnTop = false;

// 初始化应用
async function init() {
  // 接收分组信息
  window.electronAPI.onGroupInfo((data) => {
    currentGroupId = data.groupId;
    currentGroupName = data.groupName;
    windowTitle.textContent = `${currentGroupName}`;
    loadGroupData();
  });
  
  // 绑定事件
  bindEvents();
}

// 加载分组数据
async function loadGroupData() {
  try {
    const data = await window.electronAPI.loadGroups();
    groups = data.groups || [];
    
    const group = groups.find(g => g.id === currentGroupId);
    if (group) {
      todos = group.todos || [];
      renderTodos();
    }
  } catch (error) {
    console.error('加载分组数据失败:', error);
    todos = [];
  }
}

// 保存分组数据
async function saveGroupData() {
  try {
    const group = groups.find(g => g.id === currentGroupId);
    if (group) {
      group.todos = todos;
      group.updatedAt = Date.now();
      await window.electronAPI.saveGroups({ groups });
      // 通知主窗口刷新
      window.electronAPI.notifyGroupsChanged();
    }
  } catch (error) {
    console.error('保存分组数据失败:', error);
  }
}

// 绑定事件
function bindEvents() {
  // 添加待办
  addBtn.addEventListener('click', addTodo);
  todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  });
  
  // 清除已完成
  clearCompletedBtn.addEventListener('click', clearCompleted);
  
  // 窗口控制
  pinBtn.addEventListener('click', () => {
    window.electronAPI.toggleAlwaysOnTop();
  });
  
  minimizeBtn.addEventListener('click', () => {
    window.electronAPI.minimizeWindow();
  });
  
  closeBtn.addEventListener('click', () => {
    window.electronAPI.closeWindow();
  });
  
  // 监听置顶状态变化
  window.electronAPI.onAlwaysOnTopChanged((isOnTop) => {
    isAlwaysOnTop = isOnTop;
    updatePinButton();
  });
  
  // 标题栏自动显示隐藏
  setupTitlebarAutoHide();
}

// 设置标题栏自动显示隐藏
function setupTitlebarAutoHide() {
  // 监听窗口焦点变化
  window.electronAPI.onWindowFocus(() => {
    titlebar.classList.add('visible');
    inputSection.classList.add('visible');
    footer.classList.add('visible');
  });
  
  window.electronAPI.onWindowBlur(() => {
    titlebar.classList.remove('visible');
    inputSection.classList.remove('visible');
    footer.classList.remove('visible');
  });
}

// 更新置顶按钮状态
function updatePinButton() {
  if (isAlwaysOnTop) {
    pinBtn.classList.add('active');
    pinBtn.title = '取消置顶';
  } else {
    pinBtn.classList.remove('active');
    pinBtn.title = '置顶窗口';
  }
}

// 生成唯一 ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 添加待办事项
function addTodo() {
  const text = todoInput.value.trim();
  
  if (!text) {
    return;
  }
  
  const newTodo = {
    id: generateId(),
    text: text,
    completed: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  todos.unshift(newTodo);
  todoInput.value = '';
  
  saveGroupData();
  renderTodos();
}

// 切换完成状态
function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    todo.updatedAt = Date.now();
    saveGroupData();
    renderTodos();
  }
}

// 删除待办事项
function deleteTodo(id) {
  const index = todos.findIndex(t => t.id === id);
  if (index !== -1) {
    const item = document.querySelector(`[data-id="${id}"]`);
    if (item) {
      item.classList.add('removing');
      setTimeout(() => {
        todos.splice(index, 1);
        saveGroupData();
        renderTodos();
      }, 300);
    }
  }
}

// 编辑待办事项
function editTodo(id, newText) {
  const todo = todos.find(t => t.id === id);
  if (todo && newText.trim()) {
    todo.text = newText.trim();
    todo.updatedAt = Date.now();
    saveGroupData();
    renderTodos();
  }
}

// 开始编辑
function startEdit(id) {
  const item = document.querySelector(`[data-id="${id}"]`);
  if (!item) return;
  
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  
  const textElement = item.querySelector('.todo-text');
  const checkbox = item.querySelector('.todo-checkbox');
  const deleteBtn = item.querySelector('.delete-btn');
  
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'todo-edit-input';
  input.value = todo.text;
  
  textElement.replaceWith(input);
  checkbox.style.display = 'none';
  deleteBtn.style.display = 'none';
  
  input.focus();
  input.select();
  
  const saveEdit = () => {
    const newText = input.value.trim();
    if (newText) {
      editTodo(id, newText);
    } else {
      renderTodos();
    }
  };
  
  input.addEventListener('blur', saveEdit);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveEdit();
    }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      renderTodos();
    }
  });
}

// 清除已完成
function clearCompleted() {
  const hasCompleted = todos.some(t => t.completed);
  if (!hasCompleted) return;
  
  todos = todos.filter(t => !t.completed);
  saveGroupData();
  renderTodos();
}

// 渲染待办列表
function renderTodos() {
  todoList.innerHTML = '';
  
  if (todos.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <div class="empty-state-icon">📝</div>
      <div class="empty-state-text">暂无待办事项<br>添加一个开始吧！</div>
    `;
    todoList.appendChild(emptyState);
  } else {
    todos.forEach(todo => {
      const li = document.createElement('li');
      li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
      li.setAttribute('data-id', todo.id);
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-checkbox';
      checkbox.checked = todo.completed;
      checkbox.addEventListener('change', () => toggleTodo(todo.id));
      
      const text = document.createElement('span');
      text.className = 'todo-text';
      text.textContent = todo.text;
      text.title = '双击编辑';
      // 双击编辑
      text.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        e.preventDefault();
        startEdit(todo.id);
      });
      // 阻止文本区域的拖动
      text.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
      
      li.appendChild(checkbox);
      li.appendChild(text);
      li.appendChild(deleteBtn);
      
      // 拖动排序 - 只在非文本区域拖动
      li.setAttribute('draggable', 'true');
      li.addEventListener('dragstart', handleTodoDragStart);
      li.addEventListener('dragover', handleTodoDragOver);
      li.addEventListener('drop', handleTodoDrop);
      li.addEventListener('dragend', handleTodoDragEnd);
      
      // 阻止文本区域的拖动事件冒泡
      text.addEventListener('dragstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      });
      
      todoList.appendChild(li);
    });
  }
  
  updateCount();
}

// 拖动排序相关
let draggedTodoItem = null;
let dragStartPos = null;
let isDragging = false;

function handleTodoDragStart(e) {
  // 如果点击的是文本区域，不启动拖动（允许双击编辑）
  if (e.target.classList.contains('todo-text')) {
    e.preventDefault();
    return false;
  }
  
  draggedTodoItem = this;
  dragStartPos = { x: e.clientX, y: e.clientY };
  isDragging = false;
  this.style.opacity = '0.5';
  e.dataTransfer.effectAllowed = 'move';
}

function handleTodoDragOver(e) {
  if (!draggedTodoItem) return;
  
  // 检查是否真的在拖动（移动了一定距离）
  if (dragStartPos && !isDragging) {
    const deltaX = Math.abs(e.clientX - dragStartPos.x);
    const deltaY = Math.abs(e.clientY - dragStartPos.y);
    if (deltaX < 5 && deltaY < 5) {
      return; // 移动距离太小，可能是点击，不处理拖动
    }
    isDragging = true;
  }
  
  if (!isDragging) return;
  
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  const afterElement = getDragAfterTodoElement(todoList, e.clientY);
  if (afterElement == null) {
    todoList.appendChild(draggedTodoItem);
  } else {
    todoList.insertBefore(draggedTodoItem, afterElement);
  }
}

function handleTodoDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  
  // 更新数据顺序
  const items = Array.from(todoList.querySelectorAll('.todo-item'));
  const newTodos = items.map(item => {
    const todoId = item.getAttribute('data-id');
    return todos.find(t => t.id === todoId);
  }).filter(t => t);
  
  todos = newTodos;
  saveGroupData();
}

function handleTodoDragEnd(e) {
  this.style.opacity = '1';
  draggedTodoItem = null;
  dragStartPos = null;
  isDragging = false;
}

function getDragAfterTodoElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.todo-item:not(.dragging)')];
  
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
  const activeCount = todos.filter(t => !t.completed).length;
  const totalCount = todos.length;
  
  if (totalCount === 0) {
    todoCount.textContent = '0 个待办事项';
  } else if (activeCount === totalCount) {
    todoCount.textContent = `${activeCount} 个待办事项`;
  } else {
    todoCount.textContent = `${activeCount} / ${totalCount} 个待办事项`;
  }
  
  const hasCompleted = todos.some(t => t.completed);
  clearCompletedBtn.style.opacity = hasCompleted ? '1' : '0.3';
  clearCompletedBtn.style.cursor = hasCompleted ? 'pointer' : 'default';
}

// 启动应用
init();

