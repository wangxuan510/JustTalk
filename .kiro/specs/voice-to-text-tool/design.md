# 设计文档

## 概述

语音转文字工具是一个轻量级的 macOS 应用程序，使用 Electron 框架构建，集成阿里 FunASR 实时语音识别服务。应用程序在后台运行，通过全局快捷键激活，捕获麦克风音频并将识别结果实时插入到当前活动的输入框中。

### 技术栈选择

- **Electron**: 跨平台桌面应用框架，支持 macOS，便于访问系统 API
- **Node.js**: 后端逻辑处理
- **FunASR WebSocket API**: 阿里实时语音识别服务（wss://dashscope.aliyuncs.com/api-ws/v1/inference）
- **ws**: WebSocket 客户端库
- **node-record-lpcm16**: 音频录制库（PCM 格式，16kHz，单声道）
- **@nut-tree/nut-js**: 模拟键盘输入，将文字插入活动输入框

## 架构

### 系统架构图

```
┌─────────────────────────────────────────────────┐
│           macOS 操作系统                         │
│  ┌──────────────────────────────────────────┐  │
│  │        活动输入框（任意应用）              │  │
│  └──────────────────────────────────────────┘  │
│                    ▲                            │
│                    │ 文字输入                    │
└────────────────────┼────────────────────────────┘
                     │
┌────────────────────┼────────────────────────────┐
│    Electron 应用   │                            │
│  ┌─────────────────┴──────────────────────┐    │
│  │      主进程 (Main Process)              │    │
│  │  ┌──────────────────────────────────┐  │    │
│  │  │   全局快捷键监听器                │  │    │
│  │  └──────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────┐  │    │
│  │  │   音频捕获模块                    │  │    │
│  │  └──────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────┐  │    │
│  │  │   FunASR 客户端                   │  │    │
│  │  └──────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────┐  │    │
│  │  │   文字输入模拟器                  │  │    │
│  │  └──────────────────────────────────┘  │    │
│  └─────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────┐    │
│  │   渲染进程 (Renderer Process)           │    │
│  │  ┌──────────────────────────────────┐  │    │
│  │  │   状态指示器 UI                   │  │    │
│  │  └──────────────────────────────────┘  │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
                     │
                     │ WebSocket
                     ▼
┌─────────────────────────────────────────────────┐
│           FunASR 服务 (阿里云)                   │
└─────────────────────────────────────────────────┘
```

### 数据流

1. 用户按下激活快捷键
2. 主进程检查是否有活动输入框
3. 建立 WebSocket 连接到 FunASR（如果尚未连接）
4. 发送 `run-task` 指令（JSON 消息）
5. 等待 `task-started` 事件
6. 启动音频捕获（PCM 16kHz 单声道）
7. 持续发送音频数据（二进制，每 100ms 一次）
8. FunASR 返回 `result-generated` 事件（多次）：
   - `sentence_end=false`: 中间结果，实时更新显示
   - `sentence_end=true`: 最终结果，确认并插入文字
9. 文字输入模拟器将识别结果插入活动输入框
10. 用户按下关闭快捷键
11. 停止音频捕获
12. 发送 `finish-task` 指令
13. 等待 `task-finished` 事件
14. 隐藏状态指示器
15. WebSocket 连接保持（可复用），60 秒无活动后自动断开

**错误流程**:
- 如果收到 `task-failed` 事件，立即关闭连接并显示错误

## 组件和接口

### 1. 全局快捷键监听器 (HotkeyManager)

**职责**: 注册和监听全局快捷键

**接口**:
```typescript
interface HotkeyManager {
  // 注册激活快捷键
  registerActivationHotkey(callback: () => void): void;
  
  // 注册关闭快捷键
  registerDeactivationHotkey(callback: () => void): void;
  
  // 注销所有快捷键
  unregisterAll(): void;
}
```

**实现细节**:
- 使用 Electron 的 `globalShortcut` API
- 默认快捷键: 激活 `CommandOrControl+Shift+V`, 关闭 `CommandOrControl+Shift+S`

### 2. 音频捕获模块 (AudioCapture)

**职责**: 捕获麦克风音频并转换为适合 FunASR 的格式

**接口**:
```typescript
interface AudioCapture {
  // 开始录音
  start(): Promise<void>;
  
  // 停止录音
  stop(): void;
  
  // 音频数据事件
  on(event: 'data', callback: (audioChunk: Buffer) => void): void;
  
  // 错误事件
  on(event: 'error', callback: (error: Error) => void): void;
}
```

