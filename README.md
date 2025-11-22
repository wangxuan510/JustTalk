# 语音转文字工具

实时流式语音转文字工具，使用阿里 FunASR 服务，运行在 macOS 系统上。

## 功能特性

- 🎤 实时语音识别，边说边转文字
- ⌨️ 全局快捷键控制，无需切换窗口
- 📝 自动插入到任意输入框
- 🎯 简洁界面，不干扰工作流程
- 🔒 安全可靠，数据加密传输

## 系统要求

- macOS 10.13 或更高版本
- Intel 芯片
- 麦克风权限
- 网络连接

## 安装

1. 下载最新版本的 .dmg 文件
2. 双击安装
3. 配置 API Key（见下方）

## 配置

### 获取 API Key

1. 访问 [阿里云 DashScope](https://dashscope.aliyuncs.com/)
2. 注册并获取 API Key
3. 配置 API Key：

**方法 1：环境变量（推荐）**
```bash
export DASHSCOPE_API_KEY="your-api-key"
```

**方法 2：配置文件**
编辑 `config.json` 文件，填入 API Key：
```json
{
  "funASR": {
    "apiKey": "your-api-key"
  }
}
```

## 使用方法

1. 点击任意输入框，使其获得焦点
2. 按下 `Cmd+Shift+V` 激活语音识别
3. 开始说话，文字会实时出现在输入框中
4. 按下 `Cmd+Shift+S` 停止识别

## 快捷键

- **激活**: `Cmd+Shift+V`
- **停止**: `Cmd+Shift+S`

可在 `config.json` 中自定义快捷键。

## 开发

### 前置要求

- Node.js 16+
- npm 或 yarn
- macOS 10.13+

### 安装依赖

```bash
npm install
```

**注意**: 某些依赖（如 robotjs）需要编译原生模块，可能需要安装 Xcode Command Line Tools：

```bash
xcode-select --install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 打包

生成可分发的应用：

```bash
npm run dist
```

这将在 `dist` 目录下生成 .dmg 安装包。

### 调试

查看控制台输出：

```bash
npm run dev
```

然后在 Electron 窗口中按 `Cmd+Option+I` 打开开发者工具。

## 故障排查

### 无法识别语音

1. 检查 API Key 是否正确配置
2. 检查网络连接
3. 确认麦克风权限已授予
4. 查看控制台日志

### 快捷键不工作

1. 检查快捷键是否被其他应用占用
2. 尝试在 config.json 中修改快捷键
3. 重启应用

### 文字无法插入

1. 确保输入框已获得焦点
2. 尝试使用剪贴板粘贴（工具会自动复制）
3. 检查应用是否有辅助功能权限

## 依赖说明

- **electron**: 桌面应用框架
- **ws**: WebSocket 客户端
- **uuid**: 生成唯一 ID
- **node-record-lpcm16**: 音频录制
- **robotjs**: 键盘输入模拟

## 技术栈

- Electron
- TypeScript
- FunASR WebSocket API
- node-record-lpcm16
- @nut-tree/nut-js

## 许可证

MIT
