# 前端监控SDK调试指南

## 🚀 快速调试方法

### 方法1: npm link（推荐本地开发）

```bash
# 在SDK项目中
cd /path/to/frontend-monitor-sdk
npm run build
npm link

# 在测试项目中
cd /path/to/your-test-project
npm link frontend-monitor-sdk
```

**优势**：
- ✅ 实时同步修改
- ✅ 无需发布到npm
- ✅ 支持热重载

**注意**：如果遇到问题，可以尝试：
```bash
npm unlink -g frontend-monitor-sdk
npm link
```

### 方法2: 快速测试（最简单）

```bash
# 在SDK项目中
npm run debug
```

这会自动构建项目并运行快速测试，验证所有核心功能。

### 方法3: 开发服务器

```bash
# 启动开发服务器，支持热重载
npm run playground

# 或
npm run dev:server
```

访问 http://localhost:8080 查看示例页面。

### 方法4: 本地包安装

```bash
# 创建本地包文件
npm run dev:pack

# 在测试项目中安装
npm install /path/to/frontend-monitor-sdk-1.0.0.tgz
```

## 🔧 调试工作流程

### 1. 开发阶段
```bash
# 1. 启动开发模式
npm run dev

# 2. 在另一个终端运行快速测试
npm run dev:quick-test

# 3. 修改代码后会自动重新构建
```

### 2. 测试阶段
```bash
# 1. 构建项目
npm run build

# 2. 运行所有测试
npm test

# 3. 运行覆盖率测试
npm run test:coverage

# 4. 运行集成测试
npm run test:integration
```

### 3. 集成测试
```bash
# 1. 使用npm link
npm run dev:link

# 2. 在测试项目中验证
cd ../your-test-project
npm test

# 3. 完成后取消链接
npm run dev:unlink
```

## 🛠️ 调试工具

### 开发服务器 (`tools/dev-server.ts`)
- 🔄 自动监听文件变化
- 🏗️ 自动重新构建
- 🌐 启动示例服务器
- 📋 实时日志输出

### 快速测试 (`tools/quick-test.js`)
- ⚡ 秒级测试执行
- 🧪 覆盖所有核心功能
- 📊 模拟数据发送
- ✅ 详细的结果报告

### 示例项目 (`examples/`)
- 📱 多框架示例
- 🎯 真实使用场景
- 📚 最佳实践演示
- 🔧 可直接运行

## 📋 调试清单

### ✅ 开发前检查
- [ ] 安装依赖：`npm install`
- [ ] 构建成功：`npm run build`
- [ ] 类型检查通过：`npm run type-check`
- [ ] 代码格式正确：`npm run lint`

### ✅ 功能验证
- [ ] 快速测试通过：`npm run dev:quick-test`
- [ ] 单元测试通过：`npm test`
- [ ] 集成测试通过：`npm run test:integration`
- [ ] 示例项目运行正常

### ✅ 性能检查
- [ ] 初始化时间 < 50ms
- [ ] 内存使用合理
- [ ] 无内存泄漏
- [ ] 错误处理正常

## 🐛 常见问题解决

### npm link问题
**问题**：链接后模块找不到
```bash
# 解决方案
npm unlink -g frontend-monitor-sdk
npm link
```

### 构建失败
**问题**：TypeScript编译错误
```bash
# 检查类型
npm run type-check

# 修复格式
npm run format

# 检查语法
npm run lint
```

### 示例页面无法访问
**问题**：端口被占用
```bash
# 修改端口
export PORT=8081
npm run playground
```

### 测试数据不发送
**问题**：fetch未定义
```bash
# 检查环境变量
export NODE_ENV=development

# 或使用Node.js polyfill
npm install whatwg-fetch --save-dev
```

## 🎯 性能调试

### 监控初始化性能
```javascript
console.time('SDK初始化');
const monitor = createFrontendMonitor();
await monitor.init(config);
console.timeEnd('SDK初始化');
```

### 监控内存使用
```javascript
const initialMemory = performance.memory?.usedJSHeapSize || 0;
// ... 使用SDK
const finalMemory = performance.memory?.usedJSHeapSize || 0;
console.log(`内存增长: ${finalMemory - initialMemory} bytes`);
```

### 监控错误处理
```javascript
// 在错误处理中添加日志
monitor.recordError(error, {
  context: 'debugging',
  timestamp: Date.now(),
  userAgent: navigator.userAgent
});
```

## 🔍 高级调试技巧

### 1. 条件性调试
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('Debug: 监控数据', data);
}
```

### 2. 调试模式配置
```typescript
const debugConfig = {
  ...config,
  debug: true,
  logLevel: 'verbose',
  enableConsoleLogging: true
};
```

### 3. 实时数据监控
```typescript
// 拦截数据发送
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
  console.log('发送数据:', JSON.parse(options.body));
  return originalFetch(url, options);
};
```

## 📚 相关资源

- [OpenTelemetry文档](https://opentelemetry.io/docs/)
- [npm link文档](https://docs.npmjs.com/cli/v8/commands/npm-link)
- [pnpm workspace](https://pnpm.io/workspaces)
- [Rollup文档](https://rollupjs.org/guide/en/)

## 💡 最佳实践

1. **开发阶段**：使用 `npm run dev` 进行热重载开发
2. **测试阶段**：使用 `npm run debug` 快速验证功能
3. **集成阶段**：使用 `npm run dev:link` 在真实项目中测试
4. **发布前**：运行完整的测试套件确保质量

通过这些调试方法，您可以大大提高开发效率，快速定位和解决问题！