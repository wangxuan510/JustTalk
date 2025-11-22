import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  FunASRConfig,
  RecognitionResult,
  TaskError,
  RunTaskMessage,
  FinishTaskMessage,
  TaskStartedEvent,
  ResultGeneratedEvent,
  TaskFinishedEvent,
  TaskFailedEvent,
} from '../types';

export class FunASRClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: FunASRConfig | null = null;
  private currentTaskId: string | null = null;
  private isConnected: boolean = false;
  private isTaskRunning: boolean = false;
  
  // 重连机制
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private readonly RECONNECT_DELAY = 2000; // 2 秒
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;

  constructor() {
    super();
  }

  /**
   * 连接到 FunASR 服务
   */
  public async connect(config: FunASRConfig): Promise<void> {
    if (this.isConnected && this.ws) {
      console.log('已经连接到 FunASR 服务');
      return;
    }

    this.config = config;

    return new Promise((resolve, reject) => {
      // 设置连接超时
      const connectionTimeout = setTimeout(() => {
        console.error('WebSocket 连接超时');
        if (this.ws) {
          this.ws.close();
        }
        reject(new Error('连接超时（10秒）'));
      }, 10000); // 10 秒超时

      try {
        // 创建 WebSocket 连接，在 Header 中添加 Authorization
        this.ws = new WebSocket(config.url, {
          headers: {
            Authorization: `bearer ${config.apiKey}`,
          },
          handshakeTimeout: 10000, // 握手超时
        });

        // 连接打开
        this.ws.on('open', () => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket 连接已建立');
          this.isConnected = true;
          this.reconnectAttempts = 0; // 重置重连计数
          this.isReconnecting = false;
          resolve();
        });

        // 接收消息
        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

        // 连接错误
        this.ws.on('error', (error: Error) => {
          clearTimeout(connectionTimeout);
          console.error('WebSocket 错误:', error);
          
          // 忽略 write EIO 等连接关闭后的错误
          const errorMessage = error.message || '';
          if (errorMessage.includes('write EIO') || errorMessage.includes('ECONNRESET')) {
            console.warn('WebSocket 连接错误（已忽略）:', errorMessage);
            return;
          }
          
          this.emit('error', error);
          
          // 只在首次连接时 reject
          if (!this.isConnected) {
            reject(error);
          }
        });

        // 连接关闭
        this.ws.on('close', (code: number, reason: string) => {
          clearTimeout(connectionTimeout);
          console.log(`WebSocket 连接已关闭 (code: ${code}, reason: ${reason})`);
          
          const wasConnected = this.isConnected;
          const wasTaskRunning = this.isTaskRunning;
          
          this.isConnected = false;
          this.isTaskRunning = false;
          this.currentTaskId = null;

          // 发出连接断开事件，通知 AppStateManager
          if (wasConnected) {
            this.emit('disconnected', { wasTaskRunning });
          }

          // 如果之前已连接且不是主动断开，尝试重连
          if (wasConnected && !this.isReconnecting && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.scheduleReconnect();
          }
        });
      } catch (error) {
        clearTimeout(connectionTimeout);
        reject(error);
      }
    });
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return; // 已经在重连中
    }

    this.reconnectAttempts++;
    this.isReconnecting = true;
    
    console.log(`将在 ${this.RECONNECT_DELAY}ms 后尝试第 ${this.reconnectAttempts} 次重连...`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.reconnect();
    }, this.RECONNECT_DELAY);
  }

  /**
   * 重新连接
   */
  private async reconnect(): Promise<void> {
    if (!this.config) {
      console.error('无法重连：配置为空');
      return;
    }

    try {
      console.log(`正在尝试重连... (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);
      await this.connect(this.config);
      console.log('重连成功');
      
      // 发出重连成功事件，让 AppStateManager 恢复任务
      this.emit('reconnected');
    } catch (error) {
      console.error('重连失败:', error);
      
      if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.scheduleReconnect();
      } else {
        console.error('已达到最大重连次数，放弃重连');
        this.isReconnecting = false;
        this.emit('error', new Error('连接失败：已达到最大重连次数'));
      }
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      const event = message.header?.event;

      switch (event) {
        case 'task-started':
          this.handleTaskStarted(message as TaskStartedEvent);
          break;
        case 'result-generated':
          this.handleResultGenerated(message as ResultGeneratedEvent);
          break;
        case 'task-finished':
          this.handleTaskFinished(message as TaskFinishedEvent);
          break;
        case 'task-failed':
          this.handleTaskFailed(message as TaskFailedEvent);
          break;
        default:
          console.log('未知事件:', event);
      }
    } catch (error) {
      console.error('消息解析错误:', error);
    }
  }

  /**
   * 处理 task-started 事件
   */
  private handleTaskStarted(event: TaskStartedEvent): void {
    console.log('任务已启动:', event.header.task_id);
    this.isTaskRunning = true;
    this.emit('task-started');
  }

  /**
   * 处理 result-generated 事件
   */
  private handleResultGenerated(event: ResultGeneratedEvent): void {
    const sentence = event.payload.output.sentence;
    
    const result: RecognitionResult = {
      text: sentence.text,
      sentenceEnd: sentence.sentence_end,
      beginTime: sentence.begin_time,
      endTime: sentence.end_time,
      words: sentence.words.map(word => ({
        text: word.text,
        beginTime: word.begin_time,
        endTime: word.end_time,
        punctuation: word.punctuation,
      })),
    };

    // 如果是最终结果，添加计费时长
    if (sentence.sentence_end && event.payload.usage) {
      result.duration = event.payload.usage.duration;
    }

    this.emit('result-generated', result);
  }

  /**
   * 处理 task-finished 事件
   */
  private handleTaskFinished(event: TaskFinishedEvent): void {
    console.log('任务已完成:', event.header.task_id);
    this.isTaskRunning = false;
    this.currentTaskId = null;
    this.emit('task-finished');
  }

  /**
   * 处理 task-failed 事件
   */
  private handleTaskFailed(event: TaskFailedEvent): void {
    console.error('任务失败:', event.header.error_message);
    
    const error: TaskError = {
      errorCode: event.header.error_code,
      errorMessage: event.header.error_message,
    };

    this.isTaskRunning = false;
    this.currentTaskId = null;
    this.emit('task-failed', error);

    // 按照 API 要求，task-failed 后需要关闭连接
    this.disconnect();
  }

  /**
   * 启动识别任务
   */
  public async startTask(taskId?: string): Promise<void> {
    if (!this.isConnected || !this.ws) {
      throw new Error('未连接到 FunASR 服务');
    }

    if (this.isTaskRunning) {
      throw new Error('已有任务正在运行');
    }

    // 生成 32 位 task_id
    this.currentTaskId = taskId || uuidv4().replace(/-/g, '').slice(0, 32);

    const runTaskMessage: RunTaskMessage = {
      header: {
        action: 'run-task',
        task_id: this.currentTaskId!,
        streaming: 'duplex',
      },
      payload: {
        task_group: 'audio',
        task: 'asr',
        function: 'recognition',
        model: this.config!.model,
        parameters: {
          format: 'pcm',
          sample_rate: 16000,
        },
        input: {},
      },
    };

    // 发送 run-task 指令
    this.ws.send(JSON.stringify(runTaskMessage));
    console.log('已发送 run-task 指令:', this.currentTaskId);

    // 等待 task-started 事件
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('等待 task-started 超时'));
      }, 10000); // 10 秒超时

      this.once('task-started', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.once('task-failed', (error: TaskError) => {
        clearTimeout(timeout);
        reject(new Error(`任务启动失败: ${error.errorMessage}`));
      });
    });
  }

  /**
   * 发送音频数据
   */
  public sendAudio(audioChunk: Buffer): void {
    if (!this.isConnected || !this.ws) {
      console.warn('未连接到 FunASR 服务，跳过音频数据');
      return;
    }

    if (!this.isTaskRunning) {
      console.warn('没有正在运行的任务，跳过音频数据');
      return;
    }

    // 检查 WebSocket 状态
    if (this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket 未处于打开状态，跳过音频数据');
      return;
    }

    try {
      // 发送二进制音频数据
      this.ws.send(audioChunk);
    } catch (error) {
      console.error('发送音频数据失败:', error);
      // 不抛出错误，避免中断录音流程
    }
  }

  /**
   * 结束任务
   */
  public finishTask(): void {
    if (!this.isConnected || !this.ws) {
      throw new Error('未连接到 FunASR 服务');
    }

    if (!this.currentTaskId) {
      throw new Error('没有正在运行的任务');
    }

    const finishTaskMessage: FinishTaskMessage = {
      header: {
        action: 'finish-task',
        task_id: this.currentTaskId,
        streaming: 'duplex',
      },
      payload: {
        input: {},
      },
    };

    // 发送 finish-task 指令
    this.ws.send(JSON.stringify(finishTaskMessage));
    console.log('已发送 finish-task 指令:', this.currentTaskId);
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    // 清除重连定时器
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // 标记为主动断开，防止自动重连
    this.isReconnecting = false;
    this.reconnectAttempts = this.MAX_RECONNECT_ATTEMPTS; // 设置为最大值，阻止重连
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isTaskRunning = false;
    this.currentTaskId = null;
    
    console.log('已断开 FunASR 连接');
  }

  /**
   * 获取连接状态
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * 获取任务运行状态
   */
  public getTaskStatus(): boolean {
    return this.isTaskRunning;
  }

  /**
   * 获取重连状态
   */
  public isReconnectingNow(): boolean {
    return this.isReconnecting;
  }
}
