# 使用说明

## 快速开始

### 1. 配置 API Key

在使用前，需要配置阿里云 DashScope 的 API Key。

**方法 1：环境变量（推荐）**

在终端中设置：

```bash
export DASHSCOPE_API_KEY="your-api-key-here"
```

或者添加到 `~/.zshrc` 或 `~/.bash_profile` 中：

```bash
echo 'export DASHSCOPE_API_KEY="your-api-key-here"' >> ~/.zshrc
source ~/.zshrc
```

**方法 2：配置文件**

编辑应用目录下的 `config.json` 文件：

```json
{
  "funASR": {
    "apiKey": "your-api-key-here"
  }
}
```

### 2. 授予权限

首次运行时，系统会请求以下权限：

- **麦克风权限**: 用于录制语音
- **辅助功能权限**（可选）: 用于模拟键盘输入

如果权限被拒绝，可以在"系统偏好设置" > "安全性与隐私" > "隐私"中手动授予。

### 3. 开始使用

1. 启动应用
2. 点击任意输入框（TextEdit、浏览器、VS Code 等）
3. 按下 `Cmd+Shift+V` 开始语音输入
4. 开始说话，文字会实时出现
5. 按下 `Cmd+Shift+S` 停止语音输入

## 功能说明

### 状态指示器

应用运行时，屏幕右上角会显示一个小圆圈：

- 🎤 **紫色脉冲**: 正在监听语音
- ⚡ **粉色旋转**: 正在处理识别结果
- ❌ **红色抖动**: 发生错误

### 快捷键

| 功能 | 默认快捷键 | 说明 |
|------|-----------|------|
| 激活 | `Cmd+Shift+V` | 开始语音识别 |
| 停止 | `Cmd+Shift+S` | 停止语音识别 |

可以在 `config.json` 中自定义快捷键。

### 配置选项

编辑 `config.json` 文件可以自定义以下选项：

```json
{
  "funASR": {
    "apiKey": "",                    // API Key
    "url": "wss://...",              // FunASR 服务地址（通常不需要修改）
    "model": "fun-asr-realtime"      // 识别模型
  },
  "hotkeys": {
    "activate": "CommandOrControl+Shift+V",    // 激活快捷键
    "deactivate": "CommandOrControl+Shift+S"   // 停止快捷键
  },
  "audio": {
    "sampleRate": 16000,             // 采样率（不要修改）
    "channels": 1,                   // 声道数（不要修改）
    "bitDepth": 16,                  // 位深度（不要修改）
    "encoding": "signed-integer"     // 编码（不要修改）
  },
  "ui": {
    "indicatorPosition": "top-right" // 指示器位置：top-right, top-left, bottom-right, bottom-left
  }
}
```

## 支持的应用

理论上支持所有可以接收键盘输入的应用，包括但不限于：

- TextEdit
- Pages
- Microsoft Word
- Google Chrome / Safari / Firefox
- VS Code
- Slack
- 微信
- 钉钉
- 等等...

## 常见问题

### Q: 为什么没有识别结果？

A: 请检查：
1. API Key 是否正确配置
2. 网络连接是否正常
3. 麦克风是否正常工作
4. 是否授予了麦克风权限

### Q: 文字无法插入到输入框？

A: 请确保：
1. 输入框已获得焦点（光标在闪烁）
2. 应用有辅助功能权限
3. 如果仍然失败，工具会自动将文字复制到剪贴板，可以手动粘贴（Cmd+V）

### Q: 快捷键不工作？

A: 可能的原因：
1. 快捷键被其他应用占用
2. 尝试修改 config.json 中的快捷键
3. 重启应用

### Q: 识别不准确？

A: 建议：
1. 在安静的环境中使用
2. 说话清晰，语速适中
3. 麦克风距离嘴巴 10-30cm
4. 使用质量较好的麦克风

### Q: 如何查看日志？

A: 在开发模式下运行：

```bash
npm run dev
```

然后查看终端输出。

## 技术支持

如遇问题，请提供以下信息：

1. macOS 版本
2. 应用版本
3. 错误信息或日志
4. 复现步骤

## 隐私说明

- 音频数据仅发送到阿里云 FunASR 服务进行识别
- 不在本地存储任何音频或识别结果
- API Key 仅用于认证，不会被上传或分享
- 遵守阿里云 DashScope 的隐私政策

## 费用说明

FunASR 服务按使用时长计费：

- 单价：0.00033 元/秒
- 免费额度：36,000 秒（10 小时）
- 有效期：开通后 90 天

详情请参考：https://dashscope.aliyuncs.com/

## 更新日志

### v1.0.0 (2025-11-21)

- 首次发布
- 支持实时语音转文字
- 支持全局快捷键控制
- 支持 macOS Intel 芯片
