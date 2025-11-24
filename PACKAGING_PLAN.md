# 打包技术方案 - Intel Mac 版本

## 目标

将当前代码**原封不动**打包成 macOS Intel 芯片的应用程序，不修改任何逻辑、配置和交互。

---

## 当前状态检查

### ✅ 已确认的配置

1. **快捷键**: `Command+2`（激活和停止都是同一个键）
2. **服务地址**: `wss://dashscope.aliyuncs.com/api-ws/v1/inference`
3. **模型**: `fun-asr-realtime`
4. **音频配置**: 16000Hz, 单声道, 16bit
5. **托盘应用**: 后台运行，不显示在 Dock

### ✅ 已有的打包配置

```json
{
  "build": {
    "appId": "com.voicetotext.app",
    "productName": "VoiceToText",
    "mac": {
      "target": [{"target": "dmg", "arch": ["x64", "arm64"]}],
      "category": "public.app-category.productivity",
      "extendInfo": {"LSUIElement": true}
    },
    "files": ["dist/**/*", "config.json", "package.json"]
  }
}
```

---

## 问题分析

### 上次打包失败的原因

1. **配置文件路径错误**: 打包后配置文件路径变成只读
2. **原生模块未重建**: robotjs 和 node-record-lpcm16 需要针对 Electron 重新编译
3. **文件包含错误**: 可能包含了不该包含的文件

---

## 打包方案（只打包，不修改代码）

### 步骤 1：验证当前代码可运行

```bash
# 1. 清理旧的构建
rm -rf dist/
rm -rf release/

# 2. 重新安装依赖（确保干净）
rm -rf node_modules/
npm install

# 3. 重建原生模块
npx electron-rebuild

# 4. 编译并测试
npm run build
npm start

# 5. 验证功能
# - 托盘图标显示
# - 配置窗口打开
# - 快捷键 Command+2 工作
# - 语音识别功能正常
```

**⚠️ 重要**: 只有当前代码完全正常工作后，才进行打包！

### 步骤 2：修正打包配置（最小改动）

需要修改的**唯一**配置：

```json
{
  "build": {
    "files": [
      "dist/**/*",
      "package.json",
      "!config.json"  // ← 不打包用户配置
    ],
    "extraResources": [
      {
        "from": "config.example.json",
        "to": "config.example.json"
      }
    ]
  }
}
```

**原因**: 配置文件应该在用户目录，不在应用包内（已经在代码中实现）。

### 步骤 3：仅打包 Intel 版本

```bash
# 只打包 Intel (x64) 版本
npm run dist:mac-intel
```

**不使用** `npm run dist:mac`，因为它会同时打包 ARM 和 Intel，增加复杂度。

### 步骤 4：验证打包结果

```bash
# 1. 检查生成的文件
ls -lh release/*.dmg

# 2. 安装测试
open release/VoiceToText-1.0.0-x64.dmg

# 3. 拖到 Applications 文件夹

# 4. 运行测试
open /Applications/VoiceToText.app

# 5. 验证功能（与开发环境完全一致）
# - 托盘图标
# - 配置窗口
# - 快捷键 Command+2
# - 语音识别
```

---

## 不会修改的内容（保证原样）

### ✅ 代码逻辑
- 不修改任何 `.ts` 文件
- 不修改任何 `.js` 文件
- 不修改任何 `.html` 文件

### ✅ 配置
- 快捷键保持 `Command+2`
- 服务地址保持不变
- 所有默认值保持不变

### ✅ 交互
- 托盘菜单保持不变
- 配置窗口保持不变
- 快捷键行为保持不变

---

## 可能遇到的问题及解决方案

### 问题 1: 原生模块加载失败

**症状**: 打包后应用无法启动，提示模块错误

**解决**:
```bash
# 重新安装并重建
rm -rf node_modules/
npm install
npx electron-rebuild
```

### 问题 2: 配置文件无法保存

**症状**: 点击保存配置时报错 "read-only file system"

**状态**: ✅ 已修复（配置文件在用户目录）

### 问题 3: 快捷键不工作

**症状**: 按 Command+2 没反应

**检查**:
1. 查看控制台日志
2. 确认快捷键格式是 `Command+2`（不是 `CommandOrControl+2`）
3. 确认没有被其他应用占用

### 问题 4: 应用无法打开

**症状**: 双击应用没反应

**解决**:
```bash
# 移除隔离属性
xattr -cr /Applications/VoiceToText.app
```

---

## 打包清单（执行前确认）

### 准备工作
- [ ] 当前代码在开发环境完全正常工作
- [ ] 已测试所有功能（托盘、配置、快捷键、语音识别）
- [ ] 已清理 `dist/` 和 `release/` 目录
- [ ] 已重新安装依赖
- [ ] 已重建原生模块

### 配置检查
- [ ] `package.json` 中的 `build.files` 不包含 `config.json`
- [ ] `package.json` 中的 `build.extraResources` 包含 `config.example.json`
- [ ] `.gitignore` 包含 `release/`

### 打包执行
- [ ] 运行 `npm run build`（编译成功）
- [ ] 运行 `npm run dist:mac-intel`（仅 Intel 版本）
- [ ] 等待打包完成（不中断）

### 验证测试
- [ ] DMG 文件生成在 `release/` 目录
- [ ] 安装到 Applications 文件夹
- [ ] 应用能正常启动
- [ ] 托盘图标显示
- [ ] 配置窗口能打开
- [ ] 能保存配置
- [ ] 快捷键 Command+2 工作
- [ ] 语音识别功能正常

---

## 执行命令（按顺序）

```bash
# 1. 清理
rm -rf dist/ release/

# 2. 确保依赖正确
npm install

# 3. 重建原生模块
npx electron-rebuild

# 4. 编译
npm run build

# 5. 测试（必须正常工作）
npm start
# 测试所有功能...

# 6. 打包（仅 Intel）
npm run dist:mac-intel

# 7. 等待完成
# 查看 release/ 目录

# 8. 安装测试
open release/VoiceToText-1.0.0-x64.dmg
```

---

## 成功标准

打包成功的标志：

1. ✅ 生成 `VoiceToText-1.0.0-x64.dmg` 文件
2. ✅ 文件大小约 150MB
3. ✅ 能安装到 Applications 文件夹
4. ✅ 双击能启动，托盘图标显示
5. ✅ 所有功能与开发环境**完全一致**

---

## 风险控制

### 如果打包失败

1. **不要修改代码**
2. 检查错误日志
3. 确认原生模块是否正确编译
4. 回到"步骤 1"重新验证

### 如果打包后不能用

1. **不要重新打包**
2. 在开发环境中重新测试
3. 确认开发环境完全正常
4. 找出差异点
5. 只修复打包配置，不修改代码逻辑

---

## 总结

**核心原则**: 
- ✅ 只打包，不修改
- ✅ 先确认开发环境正常
- ✅ 只打包 Intel 版本
- ✅ 最小化配置改动

**预期结果**:
- 一个可以在 Intel Mac 上运行的 DMG 文件
- 功能与当前开发环境**完全一致**
- 用户体验**完全一致**

---

## 下一步

请确认：
1. 当前代码在开发环境是否完全正常工作？
2. 是否同意这个打包方案？
3. 是否准备好开始执行？

如果确认无误，我将严格按照这个方案执行，不做任何额外修改。
