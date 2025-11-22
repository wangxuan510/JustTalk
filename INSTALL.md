# 安装指南

## 系统要求

- macOS 10.13 或更高版本
- Intel 芯片
- Node.js 16+ 和 npm
- Xcode Command Line Tools

## 安装步骤

### 1. 安装 Xcode Command Line Tools

```bash
xcode-select --install
```

### 2. 克隆或下载项目

```bash
cd /path/to/project
```

### 3. 安装依赖

```bash
npm install
```

**注意**: 如果遇到网络问题，可以尝试：

```bash
# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com
npm install
```

### 4. 配置 API Key

**步骤 1: 复制配置文件**

```bash
cp config.example.json config.json
```

**步骤 2: 获取 API Key**

1. 访问 https://dashscope.aliyuncs.com/
2. 注册/登录阿里云账号
3. 开通 DashScope 服务
4. 在控制台获取 API Key

**步骤 3: 编辑配置文件**

编辑 `config.json`，将 `your-dashscope-api-key-here` 替换为你的实际 API Key:

```json
{
  "funASR": {
    "apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxx",
    "url": "wss://dashscope.aliyuncs.com/api-ws/v1/inference",
    "model": "fun-asr-realtime"
  },
  "hotkeys": {
    "activate": "Command+2",
    "deactivate": "Command+2"
  }
}
```

**重要**: `config.json` 包含敏感信息，不要提交到 Git 仓库！

### 5. 编译 TypeScript

```bash
npm run build
```

### 6. 运行应用

**开发模式**:

```bash
npm run dev
```

**生产模式**:

```bash
npm start
```

### 7. 打包应用（可选）

```bash
npm run dist
```

生成的 .dmg 文件在 `dist` 目录下。

## 常见安装问题

### 问题 1: npm install 失败

**解决方案**:

1. 检查 Node.js 版本：`node --version`（需要 16+）
2. 清理缓存：`npm cache clean --force`
3. 删除 node_modules：`rm -rf node_modules`
4. 重新安装：`npm install`

### 问题 2: robotjs 编译失败

**解决方案**:

1. 确保已安装 Xcode Command Line Tools
2. 尝试：`npm install robotjs --build-from-source`

### 问题 3: electron 下载失败

**解决方案**:

1. 使用镜像：
```bash
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
npm install
```

### 问题 4: node-record-lpcm16 安装失败

**解决方案**:

1. 确保已安装 sox：`brew install sox`
2. 重新安装：`npm install node-record-lpcm16`

## 验证安装

运行以下命令验证安装：

```bash
# 检查 TypeScript 编译
npm run build

# 检查是否有编译错误
ls dist/main/

# 运行应用
npm run dev
```

如果一切正常，应该会看到应用启动并显示欢迎消息。

## 安全提示

- `config.json` 包含你的 API Key，已被 .gitignore 忽略
- 不要将 `config.json` 提交到公开仓库
- 如果不小心泄露了 API Key，请立即在阿里云控制台重置

## 下一步

安装完成后，请阅读 [USAGE.md](USAGE.md) 了解如何使用应用。
