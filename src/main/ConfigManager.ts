import * as fs from 'fs';
import * as path from 'path';
import { AppConfig } from '../types';

export class ConfigManager {
  private config: AppConfig | null = null;
  private configPath: string;

  constructor(configPath?: string) {
    // 默认配置文件路径
    this.configPath = configPath || path.join(process.cwd(), 'config.json');
  }

  /**
   * 加载配置文件
   */
  public loadConfig(): AppConfig {
    try {
      // 读取配置文件
      const configData = fs.readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(configData);

      // 从环境变量读取 API Key（优先级更高）
      const envApiKey = process.env.DASHSCOPE_API_KEY;
      if (envApiKey && this.config) {
        this.config.funASR.apiKey = envApiKey;
      }

      // 验证配置
      this.validateConfig(this.config!);

      return this.config!;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`配置加载失败: ${error.message}`);
      }
      throw new Error('配置加载失败');
    }
  }

  /**
   * 验证配置的完整性和正确性
   */
  private validateConfig(config: AppConfig): void {
    // 检查 API Key
    if (!config.funASR.apiKey || config.funASR.apiKey.trim() === '') {
      throw new Error(
        'API Key 未配置。请设置环境变量 DASHSCOPE_API_KEY 或在 config.json 中配置 funASR.apiKey'
      );
    }

    // 检查 URL
    if (!config.funASR.url || !config.funASR.url.startsWith('wss://')) {
      throw new Error('FunASR URL 配置错误，必须是 wss:// 开头的 WebSocket 地址');
    }

    // 检查模型
    if (!config.funASR.model) {
      throw new Error('FunASR 模型未配置');
    }

    // 检查快捷键
    if (!config.hotkeys.activate || !config.hotkeys.deactivate) {
      throw new Error('快捷键配置不完整');
    }

    // 检查音频配置
    if (config.audio.sampleRate !== 16000) {
      throw new Error('音频采样率必须为 16000 Hz（FunASR 要求）');
    }

    if (config.audio.channels !== 1) {
      throw new Error('音频必须为单声道（FunASR 要求）');
    }
  }

  /**
   * 获取当前配置
   */
  public getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('配置尚未加载，请先调用 loadConfig()');
    }
    return this.config;
  }

  /**
   * 保存配置到文件
   */
  public saveConfig(config: AppConfig): void {
    try {
      // 不保存从环境变量读取的 API Key
      const configToSave = { ...config };
      if (process.env.DASHSCOPE_API_KEY) {
        configToSave.funASR.apiKey = '';
      }

      fs.writeFileSync(
        this.configPath,
        JSON.stringify(configToSave, null, 2),
        'utf-8'
      );
      this.config = config;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`配置保存失败: ${error.message}`);
      }
      throw new Error('配置保存失败');
    }
  }

  /**
   * 检查配置文件是否存在
   */
  public configExists(): boolean {
    return fs.existsSync(this.configPath);
  }

  /**
   * 创建默认配置文件
   */
  public createDefaultConfig(): void {
    const defaultConfig: AppConfig = {
      funASR: {
        apiKey: '',
        url: 'wss://dashscope.aliyuncs.com/api-ws/v1/inference',
        model: 'fun-asr-realtime',
      },
      hotkeys: {
        activate: 'CommandOrControl+Shift+V',
        deactivate: 'CommandOrControl+Shift+S',
      },
      audio: {
        sampleRate: 16000,
        channels: 1,
        bitDepth: 16,
        encoding: 'signed-integer',
      },
      ui: {
        indicatorPosition: 'top-right',
      },
    };

    this.saveConfig(defaultConfig);
  }
}
