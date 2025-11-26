#!/usr/bin/env node

/**
 * 源码链接工具 - 最快的开发模式
 * 直接将 src 目录链接到目标项目，目标项目负责编译
 */

const fs = require('fs-extra');
const path = require('path');

const CONFIG = {
  srcDir: './src',
  packageJsonPath: './package.json',
  tempDevPackagePath: './.yalc-dev-package',
};

class SrcLinker {
  constructor() {
    this.targetProjects = [];
  }

  async createDevPackage() {
    console.log('🔗 创建开发模式包...');

    try {
      // 清理临时目录
      await fs.remove(CONFIG.tempDevPackagePath);
      await fs.ensureDir(CONFIG.tempDevPackagePath);

      // 读取原 package.json
      const packageJson = await fs.readJson(CONFIG.packageJsonPath);

      // 创建开发模式的 package.json
      const devPackageJson = {
        ...packageJson,
        name: `${packageJson.name}-dev`,
        main: 'src/index.ts',
        types: 'src/index.ts',
        exports: {
          ".": {
            "import": "./src/index.ts",
            "require": "./src/index.ts",
            "types": "./src/index.ts"
          }
        },
        // 添加类型脚本的依赖
        devDependencies: {
          ...packageJson.devDependencies,
          typescript: '^5.0.0',
          tsx: '^4.0.0' // 用于快速 TS 执行
        },
        scripts: {
          ...packageJson.scripts,
          'dev-compile': 'tsx src/index.ts'
        }
      };

      // 写入开发模式的 package.json
      await fs.writeJson(
        path.join(CONFIG.tempDevPackagePath, 'package.json'),
        devPackageJson,
        { spaces: 2 }
      );

      // 复制源码
      console.log('📁 复制源文件...');
      await fs.copy(CONFIG.srcDir, path.join(CONFIG.tempDevPackagePath, 'src'));

      // 复制 tsconfig.json
      if (await fs.pathExists('./tsconfig.json')) {
        await fs.copy('./tsconfig.json', path.join(CONFIG.tempDevPackagePath, 'tsconfig.json'));
      }

      // 发布开发模式包
      console.log('📦 发布开发模式包...');
      process.chdir(CONFIG.tempDevPackagePath);
      require('child_process').execSync('yalc publish', { stdio: 'inherit' });
      process.chdir('..');

      console.log('✅ 开发模式包创建完成！');
      console.log('🎯 在目标项目中使用: yalc add frontend-monitor-sdk-dev');

    } catch (error) {
      console.error('❌ 创建开发模式包失败:', error.message);
      process.exit(1);
    }
  }

  async cleanup() {
    console.log('🧹 清理开发模式包...');
    await fs.remove(CONFIG.tempDevPackagePath);
    console.log('✅ 清理完成');
  }
}

// 简单的 CLI 参数解析
const command = process.argv[2];

const linker = new SrcLinker();

switch (command) {
  case 'create':
    linker.createDevPackage();
    break;
  case 'cleanup':
    linker.cleanup();
    break;
  default:
    console.log('用法:');
    console.log('  node scripts/src-linker.js create   # 创建开发模式包');
    console.log('  node scripts/src-linker.js cleanup  # 清理开发模式包');
    break;
}