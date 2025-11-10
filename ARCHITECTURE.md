# 架构设计文档

## 系统架构概览

```
┌─────────────────────────────────────────────────────┐
│                   Electron 应用                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐         ┌──────────────┐         │
│  │  主进程       │◄───IPC──►│  渲染进程     │         │
│  │  (main.js)   │         │ (renderer.js)│         │
│  └──────┬───────┘         └──────┬───────┘         │
│         │                         │                 │
│         │                         │                 │
│  ┌──────▼───────┐         ┌──────▼───────┐         │
│  │  文件系统     │         │   DOM/UI     │         │
│  │  (todos.json)│         │  (index.html)│         │
│  └──────────────┘         └──────────────┘         │
│         │                         │                 │
│         │                  ┌──────▼───────┐         │
│         └─────────────────►│   样式层      │         │
│                            │ (styles.css) │         │
│                            └──────────────┘         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## 核心模块

### 1. 主进程 (main.js)

**职责**：
- 应用生命周期管理
- 窗口创建和配置
- 文件系统操作
- IPC 通信处理

**关键函数**：

```javascript
// 窗口管理
createWindow()        // 创建主窗口
createTray()          // 创建系统托盘（可选）

// 数据操作
ensureDataDir()       // 确保数据目录存在
load-todos (IPC)      // 加载待办数据
save-todos (IPC)      // 保存待办数据

// 窗口控制
minimize-window (IPC) // 最小化窗口
close-window (IPC)    // 关闭窗口
```

**设计决策**：
- 使用无边框窗口实现自定义标题栏
- 禁用 Node Integration 提升安全性
- 使用 Context Isolation 隔离上下文
- 数据存储在用户数据目录

### 2. 预加载脚本 (preload.js)

**职责**：
- 提供安全的 IPC 桥接
- 暴露有限的 API 给渲染进程
- 隔离主进程和渲染进程

**暴露的 API**：

```javascript
window.electronAPI = {
  loadTodos()           // 加载数据
  saveTodos(data)       // 保存数据
  minimizeWindow()      // 最小化窗口
  closeWindow()         // 关闭窗口
  getUserDataPath()     // 获取用户数据路径
}
```

**安全措施**：
- 使用 contextBridge 安全暴露 API
- 只暴露必要的功能
- 参数验证在主进程进行

### 3. 渲染进程 (renderer.js)

**职责**：
- 用户界面逻辑
- 待办事项 CRUD 操作
- 事件处理
- 状态管理

**核心数据结构**：

```javascript
todos = [
  {
    id: String,          // 唯一标识符
    text: String,        // 待办内容
    completed: Boolean,  // 完成状态
    createdAt: Number,   // 创建时间戳
    updatedAt: Number    // 更新时间戳
  }
]
```

**核心函数**：

```javascript
// 生命周期
init()                   // 初始化应用
loadTodos()              // 加载数据
saveTodos()              // 保存数据

// 数据操作
addTodo()                // 添加待办
toggleTodo(id)           // 切换完成状态
deleteTodo(id)           // 删除待办
editTodo(id, text)       // 编辑待办
clearCompleted()         // 清除已完成

// UI 相关
renderTodos()            // 渲染列表
startEdit(id)            // 开始编辑
updateCount()            // 更新计数
formatTime(timestamp)    // 格式化时间

// 事件绑定
bindEvents()             // 绑定所有事件
```

**状态管理**：
- 单一数据源 (`todos` 数组)
- 修改后立即保存和渲染
- 无复杂状态管理库

### 4. 用户界面 (index.html)

**结构**：

```html
└── body
    ├── titlebar (自定义标题栏)
    │   ├── titlebar-drag-region (可拖动区域)
    │   └── titlebar-controls (窗口控制按钮)
    └── container (主容器)
        ├── input-section (输入区)
        │   ├── todo-input (输入框)
        │   └── add-btn (添加按钮)
        ├── todos-container (列表容器)
        │   └── todo-list (待办列表)
        │       └── todo-item (待办项) ×N
        │           ├── checkbox (复选框)
        │           ├── todo-text (文本)
        │           └── delete-btn (删除按钮)
        └── footer (底部栏)
            ├── todo-count (计数)
            └── clear-completed (清除按钮)
