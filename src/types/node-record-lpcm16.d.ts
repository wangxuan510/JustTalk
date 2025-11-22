declare module 'node-record-lpcm16' {
  interface RecordOptions {
    sampleRate?: number;
    channels?: number;
    audioType?: string;
    recorder?: string;
    device?: string | null;
  }

  interface Recording {
    stream(): NodeJS.ReadableStream;
  }

  export function record(options?: RecordOptions): Recording;
  export function stop(): void;
}