**实现细节**:
- 使用 `node-record-lpcm16` 录制音频
- 音频格式严格要求：
  - 格式: PCM（原始音频数据）
  - 采样率: 16000 Hz
  - 位深度: 16-bit
  - 声道: 单声道（mono）
  - 编码: signed-integer
- 检查麦克风权限（macOS 系统权限）
- 音频数据以流的方式持续发送，建议每 100ms 发送一次

### 3. FunASR 客户端 (FunASRClient)

**职责**: 与 FunASR WebSocket API 通信

**接口**:
```typescript
interface FunASRClient {
  // 连接到 FunASR 服务
  connect(config: FunASRConfig): Promise<void>;
  
  // 启动识别任务
  startTask(taskId: string): Promise<void>;
  
  // 发送音频数据（二进制 PCM）
  sendAudio(audioChunk: Buffer): void;
  
  // 结束任务
  finishTask(taskId: string): void;
  
  // 断开连接
  disconnect(): void;
  
  // 任务启动事件
  on(event: 'task-started', callback: () => void): void;
  
  // 接收识别结果事件
  on(event: 'result-generated', callback: (result: RecognitionResult) => void): void;
  
  // 任务完成事件
  on(event: 'task-finished', callback: () => void): void;
  
  // 任务失败事件
  on(event: 'task-failed', callback: (error: TaskError) => void): void;
}

interface FunASRConfig {
  apiKey: string;  // DashScope API Key
  url: string;     // wss://dashscope.aliyuncs.com/api-ws/v1/inference
}

interface RecognitionResult {
  text: string;              // 识别的文本
  sentenceEnd: boolean;      // 是否为句子结束（最终结果）
  beginTime: number;         // 句子开始时间（ms）
  endTime: number | null;    // 句子结束时间（ms），中间结果为 null
  words: WordTimestamp[];    // 字级别时间戳
  duration?: number;         // 计费时长（秒），仅在 sentenceEnd=true 时存在
}

interface WordTimestamp {
  text: string;
  beginTime: number;
  endTime: number;
  punctuation: string;
}

interface TaskError {
  errorCode: string;
  errorMessage: string;
}
```

**实现细节**:
- 使用 `ws` 库建立 WebSocket 连接
- 连接时在 Header 中携带 `Authorization: bearer ${apiKey}`
- 遵循 FunASR 交互时序：
  1. 建立连接
  2. 发送 `run-task` 指令（JSON）
  3. 等待 `task-started` 事件
  4. 发送二进制音频数据
  5. 接收 `result-generated` 事件（多次）
  6. 发送 `finish-task` 指令
  7. 等待 `task-finished` 事件
- 使用 UUID 生成 32 位 task_id
- 支持连接复用（一个连接可以执行多个任务）
- 处理 `task-failed` 事件并关闭连接

### 4. 文字输入模拟器 (TextInjector)

**职责**: 将识别的文字插入到活动输入框

**接口**:
```typescript
interface TextInjector {
  // 输入文字到活动输入框
  typeText(text: string): Promise<void>;
  
  // 检查是否有活动输入框
  hasActiveInputField(): boolean;
}
```

**实现细节**:
- 使用 `robotjs` 或 `nut.js` 模拟键盘输入
- 处理特殊字符和换行
- 考虑输入速度以避免丢失字符

### 5. 状态指示器 UI (StatusIndicator)

**职责**: 显示工具运行状态的视觉反馈

**接口**:
```typescript
interface StatusIndicator {
  // 显示指示器
  show(): void;
  
  // 隐藏指示器
  hide(): void;
  
  // 更新状态
  updateStatus(status: 'listening' | 'processing' | 'error'): void;
}
```

**实现细节**:
- 小型悬浮窗口，显示在屏幕角落
- 使用简单的图标或颜色指示状态
- 透明背景，不遮挡内容

### 6. 应用状态管理器 (AppStateManager)

**职责**: 管理应用的整体状态和组件协调

**接口**:
```typescript
interface AppStateManager {
  // 激活语音识别
  activate(): Promise<void>;
  
  // 停止语音识别
  deactivate(): void;
  
  // 获取当前状态
  getState(): AppState;
}

type AppState = 'idle' | 'active' | 'error';
```

## 数据模型

### 音频配置
```typescript
interface AudioConfig {
  sampleRate: number;      // 16000 Hz（FunASR 要求）
  channels: number;        // 1 (单声道)
  bitDepth: number;        // 16 bit
  encoding: string;        // 'signed-integer'
}
```

