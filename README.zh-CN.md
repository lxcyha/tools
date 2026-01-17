# Win Clipboard History

一个基于 Electron 的轻量级 Windows 剪贴板历史工具。它常驻托盘，监听剪贴板，并通过快捷键快速搜索与粘贴最近的文本/图片记录。

[English](README.md)

## 功能特性

- 托盘应用，支持快速显示/隐藏窗口
- 全局快捷键：`Ctrl+Shift+C`
- 历史记录搜索与键盘导航
- 支持文本与图片记录
- 支持开机自启（托盘菜单可开关）
- 一键粘贴到当前应用

## 环境要求

- Windows 10/11
- Node.js 18+（推荐）

## 运行（开发）

```powershell
npm start
```

## 构建（Windows）

```powershell
npm install
npm run dist
```

安装包会生成在 `dist/` 目录下，进入 `dist/` 运行安装程序完成安装。

## 使用方式

- 按 `Ctrl+Shift+C` 打开历史窗口
- 输入关键词搜索，使用 `↑/↓` 选择
- 按 `Enter` 粘贴选中项
- 按 `Esc` 隐藏窗口
- 也可以用鼠标点击条目

## 托盘菜单

- 打开窗口
- 切换开机自启
- 清空历史
- 退出

## 说明

- 应用每 1 秒轮询剪贴板，并对内容去重
- 文本和图片记录通过 `electron-store` 存储在用户数据目录
- 粘贴动作通过 `paste.vbs` 与 `cscript` 实现（Windows 自带）

## 许可证

仅允许非商用。详见 `LICENSE`。

## 作者

lxcyha
