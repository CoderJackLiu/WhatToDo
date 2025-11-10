# 开发指南

## 开发环境设置

### 必备工具

1. **Node.js** (v16+)
2. **npm** (v7+)
3. **代码编辑器** (推荐 VSCode)
4. **Git** (用于版本控制)

### 推荐的 VSCode 插件

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "ritwickdey.LiveServer"
  ]
}
```

## 项目设置

### 1. 克隆项目

```bash
git clone <repository-url>
cd ToDoList
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发模式

```bash
npm start
```

### 4. 启用开发者工具

编辑 `main.js`:
```javascript
// 取消注释这一行
mainWindow.webContents.openDevTools();
```

## 项目结构详解

```
ToDoList/
├── main.js              # Electron 主进程
│   ├── 窗口创建和管理
│   ├── IPC 通信处理
│   ├── 文件系统操作
│   └── 应用生命周期
│
├── preload.js           # 预加载脚本
│   └── 安全的 API 桥接
│
├── renderer.js          # 渲染进程
│   ├── 待办事项逻辑
│   ├── DOM 操作
│   ├── 事件处理
│   └── 数据管理
│
├── index.html           # HTML 结构
│   ├── 标题栏
│   ├── 输入区域
│   ├── 待办列表
│   └── 底部统计
│
├── styles.css           # 样式文件
│   ├── 全局样式
│   ├── 组件样式
│   ├── 动画效果
│   └── 响应式设计
│
├── package.json         # 项目配置
│   ├── 依赖管理
│   ├── 脚本命令
│   └── 构建配置
│
└── 文档/
    ├── README.md
    ├── QUICKSTART.md
    ├── FEATURES.md
    ├── ARCHITECTURE.md
    ├── INSTALLATION.md
    └── DEVELOPMENT.md (本文件)
```

## 代码规范

### JavaScript 规范

```javascript
// ✅ 好的实践
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
  saveTodos();
  renderTodos();
}

// ❌ 避免的写法
function addTodo() {
  let text = todoInput.value.trim()
  if(!text)return
  todos.unshift({id:generateId(),text:text,completed:false,createdAt:Date.now(),updatedAt:Date.now()})
  saveTodos()
  renderTodos()
}
```

### 命名规范

```javascript
// 变量和函数：驼峰命名法
const todoInput = document.getElementById('todo-input');
function addTodo() { }

// 常量：大写下划线
const MAX_TODO_LENGTH = 500;
const DEFAULT_COLOR = '#667eea';

// 类名：帕斯卡命名法（如果使用类）
class TodoManager { }

// CSS 类名：横线连接
.todo-item { }
.todo-input { }
```

### 注释规范

```javascript
/**
 * 添加新的待办事项
 * @description 从输入框获取内容，创建新待办并保存
 * @returns {void}
 */
function addTodo() {
  // 获取并清理输入内容
  const text = todoInput.value.trim();
  
  // 验证输入
  if (!text) {
    return;
  }
  
  // 创建待办对象
  const newTodo = {
    id: generateId(),
    text: text,
    completed: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  // 添加到列表并保存
  todos.unshift(newTodo);
  saveTodos();
  renderTodos();
}
```

## 开发工作流

### 1. 新功能开发

```bash
# 创建功能分支
git checkout -b feature/new-feature

# 开发和测试
# ... 编写代码 ...

# 提交更改
git add .
git commit -m "feat: 添加新功能描述"

# 合并到主分支
git checkout main
git merge feature/new-feature
```

### 2. Bug 修复

```bash
# 创建修复分支
git checkout -b fix/bug-description

# 修复和测试
# ... 修复代码 ...

# 提交更改
git add .
git commit -m "fix: 修复 bug 描述"

# 合并到主分支
git checkout main
git merge fix/bug-description
```

### 3. 提交信息规范

```
feat: 新增功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整（不影响功能）
refactor: 代码重构
perf: 性能优化
test: 添加测试
chore: 构建工具或辅助工具的变动
```

示例：
```
feat: 添加搜索功能
fix: 修复删除动画不播放的问题
docs: 更新 README 安装说明
style: 统一代码缩进为 2 空格
refactor: 重构数据存储逻辑
perf: 优化列表渲染性能
test: 添加单元测试
chore: 更新 Electron 版本
```

## 调试技巧

### 1. 使用 Console 调试

```javascript
// 在 renderer.js 中
console.log('待办列表:', todos);
console.table(todos);  // 表格形式显示
console.time('render');
renderTodos();
console.timeEnd('render');  // 测量执行时间
```

