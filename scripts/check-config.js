#!/usr/bin/env node

/**
 * 配置检查脚本
 * 验证 config.json 是否正确配置
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config.json');
const EXAMPLE_PATH = path.join(__dirname, '../config.example.json');

console.log('🔍 检查配置文件...\n');

// 检查 config.json 是否存在
if (!fs.existsSync(CONFIG_PATH)) {
  console.error('❌ 错误: config.json 不存在');
  console.log('💡 请运行: cp config.example.json config.json');
  process.exit(1);
}

// 读取配置
let config;
try {
  const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
  config = JSON.parse(configContent);
} catch (error) {
  console.error('❌ 错误: config.json 格式不正确');
  console.error(error.message);
  process.exit(1);
}

// 检查必填字段
const checks = [
  {
    name: 'FunASR API Key',
    path: 'funASR.apiKey',
    value: config.funASR?.apiKey,
    validate: (val) => val && val !== 'your-dashscope-api-key-here' && val.startsWith('sk-'),
    error: 'API Key 未配置或格式不正确（应以 sk- 开头）'
  },
  {
    name: 'FunASR URL',
    path: 'funASR.url',
    value: config.funASR?.url,
    validate: (val) => val && val.startsWith('wss://'),
    error: 'WebSocket URL 未配置或格式不正确'
  },
  {
    name: 'FunASR Model',
    path: 'funASR.model',
    value: config.funASR?.model,
    validate: (val) => val && val.length > 0,
    error: '模型名称未配置'
  },
  {
    name: '激活快捷键',
    path: 'hotkeys.activate',
    value: config.hotkeys?.activate,
    validate: (val) => val && val.length > 0,
    error: '激活快捷键未配置'
  }
];

let hasError = false;

checks.forEach(check => {
  if (check.validate(check.value)) {
    console.log(`✅ ${check.name}: ${check.value}`);
  } else {
    console.error(`❌ ${check.name}: ${check.error}`);
    hasError = true;
  }
});

console.log('');

if (hasError) {
  console.error('❌ 配置检查失败，请修复上述错误');
  console.log('💡 参考 config.example.json 查看正确的配置格式');
  process.exit(1);
} else {
  console.log('✅ 配置检查通过！');
  console.log('💡 现在可以运行: npm run dev');
}
