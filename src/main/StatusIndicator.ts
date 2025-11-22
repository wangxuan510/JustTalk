import { BrowserWindow, screen } from 'electron';
import * as path from 'path';

export type IndicatorStatus = 'listening' | 'processing' | 'error';

export class StatusIndicator {
  private window: BrowserWindow | null = null;
  private position: string;

  constructor(position: string = 'top-right') {
    this.position = position;
  }

  /**
   * 创建状态指示器窗口
   */
  private createWindow(): void {
    if (this.window) {
      return;
    }

    // 获取屏幕尺寸
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    // 窗口尺寸
    const windowWidth = 120;
    const windowHeight = 120;

    // 根据位置计算坐标
    let x = 0;
    let y = 0;

    switch (this.position) {
      case 'top-right':
        x = screenWidth - windowWidth - 20;
        y = 20;
        break;
      case 'top-left':
        x = 20;
        y = 20;
        break;
      case 'bottom-right':
        x = screenWidth - windowWidth - 20;
        y = screenHeight - windowHeight - 20;
        break;
      case 'bottom-left':
        x = 20;
        y = screenHeight - windowHeight - 20;
        break;
      default:
        x = screenWidth - windowWidth - 20;
        y = 20;
    }

    // 创建窗口
    this.window = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x,
      y,
      frame: false,              // 无边框
      transparent: true,         // 透明背景
      alwaysOnTop: true,        // 置顶
      resizable: false,         // 不可调整大小
      movable: false,           // 不可移动
      minimizable: false,       // 不可最小化
      maximizable: false,       // 不可最大化
      closable: false,          // 不可关闭（通过窗口按钮）
      skipTaskbar: true,        // 不显示在任务栏
      hasShadow: false,         // 无阴影
      focusable: false,         // 不可获得焦点
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    // 加载 HTML
    this.window.loadFile(path.join(__dirname, '../renderer/index.html'));

    // 窗口关闭时清理
    this.window.on('closed', () => {
      this.window = null;
    });

    // 初始状态为隐藏
    this.window.hide();
  }

  /**
   * 显示指示器
   */
  public show(): void {
    if (!this.window) {
      this.createWindow();
    }

    if (this.window) {
      this.window.show();
    }
  }

  /**
   * 隐藏指示器
   */
  public hide(): void {
    if (this.window) {
      this.window.hide();
    }
  }

  /**
   * 更新状态
   */
  public updateStatus(status: IndicatorStatus): void {
    if (this.window && this.window.webContents) {
      this.window.webContents.send('update-status', status);
    }
  }

  /**
   * 销毁窗口
   */
  public destroy(): void {
    if (this.window) {
      this.window.destroy();
      this.window = null;
    }
  }

  /**
   * 检查窗口是否可见
   */
  public isVisible(): boolean {
    return this.window !== null && this.window.isVisible();
  }

  /**
   * 更新位置
   */
  public updatePosition(position: string): void {
    this.position = position;
    
    if (this.window) {
      // 销毁旧窗口并创建新窗口
      const wasVisible = this.isVisible();
      this.destroy();
      this.createWindow();
      
      if (wasVisible) {
        this.show();
      }
    }
  }
}
