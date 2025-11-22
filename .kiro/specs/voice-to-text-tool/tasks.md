# 实现计划

- [x] 1. 初始化项目结构和依赖
  - 创建 Electron 项目基础结构
  - 安装必要的依赖：electron, ws, uuid, node-record-lpcm16, @nut-tree/nut-js
  - 配置 TypeScript 和构建工具
  - 创建基本的目录结构：src/main（主进程）、src/renderer（渲染进程）、src/types（类型定义）
  - _需求: 4.1_

- [x] 2. 实现配置管理模块
  - 创建配置文件结构（config.json）
  - 实现配置读取和验证逻辑
  - 支持从环境变量读取 DASHSCOPE_API_KEY
  - 实现配置缺失时的错误提示
  - _需求: 4.1, 4.2_

- [x] 3. 实现 FunASR WebSocket 客户端
  - [x] 3.1 创建 FunASRClient 类的基础结构
    - 定义接口和类型（FunASRConfig, RecognitionResult, TaskError 等）
    - 实现 WebSocket 连接建立（使用 ws 库）
    - 在连接 Header 中添加 Authorization 认证
    - _需求: 2.1_
  
  - [x] 3.2 实现 run-task 指令发送
    - 生成 32 位 task_id（使用 uuid）
    - 构造 run-task JSON 消息
    - 发送指令并等待 task-started 事件
    - _需求: 2.1_
  
  - [x] 3.3 实现音频数据发送
    - 实现 sendAudio 方法接收 Buffer 并发送二进制数据
    - 处理音频流的持续发送
    - _需求: 2.1_
  
  - [x] 3.4 实现识别结果接收和解析
    - 监听 result-generated 事件
    - 解析 payload.output.sentence
    - 区分中间结果（sentence_end=false）和最终结果（sentence_end=true）
    - 触发相应的回调事件
    - _需求: 2.2, 2.3, 2.4_
  
  - [x] 3.5 实现 finish-task 指令和任务结束处理
    - 发送 finish-task 指令
    - 监听 task-finished 事件
    - 实现连接复用逻辑
    - _需求: 3.2_
  
  - [x] 3.6 实现错误处理
    - 监听 task-failed 事件
    - 解析 error_code 和 error_message
    - 在 task-failed 时关闭连接
    - 处理 WebSocket 连接错误
    - _需求: 2.5_
  
  - [ ]* 3.7 编写 FunASRClient 的属性测试
    - **属性 4: 音频数据传输**
    - **验证: 需求 2.1, 6.2**
  
  - [ ]* 3.8 编写 FunASRClient 的属性测试
    - **属性 5: 识别结果插入**
    - **验证: 需求 2.2**
  
  - [ ]* 3.9 编写 FunASRClient 的属性测试
    - **属性 6: 识别结果状态转换**
    - **验证: 需求 2.3, 2.4**

- [x] 4. 实现音频捕获模块
  - [x] 4.1 创建 AudioCapture 类
    - 使用 node-record-lpcm16 初始化录音
    - 配置音频参数：PCM, 16kHz, 16-bit, 单声道
    - 实现 start 和 stop 方法
    - 实现音频数据流事件（data 事件）
    - _需求: 1.1, 4.4_
  
  - [x] 4.2 实现麦克风权限检查
    - 在 macOS 上请求麦克风权限
    - 处理权限被拒绝的情况
    - 显示权限引导消息
    - _需求: 4.2, 4.3_
  
  - [ ]* 4.3 编写 AudioCapture 的属性测试
    - **属性 10: 默认音频设备**
    - **验证: 需求 4.4**

- [x] 5. 实现全局快捷键管理器
  - [x] 5.1 创建 HotkeyManager 类
    - 使用 Electron 的 globalShortcut API
    - 实现 registerActivationHotkey 方法
    - 实现 registerDeactivationHotkey 方法
    - 实现 unregisterAll 方法
    - 从配置文件读取快捷键设置
    - _需求: 1.1, 3.1_
  
  - [ ]* 5.2 编写 HotkeyManager 的属性测试
    - **属性 1: 激活启动音频捕获**
    - **验证: 需求 1.1**
  
  - [ ]* 5.3 编写 HotkeyManager 的属性测试
    - **属性 3: 重复激活的幂等性**
    - **验证: 需求 1.4**
  
  - [ ]* 5.4 编写 HotkeyManager 的属性测试
    - **属性 7: 关闭停止音频捕获**
    - **验证: 需求 3.1**

- [x] 6. 实现文字输入模拟器
  - [x] 6.1 创建 TextInjector 类
    - 使用 @nut-tree/nut-js 模拟键盘输入
    - 实现 typeText 方法
    - 处理特殊字符和标点符号
    - 实现 hasActiveInputField 方法检查活动输入框
    - _需求: 2.2_
  
  - [x] 6.2 实现输入失败的备选方案
    - 当键盘输入失败时，将文字复制到剪贴板
    - 显示提示消息让用户手动粘贴
    - _需求: 2.2_

