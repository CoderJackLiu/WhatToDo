// DOM 元素
const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const todoCount = document.getElementById('todo-count');
const clearCompletedBtn = document.getElementById('clear-completed');
const pinBtn = document.getElementById('pin-btn');
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');
const menuBtn = document.getElementById('menu-btn');
const themeMenu = document.getElementById('theme-menu');
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
let currentTheme = 'default';

// 初始化应用
async function init() {
  // 加载主题模式设置
  await loadThemeMode();
  
  // 默认显示标题栏和底部（新建/打开分组时）
  showTitlebarAndFooter();
  
  // 接收分组信息
  window.electronAPI.onGroupInfo((data) => {
    currentGroupId = data.groupId;
    currentGroupName = data.groupName;
    windowTitle.textContent = `${currentGroupName}`;
    loadGroupData();
    // 确保显示标题栏和底部
    showTitlebarAndFooter();
  });
  
  // 绑定事件
  bindEvents();
  
  // 监听主题变化
  window.electronAPI.onThemeChanged(async () => {
    await loadThemeMode();
    // 重新应用分组主题颜色（标题栏）
    if (currentTheme) {
      applyTheme(currentTheme);
    }
  });
}

// 加载主题模式
async function loadThemeMode() {
  try {
    const settings = await window.electronAPI.loadSettings();
    if (settings && settings.themeMode) {
      applyThemeMode(settings.themeMode);
    } else {
      // 默认使用亮色主题
      applyThemeMode('light');
    }
  } catch (error) {
    console.error('加载主题模式失败:', error);
    applyThemeMode('light');
  }
}

// 应用主题模式
function applyThemeMode(mode) {
  const body = document.body;
  
  if (mode === 'dark') {
    body.classList.add('dark-theme');
    body.classList.remove('light-theme');
  } else {
    body.classList.add('light-theme');
    body.classList.remove('dark-theme');
  }
}

// 加载分组数据
async function loadGroupData() {
  try {
    const data = await window.electronAPI.loadGroups();
    groups = data.groups || [];
    
    const group = groups.find(g => g.id === currentGroupId);
    if (group) {
      todos = group.todos || [];
      // 加载并应用分组的主题（标题栏颜色）
      const groupTheme = group.theme || 'default';
      currentTheme = groupTheme;
      // 延迟应用主题，确保主题模式已加载
      setTimeout(() => {
        applyTheme(groupTheme);
      }, 100);
      renderTodos();
    }
    // 确保显示标题栏和底部
    showTitlebarAndFooter();
  } catch (error) {
    console.error('加载分组数据失败:', error);
    todos = [];
    // 即使出错也显示标题栏和底部
    showTitlebarAndFooter();
  }
}

