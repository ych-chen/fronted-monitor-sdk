# 前端监控SDK

[![npm version](https://badge.fury.io/js/%40your-org%2Ffrontend-monitor-sdk.svg)](https://badge.fury.io/js/%40your-org%2Ffrontend-monitor-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

一个基于OpenTelemetry标准的现代化前端监控SDK，提供全面的性能监控、错误追踪、用户行为分析和分布式追踪功能。

## ✨ 特性

- 🚀 **现代化设计** - 基于最新的Web标准和OpenTelemetry规范
- 📊 **全面监控** - 性能指标、错误追踪、用户交互、自定义指标
- 🔍 **分布式追踪** - 完整的请求链路追踪和性能分析
- 🛡️ **类型安全** - 完整的TypeScript支持和类型定义
- 🎯 **零配置** - 开箱即用，同时支持深度自定义
- 🌐 **框架无关** - 支持React、Vue、Angular以及原生JavaScript
- 📱 **移动端优化** - 针对移动端浏览器进行性能优化
- 🔧 **可扩展** - 插件化架构，支持自定义扩展

## 🚀 快速开始

### 安装

```bash
# 使用npm
npm install @your-org/frontend-monitor-sdk

# 使用yarn
yarn add @your-org/frontend-monitor-sdk

# 使用pnpm
pnpm add @your-org/frontend-monitor-sdk
```

### 基础使用

```typescript
import { createFrontendMonitor } from '@your-org/frontend-monitor-sdk';

// 创建监控实例
const monitor = createFrontendMonitor();

// 初始化SDK
await monitor.init({
  serviceName: 'my-web-app',
  serviceVersion: '1.0.0',
  endpoint: 'https://your-collector.example.com',
  enablePerformanceMonitoring: true,
  enableErrorMonitoring: true,
  enableUserInteractionMonitoring: true
});

// SDK现在已就绪，会自动开始收集监控数据
```

### 手动记录数据

```typescript
// 记录自定义指标
const metrics = monitor.getMetricsCollector();
metrics.incrementCounter('user_signups_total', 1, {
  plan: 'premium',
  source: 'organic'
});

// 记录自定义错误
monitor.recordError(new Error('支付处理失败'), {
  userId: 'user_123',
  paymentId: 'pay_456',
  amount: 99.99
});

// 记录用户交互
monitor.recordUserInteraction({
  type: 'click',
  element: 'button',
  target: 'checkout-button',
  timestamp: Date.now()
});

// 创建自定义追踪
const tracer = monitor.startTracing('user_registration', {
  attributes: {
    userId: 'user_123',
    registrationMethod: 'email'
  }
});

// 添加追踪事件
tracer.addEvent('validation_started');
tracer.addEvent('validation_completed');

// 结束追踪
tracer.endSpan();
```

## 📚 文档

### 核心概念

#### 1. 配置选项

| 配置项 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `serviceName` | string | ✅ | - | 服务名称，用于标识监控数据来源 |
| `endpoint` | string | ✅ | - | 监控数据收集端点URL |
| `serviceVersion` | string | ❌ | - | 服务版本号，用于版本管理 |
| `sampleRate` | number | ❌ | 1.0 | 采样率，范围0.0-1.0 |
| `enablePerformanceMonitoring` | boolean | ❌ | true | 是否启用性能监控 |
| `enableErrorMonitoring` | boolean | ❌ | true | 是否启用错误监控 |
| `enableUserInteractionMonitoring` | boolean | ❌ | true | 是否启用用户交互监控 |

#### 2. 性能监控

自动收集的Core Web Vitals指标：

- **FCP** (First Contentful Paint) - 首次内容绘制时间
- **LCP** (Largest Contentful Paint) - 最大内容绘制时间
- **FID** (First Input Delay) - 首次输入延迟
- **CLS** (Cumulative Layout Shift) - 累积布局偏移
- **TTFB** (Time to First Byte) - 首字节时间

#### 3. 错误监控

自动捕获的错误类型：

- JavaScript运行时错误
- 未处理的Promise拒绝
- 资源加载错误
- 网络请求错误
- 自定义业务错误

#### 4. 用户交互监控

支持的交互类型：

- 点击事件（按钮、链接等）
- 表单提交和输入
- 页面滚动
- 导航跳转
- 自定义交互事件

### 框架集成

#### React

```typescript
import React, { useEffect } from 'react';
import { createFrontendMonitor } from '@your-org/frontend-monitor-sdk';

const monitor = createFrontendMonitor();

function App() {
  useEffect(() => {
    monitor.init({
      serviceName: 'react-app',
      endpoint: 'https://your-collector.example.com'
    });

    return () => {
      monitor.destroy();
    };
  }, []);

  // 在组件中使用
  const handleClick = () => {
    monitor.recordUserInteraction({
      type: 'click',
      element: 'button',
      target: 'react-button'
    });
  };

  return <button onClick={handleClick}>点击我</button>;
}
```

#### Vue 3

```typescript
import { createApp, onMounted, onUnmounted } from 'vue';
import { createFrontendMonitor } from '@your-org/frontend-monitor-sdk';

const monitor = createFrontendMonitor();

const app = createApp({
  setup() {
    onMounted(async () => {
      await monitor.init({
        serviceName: 'vue-app',
        endpoint: 'https://your-collector.example.com'
      });
    });

    onUnmounted(() => {
      monitor.destroy();
    });

    const handleClick = () => {
      monitor.recordUserInteraction({
        type: 'click',
        element: 'button',
        target: 'vue-button'
      });
    };

    return { handleClick };
  }
});
```

#### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>监控示例</title>
</head>
<body>
  <button id="myButton">点击我</button>

  <script type="module">
    import { createFrontendMonitor } from '@your-org/frontend-monitor-sdk';

    const monitor = createFrontendMonitor();

    // 初始化监控
    monitor.init({
      serviceName: 'vanilla-js-app',
      endpoint: 'https://your-collector.example.com'
    });

    // 添加事件监听
    document.getElementById('myButton').addEventListener('click', () => {
      monitor.recordUserInteraction({
        type: 'click',
        element: 'button',
        target: 'vanilla-button'
      });
    });
  </script>
</body>
</html>
```

## 🔧 高级配置

### 自定义采样策略

```typescript
const monitor = createFrontendMonitor();

await monitor.init({
  serviceName: 'my-app',
  endpoint: 'https://your-collector.example.com',
  sampleRate: 0.1, // 10%采样率
  attributes: {
    environment: 'production',
    version: '1.2.3',
    region: 'asia-east1'
  }
});
```

### 批量数据配置

```typescript
await monitor.init({
  serviceName: 'my-app',
  endpoint: 'https://your-collector.example.com',
  batchSettings: {
    maxBatchSize: 100,        // 最大批量大小
    flushInterval: 5000,      // 发送间隔（毫秒）
    maxWaitTime: 10000        // 最大等待时间（毫秒）
  }
});
```

### 过滤不需要监控的URL

```typescript
await monitor.init({
  serviceName: 'my-app',
  endpoint: 'https://your-collector.example.com',
  excludedUrls: [
    '/health',           // 健康检查端点
    '/static/*',         // 静态资源
    '*/analytics.js',    // 分析脚本
    /admin\/.*\/debug/   // 管理端调试接口（正则表达式）
  ]
});
```

## 📊 监控数据

### 数据格式

监控数据以OTLP（OpenTelemetry Protocol）格式发送，包含以下主要类型：

```typescript
// 指标数据
{
  timestamp: 1640995200000,
  serviceName: 'my-app',
  metrics: {
    'user_actions_total': 150,
    'response_time_ms': 250,
    'active_users': 42
  }
}

// 错误数据
{
  timestamp: 1640995200000,
  serviceName: 'my-app',
  errors: [{
    message: 'Network request failed',
    stack: 'Error: Network request failed\n    at...',
    level: 'error',
    context: {
      url: '/api/users',
      method: 'GET',
      statusCode: 500
    }
  }]
}

// 用户交互数据
{
  timestamp: 1640995200000,
  serviceName: 'my-app',
  interactions: [{
    type: 'click',
    element: 'button',
    target: 'submit-button',
    timestamp: 1640995200000,
    duration: 150
  }]
}

// 追踪数据
{
  timestamp: 1640995200000,
  serviceName: 'my-app',
  traces: [{
    traceId: 'abc123',
    spanId: 'def456',
    operationName: 'user_login',
    startTime: 1640995200000,
    duration: 1200,
    attributes: {
      userId: 'user_123',
      loginMethod: 'email'
    }
  }]
}
```

## 🛠️ 开发指南

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/your-org/frontend-monitor-sdk.git
cd frontend-monitor-sdk

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 运行类型检查
npm run type-check

# 构建项目
npm run build
```

### 测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行性能测试
npm run test:performance

# 运行浏览器兼容性测试
npm run test:browser

# 生成测试覆盖率报告
npm run test:coverage
```

### 代码质量

```bash
# 运行ESLint检查
npm run lint

# 自动修复ESLint问题
npm run lint:fix

# 运行Prettier格式化
npm run format

# 运行类型检查
npm run type-check
```

## 🤝 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

1. Fork项目仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

### 贡献规范

- 遵循现有的代码风格和规范
- 添加适当的测试用例
- 更新相关文档
- 确保所有测试通过
- 使用语义化的提交消息

## 📄 许可证

本项目采用MIT许可证。详情请参阅 [LICENSE](LICENSE) 文件。

## 🆘 支持

如果您遇到问题或有疑问：

- 📖 查看[完整文档](./docs/README.md)
- 🐛 提交[Issue](https://github.com/your-org/frontend-monitor-sdk/issues)
- 💬 参与[讨论](https://github.com/your-org/frontend-monitor-sdk/discussions)
- 📧 发送邮件至 support@your-org.com

## 🗺️ 路线图

### v1.1.0 (计划中)
- [ ] 添加会话重放功能
- [ ] 支持Web Workers监控
- [ ] 增强移动端性能指标
- [ ] 添加地理位置数据收集

### v1.2.0 (计划中)
- [ ] 支持Service Worker监控
- [ ] 添加内存使用监控
- [ ] 支持多环境配置
- [ ] 增强数据可视化

### v2.0.0 (长期计划)
- [ ] 支持边缘计算环境
- [ ] AI驱动的异常检测
- [ ] 实时性能分析
- [ ] 跨应用关联分析

---

## 🌟 致谢

感谢所有为这个项目做出贡献的开发者和用户！

特别感谢：
- [OpenTelemetry](https://opentelemetry.io/) 项目提供的标准和工具
- 所有反馈和建议的用户
- 社区维护者和贡献者

如果这个项目对您有帮助，请给我们一个 ⭐️！