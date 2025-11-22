import { AppState, AppConfig, RecognitionResult, TaskError } from '../types';
import { FunASRClient } from './FunASRClient';
import { AudioCapture } from './AudioCapture';
import { TextInjector } from './TextInjector';
import { StatusIndicator } from './StatusIndicator';
import { dialog } from 'electron';
import * as robot from 'robotjs';

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

  // 重连期间的音频缓冲区
  private reconnectionBuffer: Buffer[] = [];
  private isInReconnection: boolean = false;

  // P0 修复：防止状态竞争
  private isActivating: boolean = false;
  private isDeactivating: boolean = false;

  constructor(config: AppConfig) {
    this.config = config;

    // 初始化组件
    this.funasrClient = new FunASRClient();
    this.audioCapture = new AudioCapture(config.audio);
    this.textInjector = new TextInjector();
    this.statusIndicator = new StatusIndicator();

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

    // 重连事件处理
    this.funasrClient.on('disconnected', (info: { wasTaskRunning: boolean }) => {
      console.log('WebSocket 连接断开，任务运行状态:', info.wasTaskRunning);
      
      // 如果在激活状态且任务正在运行，标记为重连中
      if (this.state === 'active' && info.wasTaskRunning) {
        this.isInReconnection = true;
        this.statusIndicator.updateStatus('error'); // 显示错误状态
        console.log('进入重连模式，开始缓存音频数据');
      }
    });

    this.funasrClient.on('reconnected', async () => {
      console.log('WebSocket 重连成功');
      
      // 如果在激活状态，恢复任务
      if (this.state === 'active') {
        try {
          console.log('正在恢复识别任务...');
          await this.funasrClient.startTask();
          
          // 发送缓存的音频数据
          if (this.reconnectionBuffer.length > 0) {
            console.log(`发送重连期间缓存的音频数据: ${this.reconnectionBuffer.length} 个块`);
            const bufferedData = Buffer.concat(this.reconnectionBuffer);
            this.funasrClient.sendAudio(bufferedData);
            this.reconnectionBuffer = [];
          }
          
          this.isInReconnection = false;
          this.statusIndicator.updateStatus('listening'); // 恢复监听状态
          console.log('任务已恢复，继续识别');
        } catch (error) {
          console.error('恢复任务失败:', error);
          this.handleError('重连后无法恢复任务');
        }
      }
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
   * 激活语音识别（P0 修复：防止状态竞争）
   */
  public async activate(): Promise<void> {
    // 防止重复激活或正在激活
    if (this.state === 'active' || this.isActivating) {
      console.log('语音识别已经在运行中或正在激活');
      return;
    }

    // 如果正在停止，等待停止完成
    if (this.isDeactivating) {
      console.log('正在停止中，等待停止完成后再激活');
      await this.waitForDeactivation();
    }

    this.isActivating = true;

    try {
      console.log('开始激活语音识别...');

      // 检查是否有活动输入框
      if (!this.textInjector.hasActiveInputField()) {
        this.showError('请先点击一个输入框');
        return;
      }

      // 更新状态
      this.state = 'active';

      // 获取鼠标位置并显示状态指示器
      const mousePos = robot.getMousePos();
      this.statusIndicator.show(mousePos.x, mousePos.y);
      this.statusIndicator.updateStatus('listening');

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

      // 重新激活输入框：模拟点击当前鼠标位置
      // 这样可以恢复输入框的焦点
      await this.textInjector.refocusInputField();

      console.log('语音识别已激活');
    } catch (error) {
      this.handleError(`激活失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      this.isActivating = false;
    }
  }

  /**
   * 等待停止完成
   */
  private async waitForDeactivation(): Promise<void> {
    const maxWait = 5000; // 最多等待 5 秒
    const startTime = Date.now();
    
    while (this.isDeactivating && Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * 停止语音识别（P0 修复：防止状态竞争）
   */
  public deactivate(): void {
    // 如果正在激活，等待激活完成后再停止
    if (this.isActivating) {
      console.log('正在激活中，延迟停止');
      setTimeout(() => this.deactivate(), 200);
      return;
    }

    if (this.state !== 'active' || this.isDeactivating) {
      console.log('语音识别未运行或正在停止');
      return;
    }

    this.isDeactivating = true;

    try {
      console.log('停止语音识别...');

      // 停止音频捕获
      this.audioCapture.stop();

      // 发送剩余的音频数据
      if (this.audioBuffer.length > 0 && this.funasrClient.getTaskStatus()) {
        const audioData = Buffer.concat(this.audioBuffer);
        this.funasrClient.sendAudio(audioData);
      }

      // 清空音频缓冲区
      this.audioBuffer = [];
      this.audioBufferSize = 0;

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
    } finally {
      this.isDeactivating = false;
    }
  }

  // 音频缓冲区（用于累积音频数据）
  private audioBuffer: Buffer[] = [];
  private audioBufferSize: number = 0;
  private readonly MIN_AUDIO_CHUNK_SIZE = 3200; // 最小发送块大小（约 100ms @ 16kHz）
  private readonly MAX_AUDIO_BUFFER_SIZE = 640000; // 最大缓冲区大小（约 20 秒音频）
  private readonly MAX_RECONNECTION_BUFFER_SIZE = 320000; // 重连缓冲区最大大小（约 10 秒）
  private readonly MAX_TOTAL_BUFFER_SIZE = 960000; // 总缓冲区最大大小（约 30 秒）

  // P0 修复：音量计算优化
  private volumeCalculationCounter = 0;
  private readonly VOLUME_CALC_INTERVAL = 3; // 每 3 个块计算一次音量

  /**
   * 处理音频数据（P0 修复：严格的缓冲区管理）
   */
  private handleAudioData(chunk: Buffer): void {
    try {
      // P0 修复：降低音量计算频率
      this.volumeCalculationCounter++;
      if (this.volumeCalculationCounter >= this.VOLUME_CALC_INTERVAL) {
        const volume = AudioCapture.calculateVolume(chunk);
        this.statusIndicator.updateVolume(volume);
        this.volumeCalculationCounter = 0;
      }

      // P0 修复：检查总缓冲区大小，防止内存溢出
      const reconnectionBufferSize = this.reconnectionBuffer.reduce((sum, buf) => sum + buf.length, 0);
      const totalBufferSize = this.audioBufferSize + reconnectionBufferSize;
      
      if (totalBufferSize > this.MAX_TOTAL_BUFFER_SIZE) {
        console.error('总缓冲区大小超限，强制清理以防止内存溢出');
        // 清空所有缓冲区
        this.audioBuffer = [];
        this.audioBufferSize = 0;
        this.reconnectionBuffer = [];
        // 显示错误状态
        this.statusIndicator.updateStatus('error');
        return;
      }

      // 如果正在重连，缓存音频数据
      if (this.isInReconnection) {
        // P0 修复：更严格的重连缓冲区限制
        if (reconnectionBufferSize + chunk.length > this.MAX_RECONNECTION_BUFFER_SIZE) {
          console.warn('重连缓冲区已满，丢弃最旧的数据');
          // 丢弃最旧的块，直到有足够空间
          while (this.reconnectionBuffer.length > 0 && 
                 reconnectionBufferSize + chunk.length > this.MAX_RECONNECTION_BUFFER_SIZE) {
            const removed = this.reconnectionBuffer.shift();
            if (removed) {
              // 重新计算大小
              const newSize = this.reconnectionBuffer.reduce((sum, buf) => sum + buf.length, 0);
              console.log(`丢弃 ${removed.length} 字节，剩余 ${newSize} 字节`);
            }
          }
        }
        
        this.reconnectionBuffer.push(chunk);
        console.log(`重连中，缓存音频数据: ${this.reconnectionBuffer.length} 个块`);
        return; // 重连期间不发送数据
      }

      // 检查缓冲区是否已满
      if (this.audioBufferSize + chunk.length > this.MAX_AUDIO_BUFFER_SIZE) {
        console.warn('音频缓冲区已满，丢弃旧数据以防止内存溢出');
        
        // 丢弃最旧的数据块
        const overflow = this.audioBufferSize + chunk.length - this.MAX_AUDIO_BUFFER_SIZE;
        let removed = 0;
        
        while (removed < overflow && this.audioBuffer.length > 0) {
          const oldChunk = this.audioBuffer.shift();
          if (oldChunk) {
            removed += oldChunk.length;
            this.audioBufferSize -= oldChunk.length;
          }
        }
      }

      // 累积音频数据
      this.audioBuffer.push(chunk);
      this.audioBufferSize += chunk.length;

      // 当累积的音频数据达到最小块大小时，发送到 FunASR
      if (this.audioBufferSize >= this.MIN_AUDIO_CHUNK_SIZE) {
        const audioData = Buffer.concat(this.audioBuffer);
        
        if (this.funasrClient.getTaskStatus()) {
          this.funasrClient.sendAudio(audioData);
        }

        // 清空缓冲区
        this.audioBuffer = [];
        this.audioBufferSize = 0;
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
          // 相似度 > 30%，可能是识别修正
          // 找出不同的部分，只更新差异
          let commonPrefixLen = 0;
          const minLength = Math.min(oldText.length, newText.length);
          
          // 找出相同的前缀长度
          for (let i = 0; i < minLength; i++) {
            if (oldText[i] === newText[i]) {
              commonPrefixLen++;
            } else {
              break;
            }
          }
          
          // 计算需要删除和添加的部分
          const deleteCount = oldText.length - commonPrefixLen;
          const addText = newText.substring(commonPrefixLen);
          
          if (deleteCount > 0) {
            console.log(`识别修正：删除 ${deleteCount} 个字符，添加 "${addText}"`);
            await this.textInjector.deleteText(deleteCount);
          }
          
          textToAdd = addText;
        } else {
          // 相似度低，是新句子，直接追加
          console.log('检测到新句子，直接追加');
          textToAdd = newText;
          isNewSentence = true;
        }
      }
      
      // 输入新增的文字
      if (textToAdd.length > 0) {
        console.log(`准备输入文字: "${textToAdd}"`);
        try {
          await this.textInjector.typeText(textToAdd);
          console.log('文字输入成功');
        } catch (error) {
          console.error('文字输入失败:', error);
          throw error;
        }
      }
      
      // 更新当前文本和计数
      this.currentText = newText;
      
      if (isNewSentence) {
        // 新句子，重新计数（只记录当前句子的长度）
        this.lastTypedLength = newText.length;
      } else {
        // 同一句话，更新为当前句子的总长度
        this.lastTypedLength = newText.length;
      }
    } catch (error) {
      console.error('处理识别结果失败:', error);
      
      // 如果输入失败，尝试使用剪贴板
      this.textInjector.copyToClipboard(result.text);
      this.showError('文字输入失败，已复制到剪贴板，请手动粘贴');
    }
  }

  // 错误恢复定时器
  private errorRecoveryTimeout: NodeJS.Timeout | null = null;
  private readonly ERROR_RECOVERY_DELAY = 2000; // 2 秒

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
    
    // 显示错误消息
    this.showError(message);

    // 清除之前的恢复定时器
    if (this.errorRecoveryTimeout) {
      clearTimeout(this.errorRecoveryTimeout);
    }

    // 延迟清理资源，避免状态竞争
    this.errorRecoveryTimeout = setTimeout(() => {
      // 再次检查状态，确保没有被其他操作改变
      if (this.state === 'error') {
        this.deactivate();
        this.state = 'idle';
      }
      this.errorRecoveryTimeout = null;
    }, this.ERROR_RECOVERY_DELAY);
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
    // 清除错误恢复定时器
    if (this.errorRecoveryTimeout) {
      clearTimeout(this.errorRecoveryTimeout);
      this.errorRecoveryTimeout = null;
    }
    
    // 清空重连缓冲区
    this.reconnectionBuffer = [];
    this.isInReconnection = false;
    
    // 停止语音识别
    this.deactivate();
    
    // 移除所有事件监听器，防止内存泄漏
    this.funasrClient.removeAllListeners();
    this.audioCapture.removeAllListeners();
    
    // 断开连接和销毁窗口
    this.funasrClient.disconnect();
    this.statusIndicator.destroy();
    
    console.log('AppStateManager 资源已清理');
  }
}