// 保存分组数据
async function saveGroupData() {
  try {
    const group = groups.find(g => g.id === currentGroupId);
    if (group) {
      group.todos = todos;
      group.theme = currentTheme; // 保存主题到分组
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
  
  // 菜单按钮
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleThemeMenu();
  });
  
  // 主题选择
  const themeOptions = themeMenu.querySelectorAll('.theme-option');
  themeOptions.forEach(option => {
    option.addEventListener('click', () => {
      const theme = option.getAttribute('data-theme');
      selectTheme(theme);
      hideThemeMenu();
    });
  });
  
  // 点击外部关闭菜单
  document.addEventListener('click', (e) => {
    if (!themeMenu.contains(e.target) && !menuBtn.contains(e.target)) {
      hideThemeMenu();
    }
  });
  
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

// 显示标题栏和底部
function showTitlebarAndFooter() {
  titlebar.classList.add('visible');
  inputSection.classList.add('visible');
  footer.classList.add('visible');
}

// 隐藏标题栏和底部
function hideTitlebarAndFooter() {
  titlebar.classList.remove('visible');
  inputSection.classList.remove('visible');
  footer.classList.remove('visible');
}

// 设置标题栏自动显示隐藏
function setupTitlebarAutoHide() {
  // 监听窗口焦点变化
  // 注意：只在失焦时隐藏，获得焦点时保持显示（因为新建/打开时应该显示）
  window.electronAPI.onWindowFocus(() => {
    // 获得焦点时显示（如果之前被隐藏了）
    showTitlebarAndFooter();
  });
  
  window.electronAPI.onWindowBlur(() => {
    // 失焦时隐藏（延迟一点，避免快速切换时闪烁）
    setTimeout(() => {
      // 检查窗口是否仍然失焦
      if (!document.hasFocus()) {
        hideTitlebarAndFooter();
      }
    }, 300);
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

// 颜色主题配置 - 只用于标题栏
const themes = {
  default: {
    bg: '#fef7dc',
    border: '#e8dcc3',
    text: '#7d6c4d'
  },
  blue: {
    bg: '#d4e8f0',
    border: '#b8d4e0',
    text: '#4a6b7a'
  },
  green: {
    bg: '#d4ead6',
    border: '#b8d4ba',
    text: '#4a6b4c'
  },
  purple: {
    bg: '#e6d4ed',
    border: '#d4b8d4',
    text: '#6b4a6b'
  },
  gray: {
    bg: '#e8e8e8',
    border: '#d0d0d0',
    text: '#5a5a5a'
  },
  pink: {
    bg: '#f5d4e3',
    border: '#e8b8d0',
    text: '#7a4a5a'
  }
};

// 应用主题 - 只改变标题栏颜色
function applyTheme(theme) {
  if (!themes[theme]) {
    theme = 'default';
  }
  
  const themeColors = themes[theme];
  const titlebar = document.querySelector('.titlebar');
  const isDarkMode = document.body.classList.contains('dark-theme');
  
  if (titlebar) {
    // 根据暗色/亮色模式调整标题栏颜色
    let bgColor, borderColor, textColor, topBorderColor;
    
    if (isDarkMode) {
      // 暗色模式下，标题栏背景使用主题颜色的深色版本，保留更多原始颜色
      bgColor = adjustColorForDarkMode(themeColors.bg, 0.65); // 使用65%亮度的主题背景色，保留更多原始色调
      // 边框使用更明显的主题颜色（90%亮度），让主题风格更突出
      borderColor = adjustColorForDarkMode(themeColors.border, 0.9);
      // 顶部边框使用更亮的主题颜色作为强调（几乎保持原始颜色）
      topBorderColor = adjustColorForDarkMode(themeColors.border, 0.95);
      textColor = '#e0e0e0'; // 文字使用浅色，确保可读性
    } else {
      bgColor = themeColors.bg;
      borderColor = themeColors.border;
      topBorderColor = themeColors.border;
      textColor = themeColors.text;
    }
    
    // 只改变标题栏的背景、边框和文字颜色
    if (isDarkMode) {
      // 暗色模式下，使用主题颜色的深色版本作为背景
      titlebar.style.setProperty('background-color', bgColor, 'important');
      titlebar.style.setProperty('border-bottom-color', borderColor, 'important');
      // 添加顶部边框来显示主题颜色
      titlebar.style.setProperty('border-top', `2px solid ${topBorderColor}`, 'important');
      titlebar.style.setProperty('color', textColor, 'important');
    } else {
      titlebar.style.backgroundColor = bgColor;
      titlebar.style.borderBottomColor = borderColor;
      titlebar.style.borderTop = 'none';
      titlebar.style.color = textColor;
    }
    
    // 更新标题栏内的文字和按钮颜色
    const titlebarTitle = titlebar.querySelector('.titlebar-title');
    const titlebarButtons = titlebar.querySelectorAll('.titlebar-button');
    
    if (titlebarTitle) {
      if (isDarkMode) {
        titlebarTitle.style.setProperty('color', textColor, 'important');
      } else {
        titlebarTitle.style.color = textColor;
      }
    }
    
    titlebarButtons.forEach(btn => {
      if (isDarkMode) {
        btn.style.setProperty('color', textColor, 'important');
      } else {
        btn.style.color = textColor;
      }
    });
    
    // 为标题栏添加CSS变量，用于hover效果
    // 将十六进制颜色转换为rgba格式用于hover背景
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const rgb = hexToRgb(textColor);
    if (rgb) {
      titlebar.style.setProperty('--theme-hover-bg', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
    } else {
      // 如果转换失败，使用通用半透明背景
      titlebar.style.setProperty('--theme-hover-bg', isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)');
    }
  }
  
  // 更新选中状态
  const themeOptions = themeMenu.querySelectorAll('.theme-option');
  themeOptions.forEach(option => {
    if (option.getAttribute('data-theme') === theme) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
}

// 为暗色模式调整颜色（保留更多原始主题颜色）
function adjustColorForDarkMode(hex, brightness = 0.6) {
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };
  
  const rgbToHex = (r, g, b) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };
  
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  // 使用更直接的方法：按比例降低亮度，保持颜色比例和饱和度
  // 计算当前颜色的最大分量（用于保持颜色比例）
  const maxComponent = Math.max(rgb.r, rgb.g, rgb.b);
  
  // 如果颜色已经很暗，直接返回（避免过度变暗）
  if (maxComponent < 60) {
    return hex;
  }
  
  // 计算目标最大分量（保持颜色比例）
  // 对于高亮度值，使用更高的保留比例
  let targetMax;
  if (maxComponent > 200) {
    // 非常亮的颜色，保留更多
    targetMax = Math.max(80, Math.floor(maxComponent * brightness * 1.1));
  } else {
    targetMax = Math.max(60, Math.floor(maxComponent * brightness));
  }
  
  // 按比例缩放所有颜色分量，保持原始颜色比例
  let newR, newG, newB;
  if (maxComponent > 0) {
    const scale = targetMax / maxComponent;
    // 确保最小值不会太低，保留更多颜色特征
    const minValue = brightness > 0.8 ? 60 : 50;
    newR = Math.max(minValue, Math.min(255, Math.floor(rgb.r * scale)));
    newG = Math.max(minValue, Math.min(255, Math.floor(rgb.g * scale)));
    newB = Math.max(minValue, Math.min(255, Math.floor(rgb.b * scale)));
  } else {
    newR = rgb.r;
    newG = rgb.g;
    newB = rgb.b;
  }
  
  // 确保颜色不会太暗（最低亮度保证，根据brightness参数调整）
  const minBrightness = brightness > 0.8 ? 70 : (brightness > 0.6 ? 60 : 50);
  const currentBrightness = (newR + newG + newB) / 3;
  if (currentBrightness < minBrightness) {
    const adjustFactor = minBrightness / currentBrightness;
    newR = Math.min(255, Math.floor(newR * adjustFactor));
    newG = Math.min(255, Math.floor(newG * adjustFactor));
    newB = Math.min(255, Math.floor(newB * adjustFactor));
  }
  
  return rgbToHex(newR, newG, newB);
}

// 选择主题
function selectTheme(theme) {
  if (!themes[theme]) return;
  
  currentTheme = theme;
  applyTheme(theme);
  // 保存到分组数据
  saveGroupData();
}

// 切换主题菜单显示
function toggleThemeMenu() {
  if (themeMenu.classList.contains('visible')) {
    hideThemeMenu();
  } else {
    showThemeMenu();
  }
}

// 显示主题菜单
function showThemeMenu() {
  themeMenu.classList.add('visible');
}

// 隐藏主题菜单
function hideThemeMenu() {
  themeMenu.classList.remove('visible');
}

// 启动应用
init();

