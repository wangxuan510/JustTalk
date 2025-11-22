# 贡献指南

感谢你对本项目的关注！我们欢迎任何形式的贡献。

## 开始之前

1. Fork 本仓库
2. 克隆你的 Fork：
   ```bash
   git clone https://github.com/your-username/voice-to-text-tool.git
   cd voice-to-text-tool
   ```

3. 安装依赖：
   ```bash
   npm install
   ```

4. 配置开发环境：
   ```bash
   npm run setup
   # 然后编辑 config.json，填入你的 API Key
   ```

5. 验证配置：
   ```bash
   npm run check-config
   ```

## 开发流程

1. 创建新分支：
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. 进行开发和测试：
   ```bash
   npm run dev
   ```

3. 提交更改：
   ```bash
   git add .
   git commit -m "描述你的更改"
   ```

4. 推送到你的 Fork：
   ```bash
   git push origin feature/your-feature-name
   ```

5. 创建 Pull Request

## 代码规范

- 使用 TypeScript
- 遵循现有的代码风格
- 添加必要的注释
- 确保代码可以通过编译：`npm run build`

## 提交规范

提交信息格式：

```
<type>: <subject>

<body>
```

类型（type）：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

示例：
```
feat: 添加音量可视化功能

- 实时显示音量波形
- 根据音量调整指示器大小
```

## 安全注意事项

⚠️ **重要**: 不要在 PR 中包含以下内容：

- `config.json` 文件
- 任何 API Key 或密钥
- 个人敏感信息
- 包含 API Key 的日志或截图

如果需要分享配置，请使用 `config.example.json`。

## 测试

在提交 PR 之前，请确保：

1. 代码可以正常编译：
   ```bash
   npm run build
   ```

2. 应用可以正常运行：
   ```bash
   npm run dev
   ```

3. 没有明显的 bug 或错误

## 报告 Bug

提交 Issue 时，请包含：

1. 问题描述
2. 复现步骤
3. 预期行为
4. 实际行为
5. 系统信息（macOS 版本、Node.js 版本等）
6. 相关日志（**注意移除 API Key**）

## 功能建议

欢迎提出新功能建议！请在 Issue 中描述：

1. 功能描述
2. 使用场景
3. 预期效果
4. 可能的实现方案（可选）

## 文档贡献

文档改进同样重要！你可以：

- 修正错别字
- 改进说明
- 添加示例
- 翻译文档

## 问题讨论

如有疑问，可以：

1. 查看现有的 Issues
2. 创建新的 Issue
3. 在 PR 中讨论

## 行为准则

- 尊重他人
- 保持友善和专业
- 接受建设性批评
- 关注项目的最佳利益

## 许可证

贡献的代码将采用与项目相同的 MIT 许可证。

感谢你的贡献！🎉
