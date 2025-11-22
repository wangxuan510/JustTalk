import { app, Menu, Tray, dialog } from 'electron';
import * as path from 'path';
import { ConfigManager } from './ConfigManager';
import { AppStateManager } from './AppStateManager';
import { HotkeyManager } from './HotkeyManager';
import { PermissionManager } from './PermissionManager';

// 全局变量
let configManager: ConfigManager;
let appStateManager: AppStateManager;
let hotkeyManager: HotkeyManager;
let tray: Tray | null = null;

/**
 * 应用初始化
 */
async function initialize() {
  try {
    console.log('初始化应用...');

    // 加载配置
    configManager = new ConfigManager();
    
    if (!configManager.configExists()) {
      console.log('配置文件不存在，创建默认配置');
      configManager.createDefaultConfig();
    }

    const config = configManager.loadConfig();
    console.log('配置加载成功');

    // 检查麦克风权限
    const hasPermission = await PermissionManager.checkMicrophonePermission();
    if (!hasPermission) {
      dialog.showErrorBox(
        '麦克风权限',
        PermissionManager.showPermissionGuide()
      );
      app.quit();
      return;
    }

    // 初始化应用状态管理器
    appStateManager = new AppStateManager(config);
    console.log('应用状态管理器初始化成功');

    // 初始化快捷键管理器
    hotkeyManager = new HotkeyManager(
      config.hotkeys.activate,
      config.hotkeys.deactivate
    );

    // 注册快捷键
    registerHotkeys();

    // 创建托盘图标
    createTray();

    console.log('应用初始化完成');
    
    // 显示欢迎消息
    dialog.showMessageBox({
      type: 'info',
      title: '语音转文字工具',
      message: '应用已启动',
      detail: `激活快捷键: ${config.hotkeys.activate}\n关闭快捷键: ${config.hotkeys.deactivate}\n\n请先点击输入框，然后按快捷键开始语音输入。`,
    });
  } catch (error) {
    console.error('初始化失败:', error);
    
    if (error instanceof Error) {
      dialog.showErrorBox('初始化失败', error.message);
    }
    
    app.quit();
  }
}

/**
 * 注册全局快捷键
 */
function registerHotkeys() {
  // 注册激活快捷键
  const activationSuccess = hotkeyManager.registerActivationHotkey(() => {
    console.log('激活快捷键触发');
    appStateManager.activate().catch(error => {
      console.error('激活失败:', error);
    });
  });

  if (!activationSuccess) {
    dialog.showErrorBox(
      '快捷键注册失败',
      `无法注册激活快捷键: ${hotkeyManager.getActivationHotkey()}\n可能已被其他应用占用。`
    );
  }

  // 注册关闭快捷键
  const deactivationSuccess = hotkeyManager.registerDeactivationHotkey(() => {
    console.log('关闭快捷键触发');
    appStateManager.deactivate();
  });

  if (!deactivationSuccess) {
    dialog.showErrorBox(
      '快捷键注册失败',
      `无法注册关闭快捷键: ${hotkeyManager.getDeactivationHotkey()}\n可能已被其他应用占用。`
    );
  }
}

/**
 * 创建托盘图标
 */
function createTray() {
  // 创建托盘图标（可选）
  // 注意：需要准备一个图标文件
  // tray = new Tray(path.join(__dirname, '../assets/icon.png'));
  
  // 创建托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '关于',
      click: () => {
        const config = configManager.getConfig();
        dialog.showMessageBox({
          type: 'info',
          title: '关于',
          message: '语音转文字工具',
          detail: `版本: 1.0.0\n\n激活快捷键: ${config.hotkeys.activate}\n关闭快捷键: ${config.hotkeys.deactivate}`,
        });
      },
    },
    {
      label: '打开权限设置',
      click: () => {
        PermissionManager.openSystemPreferences();
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);

  // 如果有托盘图标，设置菜单
  if (tray) {
    tray.setContextMenu(contextMenu);
    tray.setToolTip('语音转文字工具');
  }
}

/**
 * 单实例锁定
 * 确保只有一个应用实例在运行
 */
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 如果获取锁失败，说明已有实例在运行
  console.log('应用已在运行，退出当前实例');
  app.quit();
} else {
  // 当第二个实例尝试启动时，关闭它并聚焦到第一个实例
  app.on('second-instance', () => {
    console.log('检测到第二个实例尝试启动，已阻止');
    
    // 显示提示
    dialog.showMessageBox({
      type: 'info',
      title: '应用已在运行',
      message: '语音转文字工具已在后台运行',
      detail: '无需重复启动。',
    });
  });

  /**
   * 应用准备就绪
   */
  app.whenReady().then(() => {
    initialize();
  });
}

/**
 * 所有窗口关闭时
 */
app.on('window-all-closed', () => {
  // 在 macOS 上，应用通常保持活动状态
  // 即使所有窗口都关闭了
  // 我们的应用是后台运行的，所以不退出
});

/**
 * 应用激活时（macOS）
 */
app.on('activate', () => {
  // 在 macOS 上，当点击 dock 图标时
  // 如果没有窗口打开，通常会重新创建一个
  // 我们的应用没有主窗口，所以不需要处理
});

/**
 * 应用退出前
 */
app.on('will-quit', () => {
  console.log('应用即将退出，清理资源...');
  
  // 注销快捷键
  if (hotkeyManager) {
    hotkeyManager.unregisterAll();
  }

  // 清理应用状态
  if (appStateManager) {
    appStateManager.cleanup();
  }
});

/**
 * 处理未捕获的异常
 */
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  dialog.showErrorBox('错误', `发生未预期的错误: ${error.message}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('未处理的 Promise 拒绝:', reason);
});
