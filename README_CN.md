# Electron TodoList - 分组管理版

一个功能强大的 TodoList 桌面应用，支持分组管理和多窗口操作。

[English](./README.md) | [中文版](./README_CN.md)

![Version](https://img.shields.io/badge/version-2.3.1-blue)
![Electron](https://img.shields.io/badge/Electron-27.0.0-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## ✨ 核心功能

- **📋 分组管理** - 创建多个待办分组，分类管理任务
- **🪟 多窗口支持** - 每个分组独立窗口，可同时打开多个
- **📌 窗口置顶** - 分组窗口可以固定在最前面
- **💾 自动保存** - 所有操作自动保存，数据永不丢失
- **🔔 系统托盘** - 关闭窗口最小化到托盘
- **⚡ 本地缓存** - 智能缓存机制，极速响应
- **🔄 实时同步** - 多设备数据实时同步，保持一致

## 🚀 快速开始

### 系统要求

- Node.js >= 16.0.0
- Windows 10 或更高版本

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

## 🛠️ 技术栈

- Electron 27.0.0
- HTML5 / CSS3 / JavaScript
- Node.js
- Supabase (认证和数据同步)

## 📚 相关文档

- [更新日志](./docs/CHANGELOG.md)

## 📜 许可证

MIT License