- [x] 7. 实现状态指示器 UI
  - [x] 7.1 创建渲染进程窗口
    - 创建小型悬浮窗口（BrowserWindow）
    - 配置窗口属性：无边框、透明、置顶
    - 设置窗口位置（从配置读取）
    - _需求: 1.2, 5.2_
  
  - [x] 7.2 实现状态指示器界面
    - 设计简洁的状态图标（listening, processing, error）
    - 使用 HTML/CSS 实现最小化界面
    - 实现 show 和 hide 方法
    - 实现 updateStatus 方法更新状态显示
    - _需求: 1.2, 5.2, 5.4_
  
  - [x] 7.3 实现主进程与渲染进程通信
    - 使用 IPC 通信控制状态指示器
    - 主进程发送显示/隐藏/更新状态命令
    - _需求: 1.2, 3.3_
  
  - [ ]* 7.4 编写状态指示器的属性测试
    - **属性 2: 激活显示状态指示器**
    - **验证: 需求 1.2, 5.2**
  
  - [ ]* 7.5 编写状态指示器的属性测试
    - **属性 11: 空闲状态无 UI**
    - **验证: 需求 5.1**
  
  - [ ]* 7.6 编写状态指示器的属性测试
    - **属性 12: UI 不遮挡输入框**
    - **验证: 需求 5.4**

- [x] 8. 实现应用状态管理器
  - [x] 8.1 创建 AppStateManager 类
    - 定义应用状态：idle, active, error
    - 实现 activate 方法协调各组件启动
    - 实现 deactivate 方法协调各组件停止
    - 实现 getState 方法
    - _需求: 1.1, 3.1_
  
  - [x] 8.2 实现激活流程
    - 检查是否有活动输入框
    - 建立 FunASR 连接（如果需要）
    - 发送 run-task 指令
    - 等待 task-started 事件
    - 启动音频捕获
    - 显示状态指示器
    - _需求: 1.1, 1.2, 1.3_
  
  - [x] 8.3 实现音频数据流处理
    - 监听 AudioCapture 的 data 事件
    - 将音频数据发送到 FunASRClient
    - 每 100ms 发送一次音频块
    - _需求: 2.1_
  
  - [x] 8.4 实现识别结果处理
    - 监听 FunASRClient 的 result-generated 事件
    - 对于中间结果（sentence_end=false），更新状态指示器
    - 对于最终结果（sentence_end=true），调用 TextInjector 插入文字
    - _需求: 2.2, 2.3, 2.4_
  
  - [x] 8.5 实现停止流程
    - 停止音频捕获
    - 发送 finish-task 指令
    - 等待 task-finished 事件
    - 隐藏状态指示器
    - 更新应用状态为 idle
    - _需求: 3.1, 3.2, 3.3_
  
  - [x] 8.6 实现错误处理流程
    - 监听各组件的错误事件
    - 显示错误消息
    - 清理资源并恢复到 idle 状态
    - _需求: 2.5, 4.3_
  
  - [ ]* 8.7 编写 AppStateManager 的属性测试
    - **属性 8: 关闭清理资源**
    - **验证: 需求 3.2, 3.3**
  
  - [ ]* 8.8 编写 AppStateManager 的属性测试
    - **属性 13: 静默时保持活动**
    - **验证: 需求 6.3**

- [x] 9. 集成主进程入口
  - [x] 9.1 创建 Electron 主进程入口文件
    - 初始化 Electron app
    - 创建托盘图标（可选）
    - 加载配置
    - 初始化所有管理器
    - _需求: 4.1_
  
  - [x] 9.2 注册全局快捷键
    - 在 app ready 时注册快捷键
    - 绑定激活和关闭回调到 AppStateManager
    - _需求: 1.1, 3.1_
  
  - [x] 9.3 实现应用生命周期管理
    - 处理 app quit 事件
    - 清理资源（注销快捷键、关闭连接）
    - 处理 macOS 的窗口关闭行为
    - _需求: 3.2_

- [x] 10. 实现错误提示和用户反馈
  - 实现各种错误场景的用户提示
  - 无活动输入框时的提示
  - 麦克风权限错误的引导
  - API Key 配置错误的提示
  - 网络连接错误的提示
  - task-failed 错误的显示
  - _需求: 1.3, 2.5, 4.3_

- [x] 11. 首次运行配置向导
  - 检测是否首次运行
  - 引导用户配置 API Key
  - 请求麦克风权限
  - 显示快捷键说明
  - _需求: 4.2_

- [x] 12. 打包和部署配置
  - 配置 electron-builder
  - 设置 macOS Intel 芯片目标
  - 配置应用图标和元数据
  - 创建 .dmg 安装包
  - 编写 README 和使用说明
  - _需求: 4.1_

- [x] 13. 最终检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户
