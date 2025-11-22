import { AppState, AppConfig, RecognitionResult, TaskError } from '../types';
import { FunASRClient } from './FunASRClient';
import { AudioCapture } from './AudioCapture';
import { TextInjector } from './TextInjector';
import { StatusIndicator } from './StatusIndicator';
import { dialog } from 'electron';

export class AppStateManager {
  private state: AppState = 'idle';
  private config: AppConfig;
  
  // 组件
  private funasrClient: FunASRClient;
  private audioCapture: AudioCapture;
  private textInjector: TextInjector;
  private statusIndicator: StatusIndicator;

  // 当前识别的文本（用于实时更新）
  private currentText: string = '';
  private lastTypedLength: number = 0; // 上次输入的字符数

  constructor(config: AppConfig) {
    this.config = config;

    // 初始化组件
    this.funasrClient = new FunASRClient();
    this.audioCapture = new AudioCapture(config.audio);
    this.textInjector = new TextInjector();
    this.statusIndicator = new StatusIndicator(config.ui.indicatorPosition);

    // 设置事件监听
    this.setupEventListeners();
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    // FunASR 事件
    this.funasrClient.on('task-started', () => {
      console.log('FunASR 任务已启动');
      this.statusIndicator.updateStatus('listening');
    });

    this.funasrClient.on('result-generated', (result: RecognitionResult) => {
      this.handleRecognitionResult(result);
    });

    this.funasrClient.on('task-finished', () => {
      console.log('FunASR 任务已完成');
    });

    this.funasrClient.on('task-failed', (error: TaskError) => {
      this.handleError(`FunASR 任务失败: ${error.errorMessage}`);
    });

    this.funasrClient.on('error', (error: Error) => {
      // 忽略 write EIO 错误（连接已关闭时的写入错误）
      if (error.message && error.message.includes('write EIO')) {
        console.warn('WebSocket 连接已关闭，忽略写入错误');
        return;
      }
      this.handleError(`FunASR 错误: ${error.message}`);
    });

    // 音频捕获事件
    this.audioCapture.on('data', (chunk: Buffer) => {
      this.handleAudioData(chunk);
    });

    this.audioCapture.on('error', (error: Error) => {
      const errorMessage = error && error.message ? error.message : '未知错误';
      this.handleError(`音频捕获错误: ${errorMessage}`);
    });
  }

