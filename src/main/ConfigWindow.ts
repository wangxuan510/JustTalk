import { BrowserWindow } from 'electron';
import * as path from 'path';

export class ConfigWindow {
  private window: BrowserWindow | null = null;

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
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    // 加载配置页面
    this.window.loadFile(path.join(__dirname, '../renderer/config.html'));

    // 窗口关闭时清理
    this.window.on('closed', () => {
      this.window = null;
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
   * 获取窗口实例
   */
  public getWindow(): BrowserWindow | null {
    return this.window;
  }
}