```

**设计原则**：
- 语义化 HTML 标签
- 清晰的 class 命名
- 最小化嵌套层级
- 无内联样式

### 5. 样式层 (styles.css)

**组织结构**：

```css
/* 全局样式 */
* { ... }
body { ... }

/* 标题栏 */
.titlebar { ... }
.titlebar-button { ... }

/* 主容器 */
.container { ... }

/* 输入区 */
.input-section { ... }
.todo-input { ... }
.add-btn { ... }

/* 列表区 */
.todos-container { ... }
.todo-list { ... }
.todo-item { ... }

/* 底部 */
.footer { ... }

/* 动画 */
@keyframes slideIn { ... }
@keyframes slideOut { ... }
```

**设计系统**：

- **配色方案**:
  - 主色: `#667eea` → `#764ba2` (渐变)
  - 背景: `#f5f5f5`
  - 文字: `#333` / `#666` / `#999`
  - 白色: `#ffffff`
  - 危险色: `#ff6b6b`

- **间距系统**:
  - 4px, 8px, 10px, 12px, 14px, 16px, 20px

- **圆角**:
  - 小: 4px
  - 中: 6px
  - 大: 8px

- **阴影**:
  - 小: `0 2px 8px rgba(0, 0, 0, 0.05)`
  - 中: `0 4px 12px rgba(0, 0, 0, 0.1)`
  - 大: `0 4px 12px rgba(102, 126, 234, 0.4)`

- **过渡时间**:
  - 快速: 0.2s
  - 标准: 0.3s

## 数据流

### 添加待办事项

```
用户输入 → Enter 键/点击按钮
    ↓
renderer.js: addTodo()
    ↓
生成新待办对象 (带 ID 和时间戳)
    ↓
添加到 todos 数组
    ↓
renderer.js: saveTodos()
    ↓
preload.js: electronAPI.saveTodos()
    ↓
main.js: IPC 处理 'save-todos'
    ↓
写入 JSON 文件
    ↓
renderer.js: renderTodos()
    ↓
更新 DOM
```

### 加载数据流程

```
应用启动
    ↓
renderer.js: init()
    ↓
renderer.js: loadTodos()
    ↓
preload.js: electronAPI.loadTodos()
    ↓
main.js: IPC 处理 'load-todos'
    ↓
读取 JSON 文件
    ↓
返回数据到渲染进程
    ↓
更新 todos 数组
    ↓
renderer.js: renderTodos()
    ↓
显示待办列表
```

## IPC 通信

### 通信方式

| 方向 | 方法 | 用途 |
|------|------|------|
| 渲染 → 主 | `invoke` | 加载/保存数据 (异步，有返回值) |
| 渲染 → 主 | `send` | 窗口控制 (单向，无返回值) |

### 消息列表

| 频道名称 | 类型 | 参数 | 返回值 | 说明 |
|---------|------|------|--------|------|
| `load-todos` | invoke | 无 | `{todos: []}` | 加载待办数据 |
| `save-todos` | invoke | `{todos: []}` | `{success: boolean}` | 保存待办数据 |
| `minimize-window` | send | 无 | 无 | 最小化窗口 |
| `close-window` | send | 无 | 无 | 关闭窗口 |
| `get-user-data-path` | invoke | 无 | `string` | 获取用户数据路径 |

## 文件系统

### 目录结构

```
用户数据目录/
├── data/
│   └── todos.json
└── (其他 Electron 文件)
```

### 数据文件格式

```json
{
  "todos": [
    {
      "id": "labc123def",
      "text": "完成项目文档",
      "completed": false,
      "createdAt": 1699999999999,
      "updatedAt": 1699999999999
    }
  ]
}
```

### 数据持久化策略