### FunASR 请求消息格式

**run-task 指令**:
```typescript
interface RunTaskMessage {
  header: {
    action: 'run-task';
    task_id: string;        // 32位唯一ID
    streaming: 'duplex';
  };
  payload: {
    task_group: 'audio';
    task: 'asr';
    function: 'recognition';
    model: 'fun-asr-realtime';  // 或 'fun-asr-realtime-2025-11-07'
    parameters: {
      format: 'pcm';
      sample_rate: 16000;
    };
    input: {};
  };
}
```

**finish-task 指令**:
```typescript
interface FinishTaskMessage {
  header: {
    action: 'finish-task';
    task_id: string;        // 与 run-task 相同
    streaming: 'duplex';
  };
  payload: {
    input: {};
  };
}
```

### FunASR 响应事件格式

**task-started 事件**:
```typescript
interface TaskStartedEvent {
  header: {
    task_id: string;
    event: 'task-started';
    attributes: {};
  };
  payload: {};
}
```

**result-generated 事件**:
```typescript
interface ResultGeneratedEvent {
  header: {
    task_id: string;
    event: 'result-generated';
    attributes: {};
  };
  payload: {
    output: {
      sentence: {
        begin_time: number;
        end_time: number | null;
        text: string;
        sentence_end: boolean;
        words: Array<{
          begin_time: number;
          end_time: number;
          text: string;
          punctuation: string;
        }>;
      };
    };
    usage: {
      duration: number;  // 计费时长（秒），仅在 sentence_end=true 时存在
    } | null;
  };
}
```

**task-finished 事件**:
```typescript
interface TaskFinishedEvent {
  header: {
    task_id: string;
    event: 'task-finished';
    attributes: {};
  };
  payload: {
    output: {};
  };
}
```

**task-failed 事件**:
```typescript
interface TaskFailedEvent {
  header: {
    task_id: string;
    event: 'task-failed';
    error_code: string;
    error_message: string;
    attributes: {};
  };
  payload: {};
}
```

### 应用配置
```typescript
interface AppConfig {
  funASR: {
    apiKey: string;        // DashScope API Key（从环境变量读取）
    url: string;           // wss://dashscope.aliyuncs.com/api-ws/v1/inference
    model: string;         // 'fun-asr-realtime' 或 'fun-asr-realtime-2025-11-07'
  };
  hotkeys: {
    activate: string;      // 'CommandOrControl+Shift+V'
    deactivate: string;    // 'CommandOrControl+Shift+S'
  };
  audio: AudioConfig;
}
```


## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1: 激活启动音频捕获
*对于任何*快捷键激活事件，当工具处于空闲状态时，激活应该导致音频捕获模块开始录音
**验证: 需求 1.1**

### 属性 2: 激活显示状态指示器
*对于任何*激活事件，工具应该显示状态指示器 UI 且仅显示状态指示器
**验证: 需求 1.2, 5.2**

### 属性 3: 重复激活的幂等性
*对于任何*已激活的工具状态，再次按下激活快捷键应该保持相同的状态，不产生额外的副作用
**验证: 需求 1.4**

### 属性 4: 音频数据传输
*对于任何*音频数据块，当工具处于活动状态时，该数据应该被发送到 FunASR 服务
**验证: 需求 2.1, 6.2**

### 属性 5: 识别结果插入
*对于任何*来自 FunASR 的识别结果，该文字应该被插入到活动输入框的当前位置
**验证: 需求 2.2**

### 属性 6: 识别结果状态转换
*对于任何*识别结果序列（部分结果后跟最终结果），工具应该正确更新显示内容并在最终结果后准备接收新的语音
**验证: 需求 2.3, 2.4**

### 属性 7: 关闭停止音频捕获
*对于任何*关闭快捷键事件，当工具处于活动状态时，应该停止音频捕获
**验证: 需求 3.1**

### 属性 8: 关闭清理资源
*对于任何*停止事件，工具应该关闭 FunASR 连接并隐藏所有 UI 元素
**验证: 需求 3.2, 3.3**

### 属性 9: 权限请求
*对于任何*应用启动事件，工具应该检查并在必要时请求麦克风访问权限
**验证: 需求 4.2**

### 属性 10: 默认音频设备
*对于任何*音频捕获初始化，工具应该使用系统默认麦克风设备
**验证: 需求 4.4**

