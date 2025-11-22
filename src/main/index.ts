import { app, Menu, Tray, dialog } from 'electron';
import * as path from 'path';
import { ConfigManager } from './ConfigManager';
import { AppStateManager } from './AppStateManager';
import { HotkeyManager } from './HotkeyManager';
import { PermissionManager } from './PermissionManager';
import { ConfigWindow } from './ConfigWindow';

// 全局变量
let configManager: ConfigManager;
let appStateManager: AppStateManager;
let hotkeyManager: HotkeyManager;
let configWindow: ConfigWindow;
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

    // 初始化配置窗口
    configWindow = new ConfigWindow();

    // 注册快捷键
    registerHotkeys();

    // 创建托盘图标
    createTray();

    console.log('应用初始化完成');
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
  const config = configManager.getConfig();
  
  // 检查是否使用同一个快捷键
  const useSameKey = config.hotkeys.activate === config.hotkeys.deactivate;
  
  if (useSameKey) {
    // 使用同一个快捷键切换
    const success = hotkeyManager.registerActivationHotkey(() => {
      console.log('切换快捷键触发');
      const currentState = appStateManager.getState();
      
      if (currentState === 'active') {
        // 当前激活，则关闭
        appStateManager.deactivate();
      } else {
        // 当前未激活，则激活
        appStateManager.activate().catch(error => {
          console.error('激活失败:', error);
        });
      }
    });

    if (!success) {
      dialog.showErrorBox(
        '快捷键注册失败',
        `无法注册快捷键: ${config.hotkeys.activate}\n可能已被其他应用占用。`
      );
    } else {
      console.log(`切换快捷键注册成功: ${config.hotkeys.activate}`);
    }
  } else {
    // 使用不同的快捷键
    const activationSuccess = hotkeyManager.registerActivationHotkey(() => {
      console.log('激活快捷键触发');
      appStateManager.activate().catch(error => {
        console.error('激活失败:', error);
      });
    });

    if (!activationSuccess) {
      dialog.showErrorBox(
        '快捷键注册失败',
        `无法注册激活快捷键: ${config.hotkeys.activate}\n可能已被其他应用占用。`
      );
    } else {
      console.log(`激活快捷键注册成功: ${config.hotkeys.activate}`);
    }

    const deactivationSuccess = hotkeyManager.registerDeactivationHotkey(() => {
      console.log('关闭快捷键触发');
      appStateManager.deactivate();
    });

    if (!deactivationSuccess) {
      dialog.showErrorBox(
        '快捷键注册失败',
        `无法注册关闭快捷键: ${config.hotkeys.deactivate}\n可能已被其他应用占用。`
      );
    } else {
      console.log(`关闭快捷键注册成功: ${config.hotkeys.deactivate}`);
    }
  }
}

/**
 * 创建托盘图标
 */
function createTray() {
  // 创建托盘图标
  // 使用项目中的图标文件
  const { nativeImage } = require('electron');
  const iconPath = path.join(__dirname, '../assets/icon.png');
  
  // 加载图标并调整尺寸
  // macOS 托盘图标标准尺寸是 16x16（普通屏）和 32x32（Retina 屏）
  let icon = nativeImage.createFromPath(iconPath);
  icon = icon.resize({ width: 16, height: 16 });
  
  tray = new Tray(icon);
  
  const config = configManager.getConfig();
  
  // 创建托盘菜单
  const useSameKey = config.hotkeys.activate === config.hotkeys.deactivate;
  
  const menuTemplate: any[] = [];
  
  if (useSameKey) {
    // 使用同一个快捷键，显示切换选项
    menuTemplate.push({
      label: `切换语音输入 (${config.hotkeys.activate})`,
      click: () => {
        const currentState = appStateManager.getState();
        if (currentState === 'active') {
          appStateManager.deactivate();
        } else {
          appStateManager.activate().catch(error => {
            console.error('激活失败:', error);
          });
        }
      },
    });
  } else {
    // 使用不同的快捷键，显示启动和结束选项
    menuTemplate.push(
      {
        label: `启动 (${config.hotkeys.activate})`,
        click: () => {
          appStateManager.activate().catch(error => {
            console.error('启动失败:', error);
          });
        },
      },
      {
        label: `结束 (${config.hotkeys.deactivate})`,
        click: () => {
          appStateManager.deactivate();
        },
      }
    );
  }
  
  menuTemplate.push(
    { type: 'separator' },
    {
      label: '配置',
      click: () => {
        configWindow.show();
      },
    },
    { type: 'separator' },
    {
      label: '关闭',
      click: () => {
        // 清理资源
        if (appStateManager) {
          appStateManager.cleanup();
        }
        if (hotkeyManager) {
          hotkeyManager.unregisterAll();
        }
        // 强制退出
        app.exit(0);
      },
    }
  );
  
  const contextMenu = Menu.buildFromTemplate(menuTemplate);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('语音转文字工具');
}

/**
 * 配置应用为后台应用，不抢夺焦点
 */
// 设置应用为后台应用（不出现在 Dock，不抢夺焦点）
app.dock?.hide();

// 阻止应用在快捷键触发时激活
app.on('browser-window-focus', (event) => {
  // 阻止窗口获得焦点
  event.preventDefault();
});

// 阻止应用激活
app.on('activate', (event) => {
  event.preventDefault();
});

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
