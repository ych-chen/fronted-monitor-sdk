# Frontend Monitor SDK

基于 OpenTelemetry JavaScript SDK 的模块化前端监控组件，提供分布式追踪、性能指标监控、错误捕获和用户行为分析。

## ✨ 特性

- 🔍 **模块化设计** - 可按需启用追踪、指标、错误监控等模块
- 📊 **分布式追踪** - 基于 OpenTelemetry 标准的链路追踪
- 🚀 **自动Instrumentation** - XMLHttpRequest 和 Fetch API 自动追踪
- 📈 **性能指标** - FCP、LCP、FID、CLS 等核心性能指标自动采集
- 📝 **自定义指标** - Counter、Histogram、Gauge 灵活的指标系统
- 🚨 **错误监控** - JavaScript 错误和 Promise 拒绝自动捕获
- 👤 **用户行为** - 点击、输入、导航等交互事件追踪
- 🎯 **TypeScript** - 完整的类型定义支持

## 📦 安装

```bash
npm install frontend-monitor-sdk
# 或
yarn add frontend-monitor-sdk
# 或
pnpm add frontend-monitor-sdk
```

## 🏗️ 项目结构

```
src/
├── index.ts                  # 主入口文件
├── sdk.ts                    # 主SDK类
├── types.ts                  # TypeScript类型定义
├── config/
│   └── default-config.ts     # 默认配置
├── trace/                    # 🔍 链路追踪模块
│   ├── tracer.ts             # 追踪管理器
│   └── instrumentation/
│       ├── index.ts          # 自动instrumentation入口
│       ├── xhr-instrumentation.ts  # XMLHttpRequest自动追踪
│       └── fetch-instrumentation.ts # Fetch API自动追踪
├── metrics/                  # 📊 性能指标模块
│   ├── index.ts              # 指标模块入口
│   ├── performance.ts        # 自动性能指标(FCP、LCP等)
│   └── custom.ts             # 自定义指标收集器
└── examples/                 # 📚 使用示例
    ├── modular-usage.ts      # 模块化使用示例
    ├── react-app.tsx         # React集成示例
    └── vanilla-js.html       # 原生HTML示例
```

## 🎯 各模块功能详解

### 🔍 **链路追踪模块 (trace/)**

#### **tracer.ts - 追踪管理器**
- `TraceManager` 类：统一的span创建和管理
- 支持同步和异步操作追踪
- 提供上下文传递和属性设置

#### **instrumentation/ - 自动instrumentation**
- `xhr-instrumentation.ts`：XMLHttpRequest自动拦截和追踪
- `fetch-instrumentation.ts`：Fetch API自动拦截和追踪
- 自动注入trace头、记录请求/响应信息

**使用示例：**
```typescript
import { TraceManager } from 'frontend-monitor-sdk';

const traceManager = new TraceManager('my-app');

// 手动创建span
const span = traceManager.startSpan('user_operation');

// 异步追踪
await traceManager.traceAsync('database_query', async (span) => {
  // 数据库操作
  span.setAttributes({ query: 'SELECT * FROM users' });
});
```

### 📊 **性能指标模块 (metrics/)**

#### **performance.ts - 自动性能指标**
- **FCP** (First Contentful Paint) - 首次内容渲染时间
- **LCP** (Largest Contentful Paint) - 最大内容渲染时间
- **FID** (First Input Delay) - 首次输入延迟
- **CLS** (Cumulative Layout Shift) - 累积布局偏移
- **TTFB** (Time to First Byte) - 首字节时间

#### **custom.ts - 自定义指标收集器**
- `CustomMetricsCollector` 类：灵活的自定义指标系统
- **Counter** - 计数器：用于计数统计
- **Histogram** - 直方图：用于分布统计（如响应时间）
- **Gauge** - 仪表盘：用于当前值统计（如在线用户数）

**使用示例：**
```typescript
import { CustomMetricsCollector } from 'frontend-monitor-sdk';

const metrics = new CustomMetricsCollector(meter);

// 计数器
metrics.incrementCounter('api_requests_total', 1, { endpoint: '/api/users' });

// 直方图
metrics.recordHistogram('response_time_ms', 245, { method: 'GET' });

// 仪表盘
metrics.setGauge('active_users', 42, { region: 'us-east' });

// 预定义业务指标
metrics.recordHTTPRequest('GET', '/api/users', 200, 150);
metrics.recordUserAction('click', 'button', 100);
```

## 🚀 快速开始

### 基础使用

```typescript
import { createFrontendMonitor } from 'frontend-monitor-sdk';

const monitor = createFrontendMonitor();

await monitor.init({
  serviceName: 'my-web-app',
  serviceVersion: '1.0.0',
  endpoint: 'https://your-collector.example.com',
});
```

### 模块化配置

```typescript
await monitor.init({
  serviceName: 'my-app',
  endpoint: 'https://collector.example.com',

  // 按需启用模块
  enableAutoTracing: true,        // XMLHttpRequest/Fetch自动追踪
  enablePerformanceMetrics: true, // FCP、LCP自动采集
  enableCustomMetrics: true,      // 用户自定义指标
  enableErrorMonitoring: true,    // 错误监控
  enableUserInteractionMonitoring: true, // 用户交互监控
});
```

