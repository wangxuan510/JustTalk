# 贡献指南

感谢你考虑为 VoiceToText 做出贡献！

## 行为准则

参与本项目即表示你同意遵守我们的行为准则：

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

## 如何贡献

### 报告 Bug

在提交 Bug 报告之前，请：

1. 检查 [Issues](https://github.com/yourusername/voice-to-text-tool/issues) 中是否已有相同问题
2. 确保你使用的是最新版本
3. 收集相关信息（系统版本、应用版本、错误日志等）

提交 Bug 时，请包含：

- **清晰的标题**：简洁描述问题
- **详细描述**：问题的具体表现
- **重现步骤**：如何触发这个问题
- **预期行为**：你期望发生什么
- **实际行为**：实际发生了什么
- **环境信息**：
  - macOS 版本
  - 应用版本
  - 相关配置
- **截图/日志**：如果适用

### 提出功能建议

我们欢迎新功能建议！请：

1. 检查 [Issues](https://github.com/yourusername/voice-to-text-tool/issues) 和 [Discussions](https://github.com/yourusername/voice-to-text-tool/discussions) 中是否已有类似建议
2. 清楚地描述功能和使用场景
3. 解释为什么这个功能对用户有价值
4. 如果可能，提供实现思路

### 提交代码

#### 开发流程

1. **Fork 仓库**
   ```bash
   # 在 GitHub 上点击 Fork 按钮
   ```

2. **克隆你的 Fork**
   ```bash
   git clone https://github.com/your-username/voice-to-text-tool.git
   cd voice-to-text-tool
   ```

3. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/your-bug-fix
   ```

4. **安装依赖**
   ```bash
   npm install
   npx electron-rebuild
   ```

5. **配置开发环境**
   ```bash
   cp config.example.json config.json
   # 编辑 config.json，填入你的 API Key
   ```

6. **进行更改**
   - 编写代码
   - 添加注释
   - 遵循代码规范

7. **测试更改**
   ```bash
   npm run dev
   ```

8. **提交更改**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

9. **推送到 GitHub**
   ```bash
   git push origin feature/your-feature-name
   ```

10. **创建 Pull Request**
    - 在 GitHub 上打开你的 Fork
    - 点击 "New Pull Request"
    - 填写 PR 描述

#### 代码规范

**TypeScript**
- 使用 TypeScript 严格模式
- 为所有函数添加类型注解
- 使用接口定义复杂类型
- 避免使用 `any` 类型

**命名规范**
- 类名：PascalCase（如 `AppStateManager`）
- 函数/变量：camelCase（如 `loadConfig`）
- 常量：UPPER_SNAKE_CASE（如 `MAX_BUFFER_SIZE`）
- 私有成员：以 `_` 开头（如 `_config`）

**注释**
- 为所有公共 API 添加 JSDoc 注释
- 复杂逻辑添加行内注释
- 使用中文注释

**示例**
```typescript
/**
 * 加载配置文件
 * @returns 配置对象
 * @throws 配置加载失败时抛出错误
 */
public loadConfig(): AppConfig {
  try {
    // 读取配置文件
    const configData = fs.readFileSync(this.configPath, 'utf-8');
    this.config = JSON.parse(configData);
    
    // 验证配置
    this.validateConfig(this.config);
    
    return this.config;
  } catch (error) {
    throw new Error(`配置加载失败: ${error.message}`);
  }
}
```

#### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例**
```
feat(audio): add volume normalization

- Implement automatic gain control
- Add volume level indicator
- Update audio processing pipeline

Closes #123
```

#### Pull Request 指南

**PR 标题**
- 使用清晰、描述性的标题
- 遵循提交信息规范

**PR 描述**
- 说明更改的内容和原因
- 列出相关的 Issue
- 添加截图（如果适用）
- 说明测试情况

**PR 模板**
```markdown
## 更改类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 重构
- [ ] 文档更新
- [ ] 其他

## 更改说明
<!-- 描述你的更改 -->

## 相关 Issue
<!-- 关联的 Issue，如 Closes #123 -->

## 测试
<!-- 如何测试这些更改 -->

## 截图
<!-- 如果适用，添加截图 -->

## 检查清单
- [ ] 代码遵循项目规范
- [ ] 添加了必要的注释
- [ ] 更新了相关文档
- [ ] 本地测试通过
- [ ] 没有引入新的警告
```

### 文档贡献

文档同样重要！你可以：

- 修正拼写/语法错误
- 改进现有文档
- 添加示例和教程
- 翻译文档

## 开发环境

### 推荐工具

- **编辑器**: VS Code
- **插件**:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features

### 调试

**主进程调试**
```bash
npm start -- --inspect
```

**渲染进程调试**
- 在应用中按 `Cmd+Option+I` 打开开发者工具

## 发布流程

（仅维护者）

1. 更新版本号
   ```bash
   npm version patch|minor|major
   ```

2. 更新 CHANGELOG.md

3. 提交更改
   ```bash
   git add .
   git commit -m "chore: release v1.x.x"
   git push
   ```

4. 创建 Tag
   ```bash
   git tag v1.x.x
   git push --tags
   ```

5. 构建发布版本
   ```bash
   npm run dist
   ```

6. 在 GitHub 上创建 Release

## 获取帮助

如果你有任何问题：

- 查看 [文档](README.md)
- 搜索 [Issues](https://github.com/yourusername/voice-to-text-tool/issues)
- 在 [Discussions](https://github.com/yourusername/voice-to-text-tool/discussions) 中提问

## 许可证

通过贡献代码，你同意你的贡献将在 MIT 许可证下发布。

---

再次感谢你的贡献！🎉
