import * as robot from 'robotjs';
import { clipboard } from 'electron';

export class TextInjector {
  private typingDelay: number = 10; // 每个字符之间的延迟（毫秒）

  constructor(typingDelay?: number) {
    if (typingDelay !== undefined) {
      this.typingDelay = typingDelay;
    }
  }

  /**
   * 输入文字到活动输入框
   */
  public async typeText(text: string): Promise<void> {
    if (!text || text.trim() === '') {
      return;
    }

    try {
      // 方法 1：直接输入（适用于简单文本）
      await this.typeTextDirect(text);
    } catch (error) {
      console.error('直接输入失败，尝试使用剪贴板方案:', error);
      
      // 方法 2：使用剪贴板（备选方案）
      await this.typeTextViaClipboard(text);
    }
  }

  /**
   * 删除指定数量的字符（模拟按退格键）
   */
  public async deleteText(count: number): Promise<void> {
    if (count <= 0) {
      return;
    }

    try {
      // 按退格键删除字符
      for (let i = 0; i < count; i++) {
        robot.keyTap('backspace');
        
        // 添加小延迟，避免删除过快
        if (this.typingDelay > 0) {
          await this.sleep(this.typingDelay);
        }
      }
    } catch (error) {
      console.error('删除文字失败:', error);
      throw error;
    }
  }

  /**
   * 直接输入文字（使用 robotjs）
   */
  private async typeTextDirect(text: string): Promise<void> {
    // 逐字符输入
    for (const char of text) {
      robot.typeString(char);
      
      // 添加延迟，避免输入过快导致丢失字符
      if (this.typingDelay > 0) {
        await this.sleep(this.typingDelay);
      }
    }
  }

  /**
   * 通过剪贴板输入文字（备选方案）
   */
  private async typeTextViaClipboard(text: string): Promise<void> {
    // 保存当前剪贴板内容
    const originalClipboard = clipboard.readText();

    try {
      // 将文字复制到剪贴板
      clipboard.writeText(text);

      // 等待一小段时间确保剪贴板更新
      await this.sleep(50);

      // 模拟 Cmd+V (macOS) 粘贴
      robot.keyTap('v', ['command']);

      // 等待粘贴完成
      await this.sleep(100);

      // 恢复原剪贴板内容
      clipboard.writeText(originalClipboard);
    } catch (error) {
      console.error('剪贴板输入失败:', error);
      throw error;
    }
  }

  /**
   * 检查是否有活动输入框
   * 注意：这个方法在 macOS 上比较难实现，我们简化处理
   */
  public hasActiveInputField(): boolean {
    // 在 macOS 上，我们假设如果用户按下了激活快捷键，
    // 就说明他们已经点击了输入框
    // 更精确的检测需要使用 macOS 的 Accessibility API
    
    // 这里我们返回 true，让用户负责确保输入框已激活
    return true;
  }

  /**
   * 将文字复制到剪贴板（作为备选方案）
   */
  public copyToClipboard(text: string): void {
    clipboard.writeText(text);
    console.log('文字已复制到剪贴板');
  }

  /**
   * 处理特殊字符
   */
  private handleSpecialCharacters(text: string): string {
    // 处理换行符
    return text.replace(/\\n/g, '\n');
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 设置输入延迟
   */
  public setTypingDelay(delay: number): void {
    this.typingDelay = delay;
  }

  /**
   * 获取输入延迟
   */
  public getTypingDelay(): number {
    return this.typingDelay;
  }
}