### 2. 使用断点调试

在 Chrome DevTools 中：
1. 打开开发者工具 (F12)
2. 切换到 Sources 标签
3. 找到 `renderer.js`
4. 点击行号添加断点
5. 触发相关操作
6. 逐步执行代码

### 3. 调试主进程

在 `main.js` 中添加：
```javascript
console.log('主进程日志:', data);
```

查看终端输出（不是浏览器控制台）。

### 4. 调试 IPC 通信

```javascript
// 在 preload.js 中
contextBridge.exposeInMainWorld('electronAPI', {
  loadTodos: () => {
    console.log('调用 loadTodos');
    return ipcRenderer.invoke('load-todos');
  }
});

// 在 main.js 中
ipcMain.handle('load-todos', async () => {
  console.log('接收到 load-todos 请求');
  // ...
});
```

## 常见开发任务

### 添加新的 IPC 通信

**Step 1**: 在 `main.js` 添加处理器
```javascript
ipcMain.handle('new-action', async (event, data) => {
  // 处理逻辑
  return result;
});
```

**Step 2**: 在 `preload.js` 暴露 API
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  newAction: (data) => ipcRenderer.invoke('new-action', data)
});
```

**Step 3**: 在 `renderer.js` 调用
```javascript
async function doSomething() {
  const result = await window.electronAPI.newAction(data);
  console.log(result);
}
```

### 添加新的 UI 元素

**Step 1**: 在 `index.html` 添加 HTML
```html
<div class="new-element">
  <button id="new-button">新按钮</button>
</div>
```

**Step 2**: 在 `styles.css` 添加样式
```css
.new-element {
  padding: 10px;
}

#new-button {
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
}

#new-button:hover {
  opacity: 0.9;
}
```

**Step 3**: 在 `renderer.js` 添加逻辑
```javascript
const newButton = document.getElementById('new-button');

newButton.addEventListener('click', () => {
  console.log('按钮被点击');
  // 处理逻辑
});
```

### 修改数据结构

**Step 1**: 更新数据模型
```javascript
// 在 renderer.js 中
const newTodo = {
  id: generateId(),
  text: text,
  completed: false,
  priority: 'normal',  // 新增字段
  createdAt: Date.now(),
  updatedAt: Date.now()
};
```

**Step 2**: 更新渲染逻辑
```javascript
function renderTodos() {
  todos.forEach(todo => {
    // 显示优先级
    const priority = document.createElement('span');
    priority.className = 'todo-priority';
    priority.textContent = todo.priority;
    li.appendChild(priority);
  });
}
```

**Step 3**: 更新样式
```css
.todo-priority {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
}
```

### 添加新的配置选项

**Step 1**: 定义配置
```javascript
// 在 renderer.js 顶部
const config = {
  maxTodos: 100,
  autoSave: true,
  animationDuration: 300
};
```

**Step 2**: 使用配置
```javascript
if (todos.length >= config.maxTodos) {
  alert('待办事项已达上限');
  return;
}
```

**Step 3**: 保存配置（可选）
```javascript
// 保存到本地存储
localStorage.setItem('config', JSON.stringify(config));

// 加载配置
const savedConfig = localStorage.getItem('config');
if (savedConfig) {
  Object.assign(config, JSON.parse(savedConfig));
}
```

## 性能优化

### 1. 减少 DOM 操作

```javascript
// ❌ 差的做法
todos.forEach(todo => {
  const li = document.createElement('li');
  // ... 设置内容 ...
  todoList.appendChild(li);  // 每次都操作 DOM
});

// ✅ 好的做法
const fragment = document.createDocumentFragment();
todos.forEach(todo => {
  const li = document.createElement('li');
  // ... 设置内容 ...
  fragment.appendChild(li);
});
todoList.appendChild(fragment);  // 一次性操作 DOM
```

### 2. 使用事件委托

```javascript
// ❌ 差的做法
document.querySelectorAll('.delete-btn').forEach(btn => {
  btn.addEventListener('click', handleDelete);
});

