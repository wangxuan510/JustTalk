// 应用状态类型
export type AppState = 'idle' | 'active' | 'error';

// 音频配置
export interface AudioConfig {
  sampleRate: number;      // 16000 Hz
  channels: number;        // 1 (单声道)
  bitDepth: number;        // 16 bit
  encoding: string;        // 'signed-integer'
}

// FunASR 配置
export interface FunASRConfig {
  apiKey: string;  // DashScope API Key
  url: string;     // wss://dashscope.aliyuncs.com/api-ws/v1/inference
  model: string;   // 'fun-asr-realtime' 或 'fun-asr-realtime-2025-11-07'
}

// 应用配置
export interface AppConfig {
  funASR: FunASRConfig;
  hotkeys: {
    activate: string;      // 'CommandOrControl+Shift+V'
    deactivate: string;    // 'CommandOrControl+Shift+S'
  };
  audio: AudioConfig;
  ui: {
    indicatorPosition: string;  // 'top-right'
  };
}

// 识别结果
export interface RecognitionResult {
  text: string;              // 识别的文本
  sentenceEnd: boolean;      // 是否为句子结束（最终结果）
  beginTime: number;         // 句子开始时间（ms）
  endTime: number | null;    // 句子结束时间（ms），中间结果为 null
  words: WordTimestamp[];    // 字级别时间戳
  duration?: number;         // 计费时长（秒），仅在 sentenceEnd=true 时存在
}

// 字时间戳
export interface WordTimestamp {
  text: string;
  beginTime: number;
  endTime: number;
  punctuation: string;
}

// 任务错误
export interface TaskError {
  errorCode: string;
  errorMessage: string;
}

// FunASR 消息类型
export interface RunTaskMessage {
  header: {
    action: 'run-task';
    task_id: string;
    streaming: 'duplex';
  };
  payload: {
    task_group: 'audio';
    task: 'asr';
    function: 'recognition';
    model: string;
    parameters: {
      format: 'pcm';
      sample_rate: 16000;
    };
    input: {};
  };
}

export interface FinishTaskMessage {
  header: {
    action: 'finish-task';
    task_id: string;
    streaming: 'duplex';
  };
  payload: {
    input: {};
  };
}

// FunASR 事件类型
export interface TaskStartedEvent {
  header: {
    task_id: string;
    event: 'task-started';
    attributes: {};
  };
  payload: {};
}

export interface ResultGeneratedEvent {
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
      duration: number;
    } | null;
  };
}

export interface TaskFinishedEvent {
  header: {
    task_id: string;
    event: 'task-finished';
    attributes: {};
  };
  payload: {
    output: {};
  };
}

export interface TaskFailedEvent {
  header: {
    task_id: string;
    event: 'task-failed';
    error_code: string;
    error_message: string;
    attributes: {};
  };
  payload: {};
}