### 属性 11: 空闲状态无 UI
*对于任何*空闲状态，工具不应该显示任何 UI 元素
**验证: 需求 5.1**

### 属性 12: UI 不遮挡输入框
*对于任何*状态指示器显示位置，该位置不应该与活动输入框的位置重叠
**验证: 需求 5.4**

### 属性 13: 静默时保持活动
*对于任何*没有音频输入的时间段，只要未按下关闭快捷键，工具应该保持活动状态
**验证: 需求 6.3**

## 错误处理

### 1. 麦克风权限错误
- **场景**: 用户拒绝麦克风权限或权限被撤销
- **处理**: 显示友好的错误消息，引导用户到系统设置中授予权限，工具保持非活动状态

### 2. WebSocket 连接错误
- **场景**: 无法连接到 FunASR 服务（wss://dashscope.aliyuncs.com）
- **处理**: 
  - 显示错误通知："无法连接到语音识别服务"
  - 自动停止音频捕获
  - 检查网络连接
  - 记录错误日志

### 3. 认证错误
- **场景**: API Key 无效或过期
- **处理**: 
  - 显示错误消息："API Key 认证失败"
  - 提示用户检查配置文件中的 API Key
  - 停止识别流程

### 4. task-failed 事件处理
- **场景**: FunASR 返回 `task-failed` 事件
- **处理**: 
  - 解析 `error_code` 和 `error_message`
  - 显示具体错误信息给用户
  - 关闭 WebSocket 连接（按照 API 要求）
  - 停止音频捕获
  - 常见错误码：
    - `CLIENT_ERROR`: 客户端请求错误（如超时）
    - 其他错误码参考 FunASR 错误码文档

### 5. 音频设备错误
- **场景**: 麦克风不可用或音频捕获失败
- **处理**: 
  - 显示错误消息："无法访问麦克风"
  - 停止识别流程
  - 记录错误日志供调试

### 6. 无活动输入框错误
- **场景**: 激活时没有任何输入框获得焦点
- **处理**: 
  - 显示提示消息："请先点击一个输入框"
  - 不启动音频捕获
  - 保持空闲状态

### 7. 文字输入失败
- **场景**: 无法模拟键盘输入或输入被阻止
- **处理**: 
  - 将识别结果复制到剪贴板作为备选方案
  - 通知用户使用粘贴功能

### 8. 连接超时
- **场景**: 任务结束后 60 秒内没有新任务，连接自动断开
- **处理**: 
  - 这是正常行为，不需要错误提示
  - 下次激活时重新建立连接

### 9. 音频格式不匹配
- **场景**: 发送的音频格式与 run-task 中声明的参数不一致
- **处理**: 
  - 确保音频捕获严格按照 PCM 16kHz 单声道格式
  - 如果识别无结果，检查音频参数配置
  - 可使用 FFmpeg 工具验证音频格式

## 测试策略

### 单元测试

单元测试将验证各个组件的具体行为和边缘情况：

1. **HotkeyManager 测试**
   - 测试快捷键注册和注销
   - 测试回调函数触发

2. **AudioCapture 测试**
   - 测试音频格式配置
   - 测试启动和停止
   - 测试权限检查

3. **FunASRClient 测试**
   - 测试 WebSocket 连接建立
   - 测试音频数据发送
   - 测试识别结果解析
   - 测试错误处理和重连逻辑

4. **TextInjector 测试**
   - 测试特殊字符处理
   - 测试输入框检测

5. **StatusIndicator 测试**
   - 测试显示和隐藏
   - 测试状态更新

6. **AppStateManager 测试**
   - 测试状态转换
   - 测试组件协调

### 基于属性的测试

基于属性的测试将使用 **fast-check**（JavaScript/TypeScript 的属性测试库）来验证通用正确性属性。

**配置要求**:
- 每个属性测试应该运行至少 **100 次迭代**
- 每个属性测试必须使用注释标签明确引用设计文档中的正确性属性
- 标签格式: `// Feature: voice-to-text-tool, Property X: [属性描述]`

**属性测试覆盖**:

1. **属性 1-3**: 测试激活行为的正确性
   - 生成随机的应用状态
   - 验证激活操作的效果

2. **属性 4-6**: 测试音频和识别流程
   - 生成随机音频数据和识别结果
   - 验证数据流和状态转换

3. **属性 7-8**: 测试关闭和清理行为
   - 生成随机的活动状态
   - 验证资源释放

4. **属性 9-13**: 测试系统配置和 UI 行为
   - 生成随机的系统状态和 UI 配置
   - 验证约束条件

