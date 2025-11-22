import { systemPreferences } from 'electron';

export class PermissionManager {
  /**
   * 检查麦克风权限状态
   */
  public static async checkMicrophonePermission(): Promise<boolean> {
    if (process.platform !== 'darwin') {
      // 非 macOS 系统，假设有权限
      return true;
    }

    try {
      // 获取麦克风权限状态
      const status = systemPreferences.getMediaAccessStatus('microphone');
      
      if (status === 'granted') {
        return true;
      } else if (status === 'denied') {
        return false;
      } else if (status === 'not-determined') {
        // 权限未确定，请求权限
        return await this.requestMicrophonePermission();
      }

      return false;
    } catch (error) {
      console.error('检查麦克风权限失败:', error);
      return false;
    }
  }

  /**
   * 请求麦克风权限
   */
  private static async requestMicrophonePermission(): Promise<boolean> {
    try {
      // 请求麦克风访问权限
      const granted = await systemPreferences.askForMediaAccess('microphone');
      return granted;
    } catch (error) {
      console.error('请求麦克风权限失败:', error);
      return false;
    }
  }

  /**
   * 显示权限引导消息
   */
  public static showPermissionGuide(): string {
    return `
麦克风权限被拒绝

请按照以下步骤授予麦克风权限：

1. 打开"系统偏好设置"
2. 点击"安全性与隐私"
3. 选择"隐私"标签
4. 在左侧列表中选择"麦克风"
5. 勾选"VoiceToText"应用
6. 重启应用

或者在终端中运行：
open "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"
    `.trim();
  }

  /**
   * 打开系统权限设置
   */
  public static openSystemPreferences(): void {
    if (process.platform === 'darwin') {
      const { shell } = require('electron');
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
    }
  }
}
