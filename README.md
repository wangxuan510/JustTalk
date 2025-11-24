# 🎤 JustTalk - 语音转文字工具

<div align="center">

一个简单易用的 macOS 语音转文字工具，支持全局快捷键激活，实时语音识别并自动输入到任何应用中。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://www.apple.com/macos/)
[![Electron](https://img.shields.io/badge/Electron-28.0.0-blue.svg)](https://www.electronjs.org/)

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [使用方法](#-使用方法) • [开发指南](#-开发指南) • [贡献](#-贡献)

</div>

---

## ✨ 功能特性

- 🚀 **一键激活** - 使用 `Command + 2` 快捷键，随时随地启动语音输入
- 🎯 **全局输入** - 支持任何应用（浏览器、备忘录、微信、Slack 等）
- 🧠 **智能识别** - 基于阿里云 DashScope FunASR，识别准确率高
- 🔄 **实时转换** - 边说边显示，即时反馈
- 🎨 **简洁界面** - 托盘应用，不占用桌面空间
- 📊 **状态指示** - 识别状态可视化
- 🔒 **隐私安全** - API Key 本地存储，数据不留存
- ⚙️ **自定义配置** - 可自定义快捷键和服务配置

## 🚀 快速开始

### 系统要求

- macOS 10.13 或更高版本
- Intel 芯片 Mac
- Node.js 18+
- 互联网连接
- 麦克风权限

### 从源码构建

1. **克隆仓库**
   ```bash
   git clone https://github.com/wangxuan510/JustTalk.git
   cd JustTalk
   ```

2. **安装依赖**
   ```bash
   npm install
   npx electron-rebuild
   ```

3. **配置 API Key**
   ```bash
   cp config.example.json config.json
   # 编辑 config.json，填入你的阿里云 DashScope API Key
   ```
   
   访问 [阿里云 DashScope](https://dashscope.aliyuncs.com/) 获取 API Key

4. **运行应用**
   ```bash
   npm run dev
   ```

5. **打包应用（可选）**
   ```bash
   npm run dist:mac-intel
   # 打包后的 DMG 文件在 release/ 目录
   ```

### 首次使用

1. 应用启动后，托盘会显示图标
2. 点击托盘图标 → 配置，确认 API Key 已正确配置
3. 授予麦克风权限（首次使用时会提示）
4. 开始使用语音输入功能

## 💡 使用方法

### 基本使用

1. 点击任意文本输入框
2. 按 `Command + 2` 开始录音
3. 开始说话，文字会实时输入
4. 再按 `Command + 2` 停止录音

### 自定义快捷键

1. 点击托盘图标 → 配置
2. 在快捷键设置中点击"录制"
3. 按下你想要的快捷键组合
4. 点击保存

### 使用场景

| 场景 | 应用示例 | 使用方法 |
|------|----------|----------|
| 📝 写作 | 备忘录、Pages | 快速记录想法和灵感 |
| 📧 邮件 | Mail、Outlook | 语音回复邮件 |
| 💬 聊天 | 微信、QQ、Slack | 快速回复消息 |
| 🔍 搜索 | Safari、Chrome | 语音搜索关键词 |
| 📊 办公 | Excel、Numbers | 快速输入数据 |
| 🎓 学习 | Notion、Obsidian | 语音做笔记 |

## 🛠️ 开发指南

### 环境准备

```bash
# 克隆仓库
git clone https://github.com/wangxuan510/JustTalk.git
cd JustTalk

# 安装依赖
npm install

# 重建原生模块
npx electron-rebuild

# 配置 API Key
cp config.example.json config.json
# 编辑 config.json，填入你的 API Key
```

### 开发命令

```bash
# 开发模式（带配置检查）
npm run dev

# 编译 TypeScript
npm run build

# 运行编译后的应用
npm start

# 打包应用
npm run dist:mac-intel    # Intel Mac
npm run dist:mac-arm      # Apple Silicon
npm run dist:universal    # 通用版本
```

### 项目结构

```
JustTalk/
├── src/
│   ├── main/              # 主进程
│   │   ├── index.ts       # 应用入口
│   │   ├── AppStateManager.ts    # 状态管理
│   │   ├── AudioCapture.ts       # 音频录制
│   │   ├── FunASRClient.ts       # WebSocket 客户端
│   │   ├── TextInjector.ts       # 文本注入
│   │   ├── ConfigManager.ts      # 配置管理
│   │   ├── HotkeyManager.ts      # 快捷键管理
│   │   └── StatusIndicator.ts    # 状态指示器
│   ├── renderer/          # 渲染进程
│   │   ├── config.html    # 配置界面
│   │   └── config.js      # 配置逻辑
│   ├── preload/           # Preload 脚本
│   └── types/             # TypeScript 类型定义
├── scripts/               # 构建脚本
├── dist/                  # 编译输出
└── release/               # 打包输出
```

### 技术栈

- **框架**: Electron 28.0.0
- **语言**: TypeScript 5.3.3
- **语音识别**: 阿里云 DashScope FunASR
- **音频录制**: node-record-lpcm16
- **自动化**: robotjs
- **构建**: electron-builder

## 🔧 配置说明

### 配置文件位置

- **开发模式**: `./config.json`
- **生产模式**: `~/Library/Application Support/VoiceToText/config.json`

### 配置文件格式

```json
{
  "funASR": {
    "apiKey": "sk-your-api-key-here",
    "url": "wss://dashscope.aliyuncs.com/api-ws/v1/inference",
    "model": "fun-asr-realtime"
  },
  "hotkeys": {
    "activate": "Command+2",
    "deactivate": "Command+2"
  },
  "audio": {
    "sampleRate": 16000,
    "channels": 1,
    "bitDepth": 16,
    "encoding": "signed-integer"
  },
  "ui": {
    "indicatorPosition": "top-right"
  }
}
```

## ❓ 常见问题

### Q: 应用无法打开？
**A**: 右键点击应用 → 打开，或在终端运行：
```bash
xattr -cr /Applications/VoiceToText.app
```

### Q: 按快捷键没反应？
**A**: 检查：
- 是否配置了 API Key
- 是否点击了输入框
- 快捷键是否被其他应用占用
- 是否授予了麦克风权限

### Q: 识别不准确？
**A**: 改善识别效果：
- 说话清晰，语速适中
- 保持环境安静
- 麦克风距离适中（20-30cm）
- 使用普通话

### Q: 如何卸载？
**A**: 
1. 退出应用
2. 将 `/Applications/VoiceToText.app` 拖到废纸篓
3. 删除配置文件（可选）：
```bash
rm -rf ~/Library/Application\ Support/VoiceToText/
```

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

### 贡献方式

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发规范

- 使用 TypeScript 严格模式
- 遵循现有代码风格
- 添加必要的注释
- 更新相关文档

## 📝 更新日志

### v1.0.0 (2024-11-24)

- 🎉 首次发布
- ✨ 支持实时语音识别
- ✨ 全局快捷键激活
- ✨ 自动文本输入
- ✨ 可视化状态指示器
- ✨ 自定义快捷键配置

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [阿里云 DashScope](https://dashscope.aliyuncs.com/) - 语音识别服务
- [robotjs](https://github.com/octalmage/robotjs) - 桌面自动化
- [node-record-lpcm16](https://github.com/gillesdemey/node-record-lpcm16) - 音频录制

## 📮 联系方式

- 问题反馈: [GitHub Issues](https://github.com/wangxuan510/JustTalk/issues)
- 功能建议: [GitHub Discussions](https://github.com/wangxuan510/JustTalk/discussions)

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！**

Made with ❤️ for macOS users

</div>
