import { globalShortcut } from 'electron';

export class HotkeyManager {
  private activationHotkey: string;
  private deactivationHotkey: string;
  private activationCallback: (() => void) | null = null;
  private deactivationCallback: (() => void) | null = null;

  constructor(activationHotkey: string, deactivationHotkey: string) {
    this.activationHotkey = activationHotkey;
    this.deactivationHotkey = deactivationHotkey;
  }

  /**
   * 注册激活快捷键
   */
  public registerActivationHotkey(callback: () => void): boolean {
    try {
      this.activationCallback = callback;
      
      const success = globalShortcut.register(this.activationHotkey, () => {
        console.log(`激活快捷键被按下: ${this.activationHotkey}`);
        if (this.activationCallback) {
          this.activationCallback();
        }
      });

      if (success) {
        console.log(`激活快捷键注册成功: ${this.activationHotkey}`);
      } else {
        console.error(`激活快捷键注册失败: ${this.activationHotkey}`);
      }

      return success;
    } catch (error) {
      console.error('注册激活快捷键失败:', error);
      return false;
    }
  }

  /**
   * 注册关闭快捷键
   */
  public registerDeactivationHotkey(callback: () => void): boolean {
    try {
      this.deactivationCallback = callback;
      
      const success = globalShortcut.register(this.deactivationHotkey, () => {
        console.log(`关闭快捷键被按下: ${this.deactivationHotkey}`);
        if (this.deactivationCallback) {
          this.deactivationCallback();
        }
      });

      if (success) {
        console.log(`关闭快捷键注册成功: ${this.deactivationHotkey}`);
      } else {
        console.error(`关闭快捷键注册失败: ${this.deactivationHotkey}`);
      }

      return success;
    } catch (error) {
      console.error('注册关闭快捷键失败:', error);
      return false;
    }
  }

  /**
   * 注销所有快捷键
   */
  public unregisterAll(): void {
    try {
      globalShortcut.unregisterAll();
      console.log('所有快捷键已注销');
      this.activationCallback = null;
      this.deactivationCallback = null;
    } catch (error) {
      console.error('注销快捷键失败:', error);
    }
  }

  /**
   * 检查快捷键是否已注册
   */
  public isRegistered(hotkey: string): boolean {
    return globalShortcut.isRegistered(hotkey);
  }

  /**
   * 获取激活快捷键
   */
  public getActivationHotkey(): string {
    return this.activationHotkey;
  }

  /**
   * 获取关闭快捷键
   */
  public getDeactivationHotkey(): string {
    return this.deactivationHotkey;
  }

  /**
   * 更新快捷键配置
   */
  public updateHotkeys(activationHotkey: string, deactivationHotkey: string): void {
    // 先注销旧的快捷键
    this.unregisterAll();

    // 更新快捷键
    this.activationHotkey = activationHotkey;
    this.deactivationHotkey = deactivationHotkey;

    // 重新注册（如果有回调）
    if (this.activationCallback) {
      this.registerActivationHotkey(this.activationCallback);
    }
    if (this.deactivationCallback) {
      this.registerDeactivationHotkey(this.deactivationCallback);
    }
  }
}
