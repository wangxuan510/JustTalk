import { EventEmitter } from 'events';
import * as record from 'node-record-lpcm16';
import { AudioConfig } from '../types';

export class AudioCapture extends EventEmitter {
  private recording: any = null;
  private isRecording: boolean = false;
  private audioConfig: AudioConfig;

  constructor(audioConfig: AudioConfig) {
    super();
    this.audioConfig = audioConfig;
  }

  /**
   * 开始录音
   */
  public async start(): Promise<void> {
    if (this.isRecording) {
      console.log('录音已经在进行中');
      return;
    }

    try {
      // 检查麦克风权限（macOS）
      await this.checkMicrophonePermission();

      // 配置录音参数
      const recordOptions = {
        sampleRate: this.audioConfig.sampleRate,
        channels: this.audioConfig.channels,
        audioType: 'raw', // PCM 原始数据
        recorder: 'sox',  // 使用 sox 作为录音器（macOS 兼容）
        device: null,     // 使用默认麦克风
      };

      // 开始录音
      this.recording = record.record(recordOptions);

      // 获取音频流
      const audioStream = this.recording.stream();
      
      if (!audioStream) {
        throw new Error('无法获取音频流');
      }

      // 监听音频数据流
      audioStream.on('data', (chunk: Buffer) => {
        this.emit('data', chunk);
      });

      // 监听错误
      audioStream.on('error', (error: Error) => {
        console.error('录音错误:', error);
        this.emit('error', error);
        this.stop();
      });

      // 监听流结束
      audioStream.on('end', () => {
        console.log('音频流已结束');
        this.isRecording = false;
      });

      this.isRecording = true;
      console.log('录音已启动');
    } catch (error) {
      console.error('启动录音失败:', error);
      throw error;
    }
  }

  /**
   * 停止录音
   */
  public stop(): void {
    if (!this.isRecording) {
      console.log('录音未在进行中');
      return;
    }

    try {
      // 停止录音流
      if (this.recording && this.recording.stream()) {
        this.recording.stream().unpipe();
        this.recording.stream().removeAllListeners();
      }
      
      // 调用全局 stop 方法
      record.stop();
      
      this.recording = null;
      this.isRecording = false;
      console.log('录音已停止');
    } catch (error) {
      console.error('停止录音失败:', error);
      // 即使出错也要重置状态
      this.recording = null;
      this.isRecording = false;
    }
  }

  /**
   * 检查麦克风权限（macOS）
   */
  private async checkMicrophonePermission(): Promise<void> {
    // 权限检查将由 PermissionManager 在应用启动时处理
    // 这里只是一个占位符，确保录音前权限已授予
    return Promise.resolve();
  }

  /**
   * 获取录音状态
   */
  public getRecordingStatus(): boolean {
    return this.isRecording;
  }

  /**
   * 获取音频配置
   */
  public getAudioConfig(): AudioConfig {
    return this.audioConfig;
  }

  /**
   * 计算音频数据的音量（0-1 范围）
   */
  public static calculateVolume(buffer: Buffer): number {
    if (!buffer || buffer.length === 0) {
      return 0;
    }

    // 将 Buffer 转换为 16 位 PCM 样本
    const samples = new Int16Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.length / 2
    );

    // 计算 RMS（均方根）音量
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      const normalized = samples[i] / 32768; // 归一化到 -1 到 1
      sum += normalized * normalized;
    }

    const rms = Math.sqrt(sum / samples.length);
    
    // 应用对数缩放，使音量变化更明显
    // 并限制在 0-1 范围内
    const volume = Math.min(1, rms * 5);
    
    return volume;
  }
}