- **写入时机**: 每次 CRUD 操作后立即写入
- **错误处理**: 失败时记录日志，不阻塞 UI
- **初始化**: 文件不存在时自动创建空数据文件
- **备份**: 用户可手动复制 JSON 文件备份

## 错误处理

### 主进程错误处理

```javascript
try {
  // 文件操作
} catch (error) {
  console.error('Error:', error);
  return { success: false, error: error.message };
}
```

### 渲染进程错误处理

```javascript
try {
  // 数据操作
} catch (error) {
  console.error('操作失败:', error);
  // 可选：显示用户提示
}
```

## 性能优化

### 已实现

1. **最小化 DOM 操作**
   - 使用 `innerHTML` 批量更新
   - 动画使用 CSS 而非 JS

2. **事件委托**
   - 列表项事件绑定在容器上
   - 减少事件监听器数量

3. **懒加载**
   - 仅在需要时读取文件
   - 数据缓存在内存中

### 可优化项

1. **虚拟滚动**
   - 当待办项超过 100 个时考虑实现

2. **防抖节流**
   - 搜索功能添加防抖
   - 保存操作添加节流

3. **Web Workers**
   - 大量数据处理移至 Worker

## 安全性

### 已实施措施

1. **Context Isolation**: 启用
2. **Node Integration**: 禁用
3. **Remote Module**: 不使用
4. **Content Security Policy**: 可添加
5. **IPC 白名单**: 仅暴露必要 API

### 建议改进

1. 添加 CSP 头
2. 输入验证和清理
3. 文件路径白名单
4. 加密敏感数据

## 测试策略

### 单元测试

- 测试 `renderer.js` 中的纯函数
- 测试数据模型转换
- 测试 ID 生成器

### 集成测试

- 测试 IPC 通信
- 测试文件读写
- 测试窗口创建

### E2E 测试

- 使用 Spectron 或 Playwright
- 测试完整用户流程
- 测试错误场景

## 扩展点

### 1. 插件系统

```javascript
// 定义插件接口
interface Plugin {
  name: string;
  onTodoAdded?: (todo) => void;
  onTodoCompleted?: (todo) => void;
  // ...
}
```

### 2. 主题系统

```javascript
// 主题配置
const themes = {
  light: { /* 配色 */ },
  dark: { /* 配色 */ },
  custom: { /* 用户自定义 */ }
}
```

### 3. 存储抽象层

```javascript
// 抽象存储接口
class Storage {
  load() { /* 实现 */ }
  save(data) { /* 实现 */ }
}

// 可切换实现：JSON, SQLite, IndexedDB, Cloud
```

## 开发指南

### 新增功能流程

1. 修改数据模型（如需要）
2. 更新 IPC 通信（如需要）
3. 实现 UI 组件
4. 添加事件处理
5. 实现业务逻辑
6. 更新样式
7. 测试功能
8. 更新文档

### 代码规范

- 使用 2 空格缩进
- 函数命名使用驼峰命名法
- 类名使用横线连接
- 添加必要注释
- 保持函数简短（< 50 行）

### Git 提交规范

```
feat: 新增功能
fix: 修复 bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

## 部署

### 打包配置

在 `package.json` 中配置：

```json
"build": {
  "appId": "com.electron.todolist",
  "productName": "TodoList",
  "win": {
    "target": ["nsis"],
    "icon": "build/icon.ico"
  }
}
```

### 发布流程

1. 更新版本号
2. 运行 `npm run build`
3. 测试生成的安装包
4. 创建 GitHub Release
5. 上传安装包

## 维护

### 依赖更新

定期更新依赖：
```bash
npm outdated          # 检查过期依赖
npm update           # 更新依赖
```

### 安全审计

```bash
npm audit            # 安全检查
npm audit fix        # 自动修复
```

## 参考资料

- [Electron 官方文档](https://www.electronjs.org/docs)
- [IPC 通信指南](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [安全最佳实践](https://www.electronjs.org/docs/latest/tutorial/security)
- [打包和分发](https://www.electronjs.org/docs/latest/tutorial/application-distribution)

