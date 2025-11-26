#!/usr/bin/env node

/**
 * Yalc 实时监控工具
 * 监控源文件变化，自动构建并发布到 yalc store
 */

const { watch } = require('chokidar');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 配置
const CONFIG = {
  srcDir: './src',
  distDir: './dist',
  packageJsonPath: './package.json',
  debounnceTime: 500, // 防抖时间（毫秒）
  verbose: process.argv.includes('--verbose'),
  immediate: process.argv.includes('--immediate'),
};

class YalcWatcher {
  constructor() {
    this.isBuilding = false;
    this.pendingRebuild = false;
    this.changeCount = 0;
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
      info: '\x1b[36m', // cyan
      success: '\x1b[32m', // green
      warning: '\x1b[33m', // yellow
      error: '\x1b[31m', // red
      reset: '\x1b[0m'
    };

    const color = colors[type] || colors.info;
    console.log(`${color}[${timestamp}]${colors.reset} ${message}`);
  }

  async build() {
    if (this.isBuilding) {
      this.pendingRebuild = true;
      return;
    }

    this.isBuilding = true;
    this.pendingRebuild = false;

    try {
      if (CONFIG.verbose) {
        this.log('🔨 开始构建...', 'info');
      }

      // 执行构建
      execSync('npm run build', { stdio: CONFIG.verbose ? 'inherit' : 'pipe' });

      this.log('✅ 构建完成', 'success');
      this.changeCount++;

      // 发布到 yalc
      await this.publishToYalc();

      // 如果有待处理的重建请求，再次执行
      if (this.pendingRebuild) {
        this.log('🔄 检测到新的变更，重新构建...', 'warning');
        this.isBuilding = false;
        setTimeout(() => this.build(), 100);
      }

    } catch (error) {
      this.log(`❌ 构建失败: ${error.message}`, 'error');
      if (CONFIG.verbose) {
        console.error(error);
      }
    } finally {
      this.isBuilding = false;
    }
  }

  async publishToYalc() {
    try {
      if (CONFIG.verbose) {
        this.log('📦 发布到 yalc store...', 'info');
      }

      // 发布到 yalc
      execSync('yalc publish', { stdio: CONFIG.verbose ? 'inherit' : 'pipe' });

      const elapsed = Date.now() - this.startTime;
      this.log(`🚀 已发布到 yalc store (第 ${this.changeCount} 次，耗时 ${elapsed}ms)`, 'success');

      // 通知所有链接的项目
      this.notifyLinkedProjects();

    } catch (error) {
      this.log(`❌ yalc 发布失败: ${error.message}`, 'error');
      if (CONFIG.verbose) {
        console.error(error);
      }
    }
  }

  notifyLinkedProjects() {
    try {
      // 获取所有链接到这个包的项目
      const result = execSync('yalc installations', { encoding: 'utf8' });
      if (result.trim()) {
        this.log('📡 已链接的项目将自动获得更新', 'info');
        if (CONFIG.verbose) {
          console.log(result.trim());
        }
      }
    } catch (error) {
      // 忽略错误，可能没有链接的项目
    }
  }

  start() {
    this.log('🚀 启动 Yalc 实时监控', 'info');
    this.log(`📁 监控目录: ${CONFIG.srcDir}`, 'info');
    this.log(`⚡ 防抖延迟: ${CONFIG.debounnceTime}ms`, 'info');
    this.log('🛑 按 Ctrl+C 停止监控', 'warning');

    // 如果指定了 immediate，立即构建一次
    if (CONFIG.immediate) {
      this.build();
    }

    // 监控源文件变化
    const watcher = watch(CONFIG.srcDir, {
      ignored: /(^|[\/\\])\../, // 忽略隐藏文件
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      }
    });

    let rebuildTimeout;

    watcher.on('change', (filePath) => {
      if (CONFIG.verbose) {
        this.log(`📝 检测到变更: ${path.relative(process.cwd(), filePath)}`, 'info');
      }

      // 防抖处理
      clearTimeout(rebuildTimeout);
      rebuildTimeout = setTimeout(() => {
        this.log('🔄 检测到文件变更，开始重新构建...', 'info');
        this.build();
      }, CONFIG.debounnceTime);
    });

    watcher.on('add', (filePath) => {
      this.log(`➕ 新增文件: ${path.relative(process.cwd(), filePath)}`, 'info');
      clearTimeout(rebuildTimeout);
      rebuildTimeout = setTimeout(() => this.build(), CONFIG.debounnceTime);
    });

    watcher.on('unlink', (filePath) => {
      this.log(`➖ 删除文件: ${path.relative(process.cwd(), filePath)}`, 'warning');
      clearTimeout(rebuildTimeout);
      rebuildTimeout = setTimeout(() => this.build(), CONFIG.debounnceTime);
    });

    watcher.on('error', (error) => {
      this.log(`❌ 监控器错误: ${error}`, 'error');
    });

    // 优雅关闭
    process.on('SIGINT', () => {
      this.log('🛑 正在停止监控...', 'warning');
      watcher.close();
      process.exit(0);
    });
  }
}

// 检查依赖
try {
  require('chokidar');
} catch (error) {
  console.error('❌ 缺少依赖: chokidar');
  console.log('请安装: npm install --save-dev chokidar');
  process.exit(1);
}

// 启动监控
const watcher = new YalcWatcher();
watcher.start();