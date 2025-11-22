const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// 配置文件路径
const CONFIG_PATH = path.join(process.cwd(), 'config.json');

// 加载配置
function loadConfig() {
  try {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('加载配置失败:', error);
    showMessage('加载配置失败', 'error');
    return null;
  }
}

// 保存配置
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('保存配置失败:', error);
    showMessage('保存配置失败: ' + error.message, 'error');
    return false;
  }
}

// 显示消息
function showMessage(text, type = 'success') {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  
  if (type === 'success') {
    setTimeout(() => {
      messageEl.className = 'message';
    }, 3000);
  }
}

// 填充表单
function populateForm(config) {
  document.getElementById('apiKey').value = config.funASR.apiKey;
  document.getElementById('url').value = config.funASR.url;
  document.getElementById('model').value = config.funASR.model;
  document.getElementById('activateKey').value = config.hotkeys.activate;
  document.getElementById('deactivateKey').value = config.hotkeys.deactivate;
}

// 从表单获取配置
function getFormData() {
  return {
    funASR: {
      apiKey: document.getElementById('apiKey').value.trim(),
      url: document.getElementById('url').value.trim(),
      model: document.getElementById('model').value,
    },
    hotkeys: {
      activate: document.getElementById('activateKey').value,
      deactivate: document.getElementById('deactivateKey').value,
    },
    audio: {
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16,
      encoding: 'signed-integer',
    },
    ui: {
      indicatorPosition: 'top-right',
    },
  };
}

// 验证配置
function validateConfig(config) {
  if (!config.funASR.apiKey) {
    showMessage('请输入 API Key', 'error');
    return false;
  }

  if (!config.funASR.apiKey.startsWith('sk-')) {
    showMessage('API Key 格式不正确（应以 sk- 开头）', 'error');
    return false;
  }

  if (!config.funASR.url) {
    showMessage('请输入服务地址', 'error');
    return false;
  }

  if (!config.hotkeys.activate) {
    showMessage('请设置激活快捷键', 'error');
    return false;
  }

  if (!config.hotkeys.deactivate) {
    showMessage('请设置停止快捷键', 'error');
    return false;
  }

  return true;
}

// 快捷键录制
let capturingTarget = null;
const keyMap = {
  Meta: 'Command',
  Control: 'Control',
  Alt: 'Alt',
  Shift: 'Shift',
};

function startCapture(targetId) {
  capturingTarget = targetId;
  const button = document.querySelector(`[data-target="${targetId}"]`);
  button.textContent = '按下快捷键...';
  button.classList.add('capturing');
}

function stopCapture() {
  if (capturingTarget) {
    const button = document.querySelector(`[data-target="${capturingTarget}"]`);
    button.textContent = '录制';
    button.classList.remove('capturing');
    capturingTarget = null;
  }
}

function captureHotkey(event) {
  if (!capturingTarget) return;

  event.preventDefault();
  event.stopPropagation();

  const modifiers = [];
  if (event.metaKey) modifiers.push('Command');
  if (event.ctrlKey) modifiers.push('Control');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');

  // 获取主键
  let key = event.key;
  
  // 忽略单独的修饰键
  if (['Meta', 'Control', 'Alt', 'Shift'].includes(key)) {
    return;
  }

  // 转换特殊键名
  if (key === ' ') key = 'Space';
  if (key.length === 1) key = key.toUpperCase();

  // 组合快捷键
  const hotkey = [...modifiers, key].join('+');

  // 设置到输入框
  document.getElementById(capturingTarget).value = hotkey;

  // 停止录制
  stopCapture();
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 加载配置
  const config = loadConfig();
  if (config) {
    populateForm(config);
  }

  // 快捷键录制按钮
  document.querySelectorAll('.hotkey-capture').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      startCapture(targetId);
    });
  });

  // 监听键盘事件
  document.addEventListener('keydown', captureHotkey);

  // 取消按钮
  document.getElementById('cancelBtn').addEventListener('click', () => {
    window.close();
  });

  // 表单提交
  document.getElementById('configForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const config = getFormData();

    if (!validateConfig(config)) {
      return;
    }

    if (saveConfig(config)) {
      showMessage('配置已保存，重启应用后生效', 'success');
      setTimeout(() => {
        window.close();
      }, 1500);
    }
  });
});
