# Electron TodoList - 分组管理版

一个功能强大的 TodoList 桌面应用，支持分组管理和多窗口操作。

![Version](https://img.shields.io/badge/version-2.3-blue)
![Electron](https://img.shields.io/badge/Electron-27.0.0-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## ✨ 核心功能

- **📋 分组管理** - 创建多个待办分组，分类管理任务
- **🪟 多窗口支持** - 每个分组独立窗口，可同时打开多个
- **📌 窗口置顶** - 分组窗口可以固定在最前面
- **💾 自动保存** - 所有操作自动保存，数据永不丢失
- **🔔 系统托盘** - 关闭窗口最小化到托盘

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 运行应用
```bash
npm start
```

### 打包应用
```bash
npm run build
```

## 📖 使用说明

- **创建分组** - 输入分组名称后按 Enter
- **打开分组** - 点击分组在独立窗口中打开
- **添加待办** - 在分组窗口中输入内容后按 Enter
- **编辑** - 双击文本内容进行编辑
- **删除分组** - 点击"管理模式"按钮后删除

## ⚙️ Supabase 配置

**重要**：为了邮箱确认功能正常工作，需要在 Supabase Dashboard 中配置：

### 1. 配置重定向 URL

1. 登录 Supabase Dashboard
2. 进入 **Authentication** > **URL Configuration**
3. 在 "Redirect URLs" 中添加：`com.electron.todolist://auth/callback`
4. 保存配置

### 2. 邮件服务配置

**注意**：Supabase 默认的 SMTP 服务器主要用于测试，有以下限制：
- 有严格的发送频率限制（每小时少量邮件）
- 可能无法发送到某些邮箱服务商
- 邮件可能被标记为垃圾邮件

**建议**：
- 开发/测试环境：使用默认 SMTP，检查垃圾邮件文件夹
- 生产环境：配置自定义 SMTP 服务器（在 Authentication > Email Templates 中配置）

如果收不到邮件：
1. 检查垃圾邮件文件夹
2. 等待几分钟后重试（避免频率限制）
3. 尝试使用其他邮箱地址
4. 检查 Supabase Dashboard 的邮件发送日志

## 🛠️ 技术栈

- Electron 27.0.0
- HTML5 / CSS3 / JavaScript
- Node.js
- Supabase (认证和数据同步)

## 📜 许可证

MIT License
