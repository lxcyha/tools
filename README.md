# Win Clipboard History

A lightweight Windows clipboard history tool built with Electron. It runs in the tray, watches the clipboard, and lets you search/paste recent text or images with a single shortcut.

[中文说明](README.zh-CN.md)

## Features

- Tray app with quick show/hide window.
- Global hotkey: `Ctrl+Shift+C`.
- Searchable history with keyboard navigation.
- Text and image history support.
- Auto-launch on Windows login (toggle from tray menu).
- One-click paste into the active app.

## Requirements

- Windows 10/11.
- Node.js 18+ recommended.

## Run (Dev)

```powershell
npm start
```

## Build (Windows)

```powershell
npm install
npm run dist
```

The installer will be created under `dist/`. Open the installer inside `dist/` to install.

## Usage

- Press `Ctrl+Shift+C` to open the history window.
- Type to search; use `↑/↓` to select.
- Press `Enter` to paste the selected item.
- Press `Esc` to hide the window.
- You can also click items with the mouse.

## Tray Menu

- Open window.
- Toggle auto-launch on login.
- Clear history.
- Quit.

## Notes

- The app polls the clipboard every 1 second and de-duplicates items.
- Text and image entries are stored via `electron-store` under your user data directory.
- Pasting uses a small VBScript (`paste.vbs`) and `cscript`, which are included with Windows.

## License

Non-commercial use only. See `LICENSE`.

## Author

lxcyha
