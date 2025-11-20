#!/usr/bin/env node

/**
 * Yalc 工作流测试脚本
 * 适用于 Linux x86_64, Node.js v18.17.0 环境
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 测试 Yalc 工作流...\n');

// 检查环境
console.log('1️⃣ 检查环境信息...');
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  const platform = process.platform;
  const arch = process.arch;

  console.log(`   Node.js: ${nodeVersion}`);
  console.log(`   npm: ${npmVersion}`);
  console.log(`   Platform: ${platform}-${arch}`);

  if (nodeVersion !== 'v18.17.0') {
    console.log(`⚠️  注意: 检测到 Node.js 版本为 ${nodeVersion}，你的真实环境是 v18.17.0`);
  }

  if (platform !== 'linux' || arch !== 'x64') {
    console.log(`⚠️  注意: 当前平台是 ${platform}-${arch}，你的真实环境是 linux-x64`);
  }
} catch (error) {
  console.error('❌ 环境检查失败:', error.message);
  process.exit(1);
}

// 检查 yalc 安装
console.log('\n2️⃣ 检查 yalc 安装...');
try {
  const yalcVersion = execSync('yalc --version', { encoding: 'utf8' }).trim();
  console.log(`   ✅ yalc 已安装: ${yalcVersion}`);
} catch (error) {
  console.log('   ❌ yalc 未安装或不可用');
  console.log('   💡 解决方案:');
  if (process.platform === 'linux' && process.arch === 'x64') {
    console.log('      npm cache clean --force');
    console.log('      npm i -g yalc');
    console.log('      # 或如果遇到问题:');
    console.log('      npm i -g yalc --target_platform=linux --target_arch=x64');
  } else {
    console.log('      npm cache clean --force');
    console.log(`      npm i -g yalc --target_platform=${process.platform} --target_arch=${process.arch}`);
  }
  process.exit(1);
}

// 检查项目构建
console.log('\n3️⃣ 检查项目构建...');
try {
  console.log('   📦 构建项目...');
  execSync('npm run build', { stdio: 'pipe' });
  console.log('   ✅ 项目构建成功');
} catch (error) {
  console.error('   ❌ 项目构建失败:', error.message);
  console.log('   💡 请确保项目依赖已安装: npm install');
  process.exit(1);
}

// 测试 yalc 发布
console.log('\n4️⃣ 测试 yalc 发布...');
try {
  console.log('   📤 发布到 yalc 仓库...');
  execSync('yalc publish', { stdio: 'pipe' });
  console.log('   ✅ yalc 发布成功');
} catch (error) {
  console.error('   ❌ yalc 发布失败:', error.message);
  process.exit(1);
}

// 检查 yalc 仓库
console.log('\n5️⃣ 检查 yalc 仓库...');
try {
  const yalcDir = execSync('yalc dir', { encoding: 'utf8' }).trim();
  const packagesDir = path.join(yalcDir, 'packages', 'frontend-monitor-sdk');

  if (fs.existsSync(packagesDir)) {
    const versions = fs.readdirSync(packagesDir).filter(f => fs.statSync(path.join(packagesDir, f)).isDirectory());
    if (versions.length > 0) {
      const latestVersion = versions[versions.length - 1];
      const packagePath = path.join(packagesDir, latestVersion, 'package.json');

      if (fs.existsSync(packagePath)) {
        const packageInfo = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        console.log(`   ✅ 包已在 yalc 仓库中: ${packageInfo.name}@${packageInfo.version}`);
        console.log(`   📍 位置: ${packagesDir}`);
        console.log(`   📦 版本: ${latestVersion}`);
      } else {
        console.log('   ❌ package.json 未找到');
        process.exit(1);
      }
    } else {
      console.log('   ❌ 未找到任何版本');
      process.exit(1);
    }
  } else {
    console.log('   ❌ 包未在 yalc 仓库中找到');
    console.log(`   📍 查找路径: ${packagesDir}`);
    process.exit(1);
  }
} catch (error) {
  console.error('   ❌ 检查 yalc 仓库失败:', error.message);
  process.exit(1);
}

console.log('\n🎉 Yalc 工作流测试完成！');
console.log('\n📋 接下来的步骤:');
console.log('1. 在你的另一个项目中运行: yalc add frontend-monitor-sdk');
console.log('2. 修改代码后运行: npm run dev:yalc');
console.log('3. 或启用自动监听: npm run dev:yalc:watch');

console.log('\n💡 记住: 这是在当前环境中测试。在你的 Linux x86_64 真实环境中:');
console.log('- Node.js v18.17.0');
console.log('- npm v9.6.7');
console.log('- yalc 应该可以直接安装: npm i -g yalc');