// ✅ 好的做法
todoList.addEventListener('click', (e) => {
  if (e.target.classList.contains('delete-btn')) {
    handleDelete(e);
  }
});
```

### 3. 防抖和节流

```javascript
// 防抖：延迟执行
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// 节流：限制频率
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 使用
const debouncedSearch = debounce(searchTodos, 300);
searchInput.addEventListener('input', debouncedSearch);
```

### 4. 虚拟滚动（大量数据）

当待办项超过 100 个时考虑实现虚拟滚动。

## 测试

### 手动测试清单

**基础功能**:
- [ ] 添加待办
- [ ] 编辑待办
- [ ] 删除待办
- [ ] 标记完成
- [ ] 清除已完成

**边界情况**:
- [ ] 添加空内容
- [ ] 添加超长文本
- [ ] 快速连续操作
- [ ] 删除最后一项
- [ ] 数据文件不存在

**UI 测试**:
- [ ] 窗口拖动
- [ ] 窗口控制按钮
- [ ] 动画效果
- [ ] 响应式布局
- [ ] 滚动条

### 自动化测试（可选）

安装测试框架：
```bash
npm install --save-dev jest spectron
```

创建测试文件 `test/app.test.js`:
```javascript
const { Application } = require('spectron');

describe('TodoList App', () => {
  let app;

  beforeEach(() => {
    app = new Application({
      path: './node_modules/.bin/electron',
      args: ['.']
    });
    return app.start();
  });

  afterEach(() => {
    if (app && app.isRunning()) {
      return app.stop();
    }
  });

  test('显示窗口', async () => {
    const count = await app.client.getWindowCount();
    expect(count).toBe(1);
  });

  test('添加待办', async () => {
    await app.client.setValue('#todo-input', '测试待办');
    await app.client.click('#add-btn');
    const text = await app.client.getText('.todo-text');
    expect(text).toContain('测试待办');
  });
});
```

## 构建和打包

### 开发构建

```bash
npm start
```

### 生产构建

```bash
npm run build
```

### 自定义构建配置

编辑 `package.json`:
```json
{
  "build": {
    "appId": "com.electron.todolist",
    "productName": "TodoList",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": ["nsis", "portable"],
      "icon": "build/icon.ico"
    },
    "mac": {
      "target": ["dmg", "zip"],
      "icon": "build/icon.icns"
    },
    "linux": {
      "target": ["AppImage", "deb", "rpm"],
      "icon": "build/icon.png",
      "category": "Utility"
    }
  }
}
```

### 添加应用图标

创建图标文件：
- Windows: `build/icon.ico` (256x256)
- macOS: `build/icon.icns` (512x512)
- Linux: `build/icon.png` (512x512)

在线工具：
- https://www.iconfinder.com/
- https://iconverticons.com/online/

## 发布流程

### 1. 更新版本号

编辑 `package.json`:
```json
{
  "version": "1.0.1"
}
```

### 2. 更新 CHANGELOG

创建 `CHANGELOG.md`:
```markdown
## [1.0.1] - 2025-11-10

### Added
- 新增搜索功能

### Fixed
- 修复删除动画问题

### Changed
- 优化列表渲染性能
```

### 3. 构建所有平台

```bash
npm run build
```

### 4. 创建 GitHub Release

1. 创建 Git 标签
```bash
git tag v1.0.1
git push origin v1.0.1
```

2. 在 GitHub 创建 Release
3. 上传构建产物
4. 编写 Release Notes

## 常见问题

### Q: 如何调试主进程？

A: 使用 VSCode 调试配置或在终端查看 console.log 输出。

### Q: 如何热重载？

A: 安装 `electron-reload` 或使用 `nodemon`。

### Q: 如何减小安装包体积？

A: 
1. 移除未使用的依赖
2. 使用 `electron-builder` 的压缩选项
3. 不要打包开发依赖

### Q: 如何支持多语言？

A: 使用 i18n 库，如 `i18next`。

## 贡献指南

### 提交 Pull Request

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

### 代码审查标准

- 代码符合规范
- 功能完整测试
- 文档已更新
- 无 linter 错误
- 提交信息清晰

## 资源链接

### 官方文档
- [Electron 文档](https://www.electronjs.org/docs)
- [Node.js 文档](https://nodejs.org/docs)
- [MDN Web Docs](https://developer.mozilla.org/)

### 学习资源
- [Electron 官方教程](https://www.electronjs.org/docs/latest/tutorial/tutorial-prerequisites)
- [Electron 安全](https://www.electronjs.org/docs/latest/tutorial/security)
- [IPC 通信](https://www.electronjs.org/docs/latest/tutorial/ipc)

### 工具和库
- [electron-builder](https://www.electron.build/)
- [electron-reload](https://github.com/yan-foto/electron-reload)
- [electron-store](https://github.com/sindresorhus/electron-store)

## 下一步

- 🎨 尝试修改样式
- ⚙️ 添加新功能
- 📚 阅读 Electron 文档
- 🚀 构建你的第一个版本

---

**Happy Coding!** 💻✨

