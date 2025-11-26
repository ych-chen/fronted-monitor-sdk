#!/usr/bin/env node

/**
 * 快速 Yalc 更新工具
 * 直接复制构建文件到 yalc store，跳过重新构建过程
 */

const fs = require('fs-extra');
const path = require('path');

const CONFIG = {
  distDir: './dist',
  packageJsonPath: './package.json',
  yalcStorePath: path.join(process.env.HOME || process.env.USERPROFILE, '.yalc', 'packages', 'frontend-monitor-sdk'),
};

class FastYalcUpdater {
  async update() {
    try {
      console.log('⚡ 开始快速更新...');

      // 读取当前 package.json
      const packageJson = await fs.readJson(CONFIG.packageJsonPath);

      // 确保目标目录存在
      await fs.ensureDir(CONFIG.yalcStorePath);

      // 复制 package.json
      console.log('📄 更新 package.json...');
      await fs.copy(CONFIG.packageJsonPath, path.join(CONFIG.yalcStorePath, 'package.json'));

      // 复制构建文件
      if (await fs.pathExists(CONFIG.distDir)) {
        console.log('📦 更新构建文件...');
        await fs.copy(CONFIG.distDir, path.join(CONFIG.yalcStorePath, 'dist'));
      }

      // 通知用户
      console.log('✅ 快速更新完成！');
      console.log('🔄 其他项目中的 yalc 链接将立即生效');

    } catch (error) {
      console.error('❌ 快速更新失败:', error.message);
      process.exit(1);
    }
  }
}

// 检查 fs-extra 依赖
try {
  require('fs-extra');
} catch (error) {
  console.error('❌ 缺少依赖: fs-extra');
  console.log('请安装: npm install --save-dev fs-extra');
  process.exit(1);
}

const updater = new FastYalcUpdater();
updater.update();