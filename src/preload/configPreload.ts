import { contextBridge, ipcRenderer } from 'electron';

/**
 * 安全的配置 API
 * 所有文件操作都通过 IPC 在主进程中处理，避免在 Preload 中直接访问文件系统
 */
contextBridge.exposeInMainWorld('configAPI', {
  // 加载配置（通过 IPC 调用主进程）
  loadConfig: (): Promise<any> => {
    return ipcRenderer.invoke('load-config');
  },
  
  // 保存配置（通过 IPC 调用主进程）
  saveConfig: (config: any): Promise<boolean> => {
    return ipcRenderer.invoke('save-config', config);
  },
  
  // 关闭窗口
  closeWindow: () => {
    ipcRenderer.send('close-config-window');
  },
});

// 类型定义
declare global {
  interface Window {
    configAPI: {
      loadConfig: () => Promise<any>;
      saveConfig: (config: any) => Promise<boolean>;
      closeWindow: () => void;
    };
  }
}
