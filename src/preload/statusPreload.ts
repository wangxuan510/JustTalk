import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 监听状态更新
  onUpdateStatus: (callback: (status: string) => void) => {
    ipcRenderer.on('update-status', (_event, status) => callback(status));
  },
  
  // 监听音量更新
  onUpdateVolume: (callback: (volume: number) => void) => {
    ipcRenderer.on('update-volume', (_event, volume) => callback(volume));
  },
});

// 类型定义
declare global {
  interface Window {
    electronAPI: {
      onUpdateStatus: (callback: (status: string) => void) => void;
      onUpdateVolume: (callback: (volume: number) => void) => void;
    };
  }
}
