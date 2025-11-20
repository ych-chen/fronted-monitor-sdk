# Yalc 本地开发调试指南

## 问题解决

### 原始问题
安装 yalc 时遇到 `cannot found module @rollup/rollup-linux-x64-gnu` 等平台相关依赖错误。

### 针对不同系统的解决方案

#### Linux x86_64 (你的真实环境: Node.js v18.17.0, npm v9.6.7)
```bash
# 清理 npm 缓存
npm cache clean --force

# 标准安装（在 Linux x86_64 上通常可以直接工作）
npm i -g yalc

# 如果遇到问题，尝试以下方案：
npm i -g yalc --build-from-source
# 或
npm i -g yalc --target_platform=linux --target_arch=x64
```

#### macOS arm64
```bash
npm cache clean --force
npm i -g yalc --target_arch=arm64 --target_platform=darwin
```

#### Windows x64
```bash
npm cache clean --force
npm i -g yalc --target_platform=win32 --target_arch=x64
```

## Yalc 本地调试工作流

### 1. 在包项目 (frontend-monitor-sdk) 中操作

```bash
# 构建并发布到 yalc 仓库
npm run dev:yalc

# 或者启用监听模式（代码修改时自动更新）
npm run dev:yalc:watch

# 清理 yalc 仓库中的当前包
npm run dev:yalc:clean
```

### 2. 在使用项目 (另一个项目) 中操作

```bash
# 添加本地包到项目
yalc add frontend-monitor-sdk

# 移除本地包
yalc remove frontend-monitor-sdk

# 检查当前项目中使用的 yalc 包
yalc ls
```

### 3. 开发流程

1. **首次设置**:
   ```bash
   # 在包项目目录
   cd /path/to/frontend-monitor-sdk
   npm run dev:yalc

   # 在使用项目目录
   cd /path/to/consumer-project
   yalc add frontend-monitor-sdk
   ```

2. **日常开发**:
   ```bash
   # 在包项目目录（修改代码后）
   npm run dev:yalc  # 重新构建和发布

   # 在使用项目会自动看到最新版本，无需重新安装！
   ```

3. **清理**:
   ```bash
   # 在使用项目
   yalc remove frontend-monitor-sdk

   # 在包项目
   npm run dev:yalc:clean
   ```

## 优势对比

### Yalc vs npm link
- ✅ **Yalc**: 代码修改后只需要重新发布，无需手动重新安装
- ✅ **Yalc**: 模拟真实的 npm 包安装过程
- ❌ **npm link**: 需要每次 `npm run dev` 来更新链接

### Yalc vs npm pack
- ✅ **Yalc**: 自动管理版本和依赖
- ✅ **Yalc**: 支持增量更新，速度快
- ❌ **npm pack**: 需要手动解压和安装，步骤繁琐

## 新增的 NPM Scripts

```json
{
  "dev:yalc": "npm run build && yalc publish",
  "dev:yalc:watch": "concurrently \"npm run dev\" \"npm run dev:yalc\"",
  "dev:yalc:clean": "yalc clean"
}
```

### 使用说明

- `npm run dev:yalc`: 构建项目并发布到 yalc 本地仓库
- `npm run dev:yalc:watch`: 启动监听模式，代码修改时自动重新构建和发布
- `npm run dev:yalc:clean`: 清理 yalc 本地仓库中的当前包

## 注意事项

1. 确保两个项目都使用相同的 Node.js 版本
2. 修改包代码后记得运行 `npm run dev:yalc` 来更新
3. 发布正式版本前记得清理 yalc 引用：`npm run dev:yalc:clean`
4. 使用 `npm run dev:yalc:watch` 可以实现真正的热更新体验

## 故障排除

### 如果 yalc 命令不工作

**Linux x86_64 环境:**
```bash
# 重新安装 yalc
npm cache clean --force
npm i -g yalc --target_platform=linux --target_arch=x64
```

**macOS arm64 环境:**
```bash
npm cache clean --force
npm i -g yalc --target_arch=arm64 --target_platform=darwin
```

### 如果使用项目看不到更新
```bash
# 在使用项目中
yalc remove frontend-monitor-sdk
yalc add frontend-monitor-sdk

# 或者检查 node_modules 中的链接
ls -la node_modules/frontend-monitor-sdk
```