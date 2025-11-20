#!/usr/bin/env ts-node

/**
 * 开发调试服务器
 *
 * 用于在开发环境中快速测试npm包功能
 * 支持热重载、实时预览和多种测试场景
 */

import { spawn } from 'child_process';
import { watch } from 'chokidar';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

interface DevConfig {
  packageDir: string;
  outputDir: string;
  examplesDir: string;
  port: number;
  watchPatterns: string[];
}

class DevServer {
  private config: DevConfig;
  private buildProcess?: any;
  private serverProcess?: any;

  constructor(config: DevConfig) {
    this.config = config;
    this.setupDirectories();
  }

  private setupDirectories(): void {
    const dirs = [
      this.config.outputDir,
      dirname(this.config.outputDir)
    ];

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  async start(): Promise<void> {
    console.log('🚀 启动前端监控SDK开发服务器...');

    // 1. 构建项目
    await this.build();

    // 2. 启动文件监听
    this.setupWatchers();

    // 3. 启动示例服务器
    await this.startExampleServer();

    console.log('✅ 开发服务器已启动');
    console.log(`📁 包目录: ${this.config.packageDir}`);
    console.log(`🌐 示例服务器: http://localhost:${this.config.port}`);
    console.log('👀 监听文件变化中...');
  }

  private async build(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔨 构建项目...');

      this.buildProcess = spawn('npm', ['run', 'build'], {
        stdio: 'inherit',
        cwd: this.config.packageDir
      });

      this.buildProcess.on('close', (code: number) => {
        if (code === 0) {
          console.log('✅ 构建完成');
          this.copyToExamples();
          resolve();
        } else {
          console.error('❌ 构建失败');
          reject(new Error(`构建失败，退出码: ${code}`));
        }
      });

      this.buildProcess.on('error', (error: Error) => {
        console.error('❌ 构建错误:', error.message);
        reject(error);
      });
    });
  }

  private copyToExamples(): void {
    // 复制构建后的文件到示例目录
    const sourceFiles = [
      join(this.config.outputDir, 'index.js'),
      join(this.config.outputDir, 'index.d.ts'),
      join(this.config.outputDir, 'index.esm.js')
    ];

    sourceFiles.forEach(sourceFile => {
      if (existsSync(sourceFile)) {
        const targetFile = sourceFile.replace(
          this.config.outputDir,
          join(this.config.examplesDir, 'node_modules/@your-org/frontend-monitor-sdk')
        );

        const targetDir = dirname(targetFile);
        if (!existsSync(targetDir)) {
          mkdirSync(targetDir, { recursive: true });
        }

        copyFileSync(sourceFile, targetFile);
      }
    });
  }

  private setupWatchers(): void {
    console.log('👀 设置文件监听器...');

    const watcher = watch(this.config.watchPatterns, {
      cwd: this.config.packageDir,
      ignored: /node_modules|\.git/,
      persistent: true
    });

    watcher.on('change', async (path) => {
      console.log(`📝 文件变更: ${path}`);
      console.log('🔄 重新构建...');

      try {
        await this.build();
        console.log('✅ 重新构建完成');
      } catch (error) {
        console.error('❌ 重新构建失败:', error);
      }
    });

    watcher.on('add', async (path) => {
      console.log(`➕ 新增文件: ${path}`);
      await this.build();
    });

    watcher.on('unlink', async (path) => {
      console.log(`➖ 删除文件: ${path}`);
      await this.build();
    });
  }

  private async startExampleServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🌐 启动示例服务器...');

      // 启动一个简单的静态文件服务器
      this.serverProcess = spawn('npx', ['http-server', this.config.examplesDir, '-p', this.config.port.toString()], {
        stdio: 'inherit'
      });

      this.serverProcess.on('close', (code: number) => {
        if (code !== 0) {
          console.warn('⚠️ 示例服务器已停止');
        }
      });

      this.serverProcess.on('error', (error: Error) => {
        console.error('❌ 服务器错误:', error.message);
        reject(error);
      });

      // 等待服务器启动
      setTimeout(() => {
        console.log('✅ 示例服务器已启动');
        resolve();
      }, 1000);
    });
  }

  stop(): void {
    console.log('🛑 停止开发服务器...');

    if (this.buildProcess) {
      this.buildProcess.kill();
    }

    if (this.serverProcess) {
      this.serverProcess.kill();
    }

    console.log('✅ 开发服务器已停止');
  }
}

// 默认配置
const defaultConfig: DevConfig = {
  packageDir: process.cwd(),
  outputDir: join(process.cwd(), 'dist'),
  examplesDir: join(process.cwd(), 'examples'),
  port: 8080,
  watchPatterns: ['src/**/*.ts', 'src/**/*.js']
};

// 启动开发服务器
const server = new DevServer(defaultConfig);

// 优雅关闭
process.on('SIGINT', () => {
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.stop();
  process.exit(0);
});

// 启动服务器
server.start().catch(error => {
  console.error('❌ 启动开发服务器失败:', error);
  process.exit(1);
});