# npm link 调试指南

## 问题诊断

当你使用 `npm link` 后，在目标项目中无法正确 import 包，通常有以下几个原因：

1. **模块解析问题** - Vite/Webpack 无法正确解析 symlinks
2. **TypeScript 类型定义问题** - 类型声明文件路径不正确
3. **ESM/CJS 模块格式问题** - 模块格式不匹配

## 解决方案

### 1. 在 SDK 包中添加 exports 字段 ✅

已完成：在 `package.json` 中添加了 `exports` 字段，明确指定模块路径。

### 2. 重新构建并链接

```bash
# 在 SDK 项目根目录
npm run build
npm link

# 在目标项目
npm link frontend-monitor-sdk
```

### 3. 在目标项目中配置 Vite

在目标项目的 `vite.config.ts` 中添加：

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    // 保持 symlinks，让 npm link 生效
    preserveSymlinks: true,
    // 确保能解析到正确的类型文件
    alias: {
      // 如果需要，可以添加别名
    }
  },
  optimizeDeps: {
    // 排除链接的包，避免预构建问题
    exclude: ['frontend-monitor-sdk']
  }
})
```

### 4. 在目标项目中配置 TypeScript

在目标项目的 `tsconfig.json` 中确保：

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": [
    "src/**/*",
    "node_modules/frontend-monitor-sdk/dist/index.d.ts"
  ]
}
```

### 5. 验证导入

在目标项目中尝试多种导入方式：

```typescript
// 方式1：默认导入
import { createFrontendMonitor } from 'frontend-monitor-sdk'

// 方式2：完整路径导入（调试用）
import { createFrontendMonitor } from 'frontend-monitor-sdk/dist/index'

// 方式3：相对路径（如果项目在本地）
import { createFrontendMonitor } from '../path/to/frontend-monitor-sdk/dist/index'
```

## 常见问题排查

### 检查链接状态

```bash
# 在 SDK 项目
npm ls -g --depth=0 | grep frontend

# 在目标项目
ls -la node_modules/frontend-monitor-sdk
```

### 检查构建产物

```bash
# 确保 dist 目录存在且包含所有文件
ls -la dist/
cat dist/index.d.ts | head -20
```

### 清理缓存

```bash
# 在目标项目
npm run dev -- --force
# 或者
rm -rf node_modules/.vite
npm run dev
```

## 替代方案

如果 npm link 仍有问题，可以尝试：

### 方案1：使用 npm pack

```bash
# 在 SDK 项目
npm run build
npm pack

# 在目标项目
npm install /path/to/frontend-monitor-sdk-1.0.0.tgz
```

### 方案2：使用 workspace（推荐用于开发）

```bash
# 使用 npm workspace 或 pnpm workspace
# 将两个项目放在同一个 workspace 中管理
```

### 方案3：使用相对路径

```json
// 在目标项目的 package.json 中
"dependencies": {
  "frontend-monitor-sdk": "file:../path/to/frontend-monitor-sdk"
}
```

## 快速验证脚本

在目标项目中创建测试文件：

```typescript
// test-import.ts
import { createFrontendMonitor } from 'frontend-monitor-sdk'

console.log('SDK imported successfully:', typeof createFrontendMonitor)

// 测试基本功能
const monitor = createFrontendMonitor()
console.log('Monitor instance created:', !!monitor)
```

运行测试：
```bash
npx ts-node test-import.ts
```