## 📖 使用场景

### 1. 自动HTTP追踪

```typescript
// XMLHttpRequest自动追踪
fetch('/api/users')
  .then(response => response.json())
  .then(data => {
    // 自动创建HTTP span，记录请求信息
  });

// 手动创建业务span
const tracing = monitor.startTracing('user_payment', {
  attributes: { user_id: '123', amount: 99.99 }
});

// 业务逻辑
try {
  await processPayment();
  tracing.endSpan();
} catch (error) {
  tracing.recordError(error as Error);
  tracing.endSpan();
}
```

### 2. 性能指标监控

```typescript
// FCP、LCP等指标会自动采集

// 自定义性能指标
monitor.recordMetrics({
  apiResponseTime: 245,
  databaseQueryTime: 120,
  renderTime: 50
});

// 使用指标收集器
const metrics = monitor.getMetricsCollector();
metrics.recordHistogram('feature_load_time_ms', 500, {
  feature: 'dashboard'
});
```

### 3. 错误监控

```typescript
// JavaScript错误自动捕获

// 手动记录错误
monitor.recordError(new Error('Payment failed'), {
  user_id: '123',
  payment_method: 'credit_card',
  amount: 99.99
});

// Promise错误自动捕获
try {
  await riskyOperation();
} catch (error) {
  monitor.recordError(error);
}
```

### 4. 用户行为追踪

```typescript
// 用户交互自动捕获

// 手动记录用户交互
monitor.recordUserInteraction({
  type: 'click',
  element: 'button',
  target: 'submit-button',
  timestamp: Date.now(),
  duration: 150
});
```

## 🎛️ 配置选项

### MonitorConfig

```typescript
interface MonitorConfig {
  // 必需配置
  serviceName: string;           // 服务名称
  endpoint: string;              // OTLP 收集器端点

  // 可选配置
  serviceVersion?: string;       // 服务版本
  sampleRate?: number;           // 采样率 (0-1)
    attributes?: Record<string, string>; // 自定义属性

  // 模块开关
  enableAutoTracing?: boolean;           // 自动追踪 (XMLHttpRequest/Fetch)
  enablePerformanceMetrics?: boolean;  // 性能指标 (FCP/LCP等)
  enableCustomMetrics?: boolean;        // 自定义指标
  enableErrorMonitoring?: boolean;      // 错误监控
  enableUserInteractionMonitoring?: boolean; // 用户交互监控

  // 过滤配置
  excludedUrls?: string[];        // 排除的URL模式
}
```

## 🔧 高级用法

### React项目集成

```tsx
import { createFrontendMonitor } from 'frontend-monitor-sdk';

const monitor = createFrontendMonitor();

// App.tsx
function App() {
  useEffect(() => {
    monitor.init({
      serviceName: 'react-app',
      endpoint: 'https://collector.example.com',
      enableAutoTracing: true,
      enablePerformanceMetrics: true,
    });
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

// ErrorBoundary.tsx
class ErrorBoundary extends Component {
  componentDidCatch(error, errorInfo) {
    monitor.recordError(error, errorInfo);
  }
}
```

### Vue项目集成

```typescript
import { createFrontendMonitor } from 'frontend-monitor-sdk';

const monitor = createFrontendMonitor();

// main.ts
monitor.init({
  serviceName: 'vue-app',
  endpoint: 'https://collector.example.com'
});

// 错误处理
app.config.errorHandler = (error, vm, info) => {
  monitor.recordError(error, { vueInfo: info });
};
```

### 原生HTML使用

```html
<script src="https://unpkg.com/frontend-monitor-sdk/dist/index.umd.js"></script>
<script>
  const monitor = FrontendMonitorSDK.createFrontendMonitor();

  monitor.init({
    serviceName: 'static-website',
    endpoint: 'https://your-collector.example.com'
  });
</script>
```

## 📦 构建产物

该包提供多种格式：

- `dist/index.esm.js` - ES模块 (现代打包工具)
- `dist/index.js` - CommonJS模块 (Node.js)
- `dist/index.umd.js` - UMD模块 (浏览器直接使用)
- `dist/index.d.ts` - TypeScript类型定义

## 🔍 开发和构建

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 类型检查
npm run type-check

# 代码检查
npm run lint

# 格式化代码
npm run format
```

## 🌐 兼容性

- **浏览器**: 支持现代浏览器 (Chrome 60+, Firefox 55+, Safari 12+)
- **框架**: React, Vue, Angular, Svelte 等所有现代前端框架
- **构建工具**: Webpack, Vite, Rollup, esbuild 等所有打包工具
- **收集器**: 任何支持 OTLP 的 OpenTelemetry 收集器

## 📚 更多资源

- [OpenTelemetry JavaScript 文档](https://opentelemetry.io/docs/instrumentation/js/)
- [OpenTelemetry 协议规范](https://opentelemetry.io/docs/reference/specification/protocol/otlp/)
- [Core Web Vitals](https://web.dev/vitals/)

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

---

**注意**: 此SDK为监控工具，请确保在生产环境中正确配置采样率和数据隐私保护。