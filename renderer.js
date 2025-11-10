// DOM 元素
const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const todoCount = document.getElementById('todo-count');
const clearCompletedBtn = document.getElementById('clear-completed');
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');

// 待办事项数据
let todos = [];

// 初始化应用
async function init() {
  // 加载数据
  await loadTodos();
  
  // 绑定事件
  bindEvents();
  
  // 渲染列表
  renderTodos();
}

// 加载待办事项
async function loadTodos() {
  try {
    const data = await window.electronAPI.loadTodos();
    todos = data.todos || [];
  } catch (error) {
    console.error('加载待办事项失败:', error);
    todos = [];
  }
}

// 保存待办事项
async function saveTodos() {
  try {
    await window.electronAPI.saveTodos({ todos });
  } catch (error) {
    console.error('保存待办事项失败:', error);
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
  
  todos.unshift(newTodo); // 添加到列表开头
  todoInput.value = '';
  
  saveTodos();
  renderTodos();
}

// 切换完成状态
function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    todo.updatedAt = Date.now();
    saveTodos();
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
        saveTodos();
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
    saveTodos();
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
  
  // 创建输入框
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'todo-edit-input';
  input.value = todo.text;
  
  // 替换文本元素
  textElement.replaceWith(input);
  checkbox.style.display = 'none';
  deleteBtn.style.display = 'none';
  
  // 聚焦并选中文本
  input.focus();
  input.select();
  
  // 保存编辑
  const saveEdit = () => {
    const newText = input.value.trim();
    if (newText) {
      editTodo(id, newText);
    } else {
      renderTodos();
    }
  };
  
  // 绑定事件
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
  saveTodos();
  renderTodos();
}

// 格式化时间
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // 小于 1 分钟
  if (diff < 60000) {
    return '刚刚';
  }
  
  // 小于 1 小时
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}分钟前`;
  }
  
  // 小于 1 天
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}小时前`;
  }
  
  // 显示日期
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

// 渲染待办列表
function renderTodos() {
  // 清空列表
  todoList.innerHTML = '';
  
  // 如果没有待办事项，显示空状态
  if (todos.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <div class="empty-state-icon">📝</div>
      <div class="empty-state-text">暂无待办事项<br>添加一个开始吧！</div>
    `;
    todoList.appendChild(emptyState);
  } else {
    // 渲染每个待办项
    todos.forEach(todo => {
      const li = document.createElement('li');
      li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
      li.setAttribute('data-id', todo.id);
      
      // 复选框
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-checkbox';
      checkbox.checked = todo.completed;
      checkbox.addEventListener('change', () => toggleTodo(todo.id));
      
      // 文本
      const text = document.createElement('span');
      text.className = 'todo-text';
      text.textContent = todo.text;
      text.addEventListener('dblclick', () => startEdit(todo.id));
      
      // 时间戳（可选）
      // const timestamp = document.createElement('span');
      // timestamp.className = 'todo-timestamp';
      // timestamp.textContent = formatTime(todo.createdAt);
      
      // 删除按钮
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
      
      // 组装
      li.appendChild(checkbox);
      li.appendChild(text);
      // li.appendChild(timestamp);
      li.appendChild(deleteBtn);
      
      todoList.appendChild(li);
    });
  }
  
  // 更新计数
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
  
  // 控制清除按钮显示
  const hasCompleted = todos.some(t => t.completed);
  clearCompletedBtn.style.opacity = hasCompleted ? '1' : '0.3';
  clearCompletedBtn.style.cursor = hasCompleted ? 'pointer' : 'default';
}

// 启动应用
init();

