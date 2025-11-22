# 安全指南

## 保护你的 API Key

### 重要提示

- **永远不要**将 `config.json` 提交到 Git 仓库
- **永远不要**在公开场合分享你的 API Key
- **永远不要**在截图或视频中暴露 `config.json` 内容

### 配置文件说明

本项目使用以下配置文件：

| 文件 | 说明 | 是否提交到 Git |
|------|------|----------------|
| `config.example.json` | 配置模板，不含敏感信息 | ✅ 是 |
| `config.json` | 实际配置，包含你的 API Key | ❌ 否（已在 .gitignore 中）|
| `.env.example` | 环境变量模板 | ✅ 是 |
| `.env` | 实际环境变量 | ❌ 否（已在 .gitignore 中）|

### 首次配置

1. 复制配置模板：
   ```bash
   cp config.example.json config.json
   ```

2. 编辑 `config.json`，填入你的 API Key

3. 验证 `config.json` 不会被提交：
   ```bash
   git status
   # config.json 不应该出现在列表中
   ```

### 如果不小心泄露了 API Key

1. **立即重置 API Key**
   - 登录 [阿里云 DashScope 控制台](https://dashscope.aliyuncs.com/)
   - 重置或删除泄露的 API Key
   - 生成新的 API Key

2. **更新本地配置**
   - 在 `config.json` 中更新为新的 API Key

3. **清理 Git 历史（如果已提交）**
   ```bash
   # 从 Git 历史中移除敏感文件
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch config.json" \
     --prune-empty --tag-name-filter cat -- --all
   
   # 强制推送（谨慎操作）
   git push origin --force --all
   ```

### 最佳实践

1. **定期轮换 API Key**
   - 建议每 3-6 个月更换一次 API Key

2. **使用环境变量（可选）**
   - 对于生产环境，可以使用环境变量代替配置文件
   - 设置环境变量：`export DASHSCOPE_API_KEY="your-key"`

3. **限制 API Key 权限**
   - 在阿里云控制台中，只授予必要的权限
   - 设置 API 调用频率限制

4. **监控 API 使用情况**
   - 定期检查阿里云控制台的 API 调用记录
   - 发现异常立即重置 API Key

### 开源贡献者注意事项

如果你要为本项目贡献代码：

1. **不要提交** `config.json` 文件
2. **不要在 PR 中**包含任何 API Key
3. **不要在 Issue 中**粘贴包含 API Key 的日志
4. 如果需要分享配置，使用 `config.example.json`

### 报告安全问题

如果你发现安全漏洞，请通过以下方式报告：

- 发送邮件到项目维护者（不要公开发布 Issue）
- 描述问题和潜在影响
- 如果可能，提供修复建议

## 数据隐私

### 音频数据

- 音频数据通过加密的 WebSocket 连接发送到阿里云 FunASR 服务
- 不会在本地存储音频数据
- 阿里云的数据处理遵循其隐私政策

### 识别结果

- 识别的文字直接插入到输入框，不会被保存
- 应用不会记录或上传你的输入内容

### 网络连接

- 仅连接到阿里云 DashScope 服务
- 使用 WSS（WebSocket Secure）加密传输
- 不会连接到其他第三方服务

## 许可证

本项目采用 MIT 许可证，详见 LICENSE 文件。
