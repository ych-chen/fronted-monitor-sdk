# Yalc 实时监控开发指南

本指南介绍如何使用 yalc 实现实时监控开发，在本地修改代码后，其他项目中的依赖会立即生效，无需手动构建和发布。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 选择适合的监控模式

## 📋 监控模式对比

| 模式 | 命令 | 速度 | 适用场景 | 优点 | 缺点 |
|------|------|------|----------|------|------|
| **智能监控** | `npm run dev:yalc:watch` | 快 | 日常开发 | 自动构建发布 | 需要构建时间 |
| **快速更新** | `npm run dev:yalc:fast` | 极快 | 小幅修改 | 直接复制构建文件 | 需要先构建一次 |
| **源码链接** | `npm run dev:yalc:src` | 最快 | 大幅重构 | 直接使用源码 | 目标项目需支持 TS |

## 🎯 推荐工作流程

### 日常开发（推荐）

```bash
# 终端1: 启动实时监控
npm run dev:yalc:watch

# 终端2: 在目标项目中开发
cd ../my-project
npm start
```

### 快速测试

```bash
# 修改代码后快速更新
npm run dev:yalc:fast
```

### 重构开发

```bash
# 创建源码链接
npm run dev:yalc:src

# 在目标项目中替换
cd ../my-project
yalc remove frontend-monitor-sdk
yalc add frontend-monitor-sdk-dev

# 完成后清理
npm run dev:yalc:src:cleanup
```

## 🔧 详细使用说明

### 1. 智能监控模式 (`dev:yalc:watch`)

**特点**: 监控 `src/` 目录文件变化，自动构建并发布到 yalc

**启动命令**:
```bash
# 基础模式
npm run dev:yalc:watch

# 详细输出模式
npm run dev:yalc:watch --verbose

# 启动时立即构建
npm run dev:yalc:watch --immediate
```

**工作流程**:
1. 监控 `src/` 目录所有文件变化
2. 文件变更时等待 500ms 防抖
3. 自动执行 `npm run build`
4. 自动执行 `yalc publish`
5. 通知所有链接的项目

### 2. 快速更新模式 (`dev:yalc:fast`)

**特点**: 直接复制构建文件到 yalc store，跳过构建过程

**使用场景**:
- 只修改了 JavaScript 逻辑
- 类型定义没有变化
- 需要极快反馈

**工作流程**:
1. 复制 `dist/` 目录到 yalc store
2. 复制 `package.json` 到 yalc store
3. 目标项目立即看到变化

### 3. 源码链接模式 (`dev:yalc:src`)

**特点**: 创建 TypeScript 源码包，目标项目直接编译源码

**使用场景**:
- 大规模重构
- 类型定义变化
- 调试源码

**设置步骤**:
```bash
# 在 SDK 项目中
npm run dev:yalc:src

# 在目标项目中
yalc remove frontend-monitor-sdk
yalc add frontend-monitor-sdk-dev

# 修改目标项目的 tsconfig.json 支持 TSX
# 确保目标项目有 tsx 依赖
```

**清理**:
```bash
npm run dev:yalc:src:cleanup
```

## 🛠️ 在目标项目中的设置

### 基本链接

```bash
cd ../my-project
yalc add frontend-monitor-sdk
npm install
```

### 使用源码模式

```bash
# 移除现有链接
yalc remove frontend-monitor-sdk

# 添加开发模式包
yalc add frontend-monitor-sdk-dev

# 确保项目支持 TypeScript/TSX
npm install --save-dev tsx
```

### 热更新配置

如果目标项目支持热更新（如 React, Vue），yalc 更新后通常会自动刷新。

## 📊 监控状态查看

### 查看链接状态

```bash
yalc installations
```

### 查看更新历史

监控模式下会显示：
- 变更文件数量
- 构建时间
- 发布次数

## ⚡ 性能优化技巧

### 1. 减少监控文件

```javascript
// 在 scripts/yalc-watcher.js 中调整
const watcher = watch(CONFIG.srcDir, {
  ignored: ['**/*.test.ts', '**/*.spec.ts'], // 忽略测试文件
  // ...
});
```

### 2. 调整防抖时间

```javascript
// 默认 500ms，可以调整
const CONFIG = {
  debounnceTime: 200, // 更快响应
  // ...
};
```

### 3. 使用增量更新

对于小修改（修复 bug），使用快速更新模式：

```bash
npm run dev:yalc:fast
```

## 🔍 故障排除

### 常见问题

**1. yalc 发布失败**
```bash
# 清理 yalc store
npm run dev:yalc:clean

# 重新发布
npm run dev:yalc
```

**2. 目标项目没有更新**
```bash
# 检查链接状态
yalc installations

# 重新链接
cd ../my-project
yalc remove frontend-monitor-sdk
yalc add frontend-monitor-sdk
```

**3. 类型定义问题**
```bash
# 重新构建
npm run build

# 或使用源码模式
npm run dev:yalc:src
```

### 调试模式

```bash
# 启用详细日志
npm run dev:yalc:watch --verbose
```

## 🎉 最佳实践

### 1. 开发阶段
- 使用 `dev:yalc:watch` 进行实时监控
- 小修改使用 `dev:yalc:fast` 快速更新
- 大幅重构使用 `dev:yalc:src` 源码模式

### 2. 测试阶段
```bash
# 确保 clean build
npm run build
npm run dev:yalc

# 在目标项目中测试
cd ../my-project
npm test
```

### 3. 发布前
```bash
# 清理开发环境
npm run dev:yalc:src:cleanup
npm run dev:yalc:clean

# 最终构建和发布
npm run build
yalc publish
npm publish
```

## 💡 高级技巧

### 自定义监控脚本

可以修改 `scripts/yalc-watcher.js` 添加自定义逻辑：

```javascript
// 添加自定义命令
watcher.on('change', (filePath) => {
  if (filePath.includes('special-file')) {
    // 特殊文件变化时的处理
    runCustomCommand();
  }
});
```

### 集成 IDE

在 VS Code 中可以添加任务：

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Yalc Watch",
      "type": "npm",
      "script": "dev:yalc:watch",
      "problemMatcher": []
    }
  ]
}
```

---

🎯 **提示**: 选择适合你开发节奏的模式，实时监控将大幅提升你的开发效率！