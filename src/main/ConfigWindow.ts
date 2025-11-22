import { BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

export class ConfigWindow {
  private window: BrowserWindow | null = null;
  private ipcHandler: ((event: any) => void) | null = null;

  /**
   * 创建配置窗口
   */
  public create(): void {
    if (this.window) {
      this.window.focus();
      return;
    }

    this.window = new BrowserWindow({
      width: 700,
      height: 600,
      resizable: false,
      minimizable: false,
      maximizable: false,
      title: '配置 - 语音转文字工具',
      webPreferences: {
        nodeIntegration: false,  // 禁用 Node 集成（安全）
        contextIsolation: true,  // 启用上下文隔离（安全）
        preload: path.join(__dirname, '../preload/configPreload.js'),
      },
    });

    // 加载配置页面
    this.window.loadFile(path.join(__dirname, '../renderer/config.html'));

    // 移除旧的 IPC 监听器（如果存在）
    if (this.ipcHandler) {
      ipcMain.removeListener('close-config-window', this.ipcHandler);
    }

    // 注册新的 IPC 监听器
    this.ipcHandler = () => this.close();
    ipcMain.on('close-config-window', this.ipcHandler);

    // 窗口关闭时清理
    this.window.on('closed', () => {
      this.cleanup();
    });
  }

  /**
   * 显示窗口
   */
  public show(): void {
    if (!this.window) {
      this.create();
    } else {
      this.window.focus();
    }
  }

  /**
   * 关闭窗口
   */
  public close(): void {
    if (this.window) {
      this.window.close();
    }
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    // 移除 IPC 监听器，防止内存泄漏
    if (this.ipcHandler) {
      ipcMain.removeListener('close-config-window', this.ipcHandler);
      this.ipcHandler = null;
    }
    
    this.window = null;
  }

  /**
   * 获取窗口实例
   */
  public getWindow(): BrowserWindow | null {
    return this.window;
  }
}
