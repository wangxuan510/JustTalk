# 快速启动指南

## 5 分钟快速开始

### 1. 安装依赖 (2 分钟)

```bash
# 确保已安装 Node.js 16+
node --version

# 安装项目依赖
npm install
```

如果遇到网络问题：

```bash
npm config set registry https://registry.npmmirror.com
npm install
```

### 2. 配置 API Key (1 分钟)

**获取 API Key**: 访问 https://dashscope.aliyuncs.com/ 注册并获取

**配置方式 1 - 环境变量（推荐）**:

```bash
export DASHSCOPE_API_KEY="your-api-key-here"
```

**配置方式 2 - 配置文件**:

编辑 `config.json`，填入你的 API Key：

```json
{
  "funASR": {
    "apiKey": "your-api-key-here"
  }
}
```

### 3. 编译并运行 (1 分钟)

```bash
# 编译 TypeScript
npm run build

# 运行应用
npm run dev
```

### 4. 开始使用 (1 分钟)

1. 应用启动后会显示欢迎消息
2. 点击任意输入框（如 TextEdit）
3. 按 `Cmd+Shift+V` 开始语音输入
4. 开始说话，文字会实时出现
5. 按 `Cmd+Shift+S` 停止

## 常见问题快速解决

### Q: npm install 失败？

```bash
# 清理并重试
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Q: 编译失败？

```bash
# 确保安装了 Xcode Command Line Tools
xcode-select --install

# 重新安装依赖
npm install
```

### Q: 没有识别结果？

1. 检查 API Key 是否正确
2. 检查网络连接
3. 确认麦克风权限已授予

### Q: 文字无法插入？

1. 确保输入框已获得焦点
2. 如果失败，文字会自动复制到剪贴板，手动粘贴即可

## 下一步

- 阅读 [USAGE.md](USAGE.md) 了解详细使用方法
- 阅读 [INSTALL.md](INSTALL.md) 了解完整安装步骤
- 查看 [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) 了解项目架构

## 需要帮助？

查看控制台日志：

```bash
npm run dev
```

然后查看终端输出的日志信息。