**边缘情况测试**:
- 没有活动输入框时激活（需求 1.3）
- 网络连接失败（需求 2.5）
- 工具未运行时按关闭键（需求 3.4）
- 用户拒绝麦克风权限（需求 4.3）
- 低音量输入（需求 6.1）
- 音频流中断（需求 6.4）

### 集成测试

1. **端到端流程测试**
   - 模拟完整的用户工作流：激活 → 说话 → 识别 → 插入文字 → 关闭
   - 验证所有组件协同工作

2. **FunASR 集成测试**
   - 使用真实的 FunASR 服务测试连接和识别
   - 验证音频格式兼容性

3. **macOS 系统集成测试**
   - 测试全局快捷键在 macOS 上的工作
   - 测试麦克风权限流程
   - 测试文字输入到各种应用（TextEdit, Chrome, VS Code 等）

## 性能考虑

1. **音频延迟**: 从说话到文字显示应该在 1-2 秒内（取决于网络和 FunASR 处理速度）
2. **内存使用**: 应用应该保持轻量级，空闲时内存占用 < 50MB
3. **CPU 使用**: 音频捕获和处理应该高效，避免影响其他应用
4. **网络带宽**: 
   - PCM 16kHz 16-bit 单声道 ≈ 32 KB/s
   - 每 100ms 发送一次 ≈ 3.2 KB/chunk
5. **连接复用**: 
   - 一个 WebSocket 连接可以执行多个任务
   - 减少建连开销，提升响应速度
   - 60 秒无活动后自动断开（FunASR 服务端行为）
6. **实时性优化**:
   - 使用 `sentence_end=false` 的中间结果实时更新
   - 使用 `sentence_end=true` 的最终结果确认插入

## 安全考虑

1. **凭证管理**: 
   - DashScope API Key 应该从环境变量 `DASHSCOPE_API_KEY` 读取
   - 不应该硬编码在代码中
   - 配置文件中的 API Key 应该有适当的文件权限保护
2. **权限最小化**: 只请求必要的麦克风权限
3. **数据隐私**: 
   - 音频数据仅发送到 FunASR（阿里云 DashScope）
   - 不在本地存储音频或识别结果
   - 遵守阿里云 DashScope 的数据使用政策
4. **加密通信**: 使用 WSS（WebSocket Secure）协议，确保数据传输加密
5. **认证**: 在 WebSocket 连接的 Header 中使用 `Authorization: bearer ${apiKey}` 进行认证

## 部署和配置

### 配置文件

应用应该支持配置文件 `config.json`:

```json
{
  "funASR": {
    "apiKey": "",
    "url": "wss://dashscope.aliyuncs.com/api-ws/v1/inference",
    "model": "fun-asr-realtime"
  },
  "hotkeys": {
    "activate": "CommandOrControl+Shift+V",
    "deactivate": "CommandOrControl+Shift+S"
  },
  "ui": {
    "indicatorPosition": "top-right"
  }
}
```

**配置说明**:
- `apiKey`: DashScope API Key，建议从环境变量 `DASHSCOPE_API_KEY` 读取
- `url`: FunASR WebSocket 端点（固定值）
- `model`: 使用的模型，可选：
  - `fun-asr-realtime`: 稳定版（默认）
  - `fun-asr-realtime-2025-11-07`: 最新快照版（远场 VAD 优化）

### 打包

- 使用 `electron-builder` 打包为 macOS .app 或 .dmg
- 支持 Intel 芯片的 macOS 10.13+
- 包含所有必要的 Node.js 依赖

### 首次运行

1. 应用启动时检查配置文件
2. 如果 API Key 缺失，引导用户：
   - 访问阿里云 DashScope 获取 API Key
   - 将 API Key 配置到环境变量 `DASHSCOPE_API_KEY` 或配置文件
3. 请求 macOS 麦克风权限
4. 显示快捷键说明和使用指南

## 未来扩展

虽然当前版本保持简单，但设计应该考虑以下潜在扩展：

1. 支持自定义快捷键配置
2. 支持多语言识别（FunASR 已支持中文、英文、日语）
3. 支持 Apple Silicon (M1/M2/M3) 芯片
4. 添加识别历史记录
5. 支持语音命令（如"删除"、"换行"）
6. 支持热词定制（使用 FunASR 的 vocabulary_id 参数）
7. 支持语义断句模式切换（semantic_punctuation_enabled）
8. 连接复用优化（减少建连开销）
