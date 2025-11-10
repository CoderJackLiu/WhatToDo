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
    windowTitle.textContent = `📝 ${currentGroupName}`;
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
  let hideTimer = null;
  let isDragging = false;
  let dragEndTime = 0;
  let isMouseInTopArea = false;
  
  // 监听拖动开始 - 使用捕获阶段确保能捕获到事件
  document.addEventListener('mousedown', (e) => {
    // 检查是否点击在标题栏区域（包括隐藏状态下的顶部区域）
    if (e.clientY < 50 && titlebar.classList.contains('visible')) {
      isDragging = true;
      // 拖动时保持标题栏可见
      titlebar.classList.add('visible');
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    }
  }, true);
  
  // 监听拖动结束
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      dragEndTime = Date.now();
    }
  });
  
  // 鼠标移动到顶部区域时显示标题栏
  document.addEventListener('mousemove', (e) => {
    const inTopArea = e.clientY < 50;
    isMouseInTopArea = inTopArea;
    
    // 如果正在拖动，保持标题栏可见
    if (isDragging) {
      titlebar.classList.add('visible');
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      return;
    }
    
    // 如果刚结束拖动（800ms内），不立即隐藏
    const timeSinceDragEnd = Date.now() - dragEndTime;
    if (timeSinceDragEnd < 800 && dragEndTime > 0) {
      return;
    }
    
    // 如果鼠标在顶部 50px 区域
    if (inTopArea) {
      titlebar.classList.add('visible');
      
      // 清除之前的隐藏定时器
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    } else {
      // 鼠标离开顶部区域，延迟隐藏
      if (!hideTimer && !isDragging) {
        hideTimer = setTimeout(() => {
          // 再次确认不在拖动状态且不在顶部区域
          if (!isDragging && !isMouseInTopArea) {
            titlebar.classList.remove('visible');
          }
          hideTimer = null;
        }, 600);
      }
    }
  });
  
  // 鼠标在标题栏上时保持显示
  titlebar.addEventListener('mouseenter', () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  });
  
  // 鼠标离开标题栏时延迟隐藏
  titlebar.addEventListener('mouseleave', (e) => {
    // 如果正在拖动，不隐藏
    if (isDragging) {
      return;
    }
    
    // 检查鼠标是否还在顶部区域
    if (e.clientY < 50) {
      return;
    }
    
    if (!hideTimer) {
      hideTimer = setTimeout(() => {
        if (!isDragging && !isMouseInTopArea) {
          titlebar.classList.remove('visible');
        }
        hideTimer = null;
      }, 600);
    }
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
      text.addEventListener('dblclick', () => startEdit(todo.id));
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
      
      li.appendChild(checkbox);
      li.appendChild(text);
      li.appendChild(deleteBtn);
      
      todoList.appendChild(li);
    });
  }
  
  updateCount();
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