  /**
   * 激活语音识别
   */
  public async activate(): Promise<void> {
    // 防止重复激活
    if (this.state === 'active') {
      console.log('语音识别已经在运行中');
      return;
    }

    try {
      console.log('开始激活语音识别...');

      // 检查是否有活动输入框
      if (!this.textInjector.hasActiveInputField()) {
        this.showError('请先点击一个输入框');
        return;
      }

      // 更新状态
      this.state = 'active';

      // 显示状态指示器
      this.statusIndicator.show();
      this.statusIndicator.updateStatus('processing');

      // 连接到 FunASR（如果尚未连接）
      if (!this.funasrClient.getConnectionStatus()) {
        console.log('连接到 FunASR 服务...');
        await this.funasrClient.connect({
          apiKey: this.config.funASR.apiKey,
          url: this.config.funASR.url,
          model: this.config.funASR.model,
        });
      }

      // 启动识别任务
      console.log('启动识别任务...');
      await this.funasrClient.startTask();

      // 启动音频捕获
      console.log('启动音频捕获...');
      await this.audioCapture.start();

      console.log('语音识别已激活');
    } catch (error) {
      this.handleError(`激活失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 停止语音识别
   */
  public deactivate(): void {
    if (this.state !== 'active') {
      console.log('语音识别未运行');
      return;
    }

    try {
      console.log('停止语音识别...');

      // 停止音频捕获
      this.audioCapture.stop();

      // 结束 FunASR 任务
      if (this.funasrClient.getTaskStatus()) {
        this.funasrClient.finishTask();
      }

      // 隐藏状态指示器
      this.statusIndicator.hide();

      // 更新状态
      this.state = 'idle';

      // 清空当前文本
      this.currentText = '';
      this.lastTypedLength = 0;

      console.log('语音识别已停止');
    } catch (error) {
      console.error('停止失败:', error);
      this.handleError(`停止失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 处理音频数据
   */
  private handleAudioData(chunk: Buffer): void {
    try {
      // 将音频数据发送到 FunASR
      if (this.funasrClient.getTaskStatus()) {
        this.funasrClient.sendAudio(chunk);
      }
    } catch (error) {
      console.error('发送音频数据失败:', error);
    }
  }

  /**
   * 处理识别结果
   */
  private async handleRecognitionResult(result: RecognitionResult): Promise<void> {
    console.log('识别结果:', result.text);

    // 如果不在激活状态，忽略识别结果
    if (this.state !== 'active') {
      console.log('应用未激活，忽略识别结果');
      return;
    }

    try {
      const newText = result.text.trim();
      
      // 如果是空白结果，标记为新句子开始，但不输入任何内容
      if (newText.length === 0) {
        // 重置当前句子状态，准备接收新句子
        // 注意：不重置 lastTypedLength，因为之前的文字还在输入框里
        this.currentText = '';
        return;
      }
      
      const oldText = this.currentText;
      let textToAdd = '';
      let isNewSentence = false;
      
      if (oldText.length === 0) {
        // 新句子开始，直接输入全部文本
        textToAdd = newText;
        isNewSentence = true;
      } else if (newText.startsWith(oldText)) {
        // 新文本是旧文本的扩展，只输入新增部分
        textToAdd = newText.substring(oldText.length);
      } else if (oldText.startsWith(newText)) {
        // 新文本是旧文本的前缀（识别修正变短了），删除多余部分
        const deleteCount = oldText.length - newText.length;
        if (deleteCount > 0 && deleteCount <= 50) { // 最多删除50个字符
          console.log(`识别修正（变短）：删除 ${deleteCount} 个字符`);
          await this.textInjector.deleteText(deleteCount);
          this.lastTypedLength -= deleteCount;
        }
        textToAdd = ''; // 不需要输入新内容
      } else {
        // 新文本与旧文本完全不同
        // 判断是识别修正还是新句子（通过相似度）
        const maxLen = Math.max(oldText.length, newText.length);
        const minLen = Math.min(oldText.length, newText.length);
        const similarity = minLen / maxLen;
        
        if (similarity > 0.3 && oldText.length > 0) {
          // 相似度 > 30%，可能是识别修正，删除旧文本重新输入
          const deleteCount = Math.min(this.lastTypedLength, 100);
          if (deleteCount > 0) {
            console.log(`识别修正：删除 ${deleteCount} 个字符，重新输入`);
            await this.textInjector.deleteText(deleteCount);
            this.lastTypedLength = 0;
          }
          textToAdd = newText;
        } else {
          // 相似度低，是新句子，直接追加
          console.log('检测到新句子，直接追加');
          textToAdd = newText;
          isNewSentence = true;
        }
      }
      
      // 输入新增的文字
      if (textToAdd.length > 0) {
        await this.textInjector.typeText(textToAdd);
        
        if (isNewSentence) {
          // 新句子，重新计数
          this.lastTypedLength = textToAdd.length;
        } else {
          // 同一句话的扩展，累加计数
          this.lastTypedLength += textToAdd.length;
        }
      }
      
      // 更新当前文本
      this.currentText = newText;
    } catch (error) {
      console.error('处理识别结果失败:', error);
      
      // 如果输入失败，尝试使用剪贴板
      this.textInjector.copyToClipboard(result.text);
      this.showError('文字输入失败，已复制到剪贴板，请手动粘贴');
    }
  }

  /**
   * 处理错误
   */
  private handleError(message: string): void {
    console.error(message);
    
    // 避免重复处理错误
    if (this.state === 'error') {
      return;
    }
    
    this.state = 'error';
    this.statusIndicator.updateStatus('error');
    
    // 显示错误消息
    this.showError(message);

    // 清理资源
    setTimeout(() => {
      this.deactivate();
      this.state = 'idle'; // 重置状态
    }, 2000);
  }

  /**
   * 显示错误消息
   */
  private showError(message: string): void {
    dialog.showErrorBox('语音转文字工具', message);
  }

  /**
   * 获取当前状态
   */
  public getState(): AppState {
    return this.state;
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.deactivate();
    this.funasrClient.disconnect();
    this.statusIndicator.destroy();
  }
}
