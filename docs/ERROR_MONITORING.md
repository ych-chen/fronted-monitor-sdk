# 错误监控系统文档

## 概述

前端监控SDK提供了一套全面的错误监控系统，结合了**日志记录**和**链路追踪**两种技术，确保错误信息的完整性和可追溯性。

## 核心特性

### 1. 全面的错误捕获
- ✅ **JavaScript运行时错误** - 同步和异步错误
- ✅ **Promise rejection错误** - 未处理的Promise拒绝
- ✅ **网络请求错误** - fetch和XMLHttpRequest失败
- ✅ **静态资源加载错误** - 图片、脚本、样式表加载失败
- ✅ **控制台错误** - `console.error`调用捕获
- ✅ **框架特定错误** - React、Vue.js错误边界
- ✅ **自定义错误** - 手动记录的业务错误

### 2. 日志 + 链路追踪结合

```typescript
// 核心处理逻辑（参考你的实现）
function handleError(errorInfo, tracer, logger) {
  // 获取当前活跃 span（页面 load span、click span、xhr span 等）
  const activeSpan = tracer.getCurrentSpan?.() || null;

  // -------- 写入 trace event ----------
  if (activeSpan) {
    activeSpan.recordException({
      type: "Error",
      message: errorInfo.message,
      stack: errorInfo.stack,
    });
    activeSpan.setStatus({ code: 2, message: errorInfo.message }); // ERROR
    activeSpan.addEvent("frontend.error", {
      "exception.message": errorInfo.message,
      "exception.stacktrace": errorInfo.stack || "",
    });
  }

  // -------- 写入 log ----------
  logger.emit({
    severityNumber: 17, // ERROR
    severityText: "ERROR",
    body: errorInfo.message,
    attributes: {
      eventType: "frontend_error",
      type: errorInfo.type,
      message: errorInfo.message,
      stack: errorInfo.stack,
      source: errorInfo.source,
      lineno: errorInfo.lineno,
      colno: errorInfo.colno,
      path: window.location.pathname,
      url: window.location.href,
      userAgent: navigator.userAgent,
      traceId: activeSpan?.spanContext().traceId,
      spanId: activeSpan?.spanContext().spanId,
    }
  });
}
```

### 3. 错误分类和优先级

#### 错误类型 (ErrorType)
```typescript
enum ErrorType {
  JAVASCRIPT = 'javascript',         // JavaScript运行时错误
  NETWORK = 'network',               // 网络请求错误
  RESOURCE = 'resource',             // 静态资源加载错误
  PROMISE = 'promise',               // Promise rejection错误
  CONSOLE = 'console',               // console.error调用
  CUSTOM = 'custom',                 // 自定义错误
  WORKER = 'worker',                 // Web Worker错误
  IFRAME = 'iframe',                 // iframe错误
  VUE = 'vue',                       // Vue.js错误
  REACT = 'react',                   // React错误
  ANGULAR = 'angular',               // Angular错误
  PERFORMANCE = 'performance',       // 性能相关错误
  MEMORY = 'memory'                  // 内存相关错误
}
```

#### 错误严重程度 (ErrorSeverity)
```typescript
enum ErrorSeverity {
  CRITICAL = 'critical',     // 严重错误：核心功能不可用
  HIGH = 'high',             // 高级错误：重要功能受影响
  MEDIUM = 'medium',         // 中级错误：次要功能受影响
  LOW = 'low',               // 低级错误：不影响核心功能
  INFO = 'info'              // 信息性：仅用于记录
}
```

### 4. 错误指纹和去重

```typescript
// 基于错误消息和堆栈生成唯一指纹
const fingerprint = ErrorFingerprint.generate(error, context);

// 相同错误会被聚合，避免重复记录
{
  fingerprint: "abc123",
  count: 5,                    // 出现次数
  firstSeen: 1704067200000,    // 首次出现时间
  lastSeen: 1704067265000,     // 最后出现时间
  message: "Cannot read property 'undefined' of undefined"
}
```

## 使用方法

### 基本配置

```typescript
import { createFrontendMonitor } from 'frontend-monitor-sdk';

const monitor = createFrontendMonitor();

await monitor.init({
  serviceName: 'my-app',
  endpoint: 'https://your-otel-collector.example.com',
  enableErrorMonitoring: true,
  // 其他配置...
});
```

### 记录自定义错误

```typescript
// 记录自定义错误
monitor.recordError('用户登录失败', {
  userId: '12345',
  loginMethod: 'email',
  errorCategory: 'authentication'
});

// 记录Error对象
try {
  await riskyOperation();
} catch (error) {
  monitor.recordError(error, {
    operation: 'data_processing',
    userId: getCurrentUserId(),
    context: 'user_profile_update'
  });
}
```

### 获取错误统计

```typescript
// 获取错误日志
const errorLogs = monitor.getErrorLogs({
  errorType: ErrorType.JAVASCRIPT,
  severity: ErrorSeverity.HIGH,
  startTime: Date.now() - 3600000 // 最近1小时
});

// 获取错误统计
const stats = monitor.getErrorStats();
console.log(stats);
// {
//   totalErrors: 156,
//   errorsByType: {
//     'javascript': 89,
//     'network': 34,
//     'resource': 23,
//     'promise': 10
//   },
//   errorsBySeverity: {
//     'critical': 5,
//     'high': 23,
//     'medium': 89,
//     'low': 39
//   },
//   topErrors: [
//     {
//       fingerprint: "abc123",
//       count: 15,
//       message: "Cannot read property 'undefined' of undefined"
//     }
//   ]
// }
```

## JavaScript错误捕获详解

### 1. window.onerror vs addEventListener('error')

```typescript
// 方式1: window.onerror (传统方式)
window.onerror = function(message, source, lineno, colno, error) {
  // 优势：最兼容，支持所有浏览器
  // 劣势：只能有一个处理器，无法捕获资源加载错误

  console.log('传统错误处理:', {
    message,    // 错误消息
    source,     // 错误文件URL
    lineno,     // 错误行号
    colno,      // 错误列号
    error       // Error对象（包含堆栈）
  });
};

// 方式2: addEventListener('error') (推荐方式)
window.addEventListener('error', function(event) {
  // 优势：可以设置多个处理器，能捕获资源加载错误
  // event.target === window: JavaScript错误
  // event.target !== window: 资源加载错误

  if (event.target !== window) {
    // 静态资源加载错误
    const element = event.target as HTMLElement;
    console.log('资源加载失败:', {
      element: element.tagName,
      src: (element as any).src || (element as any).href
    });
  } else {
    // JavaScript运行时错误
    console.log('JavaScript错误:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  }
}, true); // 使用捕获阶段
```

### 2. Promise rejection错误

```typescript
// unhandledrejection事件捕获Promise错误
window.addEventListener('unhandledrejection', function(event) {
  // event.reason: Promise.reject()的参数
  // event.promise: 被拒绝的Promise对象

  const error = event.reason instanceof Error
    ? event.reason
    : new Error(String(event.reason));

  console.log('Promise rejection:', {
    reason: event.reason,
    promise: event.promise,
    message: error.message,
    stack: error.stack
  });

  // 阻止错误在控制台显示（可选）
  // event.preventDefault();
});
```

### 3. 网络请求错误

```typescript
// fetch请求错误拦截
const originalFetch = window.fetch;

window.fetch = async function(input, init) {
  try {
    const response = await originalFetch(input, init);

    // 检查HTTP状态码
    if (!response.ok) {
      const url = typeof input === 'string' ? input : input.url;
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    // 网络级别错误（连接失败、超时等）
    const url = typeof input === 'string' ? input : input.url;

    console.log('网络请求失败:', {
      url,
      method: init?.method || 'GET',
      error: error.message,
      type: 'fetch_error'
    });

    throw error;
  }
};

// XMLHttpRequest错误拦截
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, ...args) {
  (this as any)._method = method;
  (this as any)._url = url;
  return originalXHROpen.call(this, method, url, ...args);
};

XMLHttpRequest.prototype.send = function(...args) {
  const xhr = this;

  xhr.addEventListener('error', () => {
    console.log('XHR网络错误:', {
      method: (xhr as any)._method,
      url: (xhr as any)._url,
      type: 'xhr_network_error'
    });
  });

  xhr.addEventListener('load', () => {
    if (xhr.status >= 400) {
      console.log('XHR HTTP错误:', {
        method: (xhr as any)._method,
        url: (xhr as any)._url,
        status: xhr.status,
        statusText: xhr.statusText,
        type: 'xhr_http_error'
      });
    }
  });

  return originalXHRSend.call(this, ...args);
};
```

### 4. 静态资源加载错误

```typescript
window.addEventListener('error', function(event) {
  // 检查是否为资源加载错误
  if (event.target !== window) {
    const target = event.target as any;

    console.log('静态资源加载失败:', {
      tagName: target.tagName?.toLowerCase(),
      resourceType: getResourceType(target),
      url: target.src || target.href,
      id: target.id,
      className: target.className
    });
  }
}, true);

function getResourceType(element: any): string {
  const tagName = element.tagName?.toLowerCase();

  switch (tagName) {
    case 'img': return 'image';
    case 'script': return 'script';
    case 'link': return element.rel || 'stylesheet';
    case 'video': return 'video';
    case 'audio': return 'audio';
    case 'iframe': return 'iframe';
    default: return 'unknown';
  }
}
```

### 5. 框架特定错误

#### React错误边界集成
```typescript
// React错误边界组件
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 使用SDK记录React错误
    monitor.recordError(error, {
      errorType: ErrorType.REACT,
      component: 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      reactVersion: React.version
    });
  }

  render() {
    return this.props.children;
  }
}

// 监听React相关错误（全局捕获）
window.addEventListener('error', (event) => {
  if (event.message && (
    event.message.includes('React') ||
    event.message.includes('Minified React error')
  )) {
    monitor.recordError(event.error || new Error(event.message), {
      errorType: ErrorType.REACT,
      context: {
        framework: 'react',
        globalCapture: true
      }
    });
  }
});
```

#### Vue.js错误处理
```typescript
// Vue 2.x 全局错误处理
if (window.Vue && window.Vue.config) {
  Vue.config.errorHandler = (err, vm, info) => {
    monitor.recordError(err, {
      errorType: ErrorType.VUE,
      component: vm?.$options?.name || 'unknown',
      info,
      props: vm?.$props,
      framework: 'vue',
      version: '2.x'
    });
  };
}

// Vue 3.x 全局错误处理
if (window.Vue && window.Vue.createApp) {
  const app = Vue.createApp({});
  app.config.errorHandler = (err, vm, info) => {
    monitor.recordError(err, {
      errorType: ErrorType.VUE,
      component: vm?.$options?.name || 'unknown',
      info,
      props: vm?.$props,
      framework: 'vue',
      version: '3.x'
    });
  };
}
```

## 错误数据结构

### 错误日志条目 (ErrorLogEntry)

```typescript
interface ErrorLogEntry {
  id: string;                    // 唯一标识
  timestamp: number;             // 时间戳
  errorType: ErrorType;          // 错误类型
  severity: ErrorSeverity;       // 错误严重程度
  message: string;               // 错误消息
  stack?: string;                // 错误堆栈
  url: string;                   // 当前页面URL
  userAgent: string;             // 浏览器信息
  userId?: string;               // 用户ID
  sessionId: string;             // 会话ID
  source?: string;               // 错误源文件
  line?: number;                 // 错误行号
  column?: number;               // 错误列号
  tags?: Record<string, string>; // 标签
  context?: Record<string, any>; // 上下文数据
  traceId?: string;              // 关联的Trace ID
  spanId?: string;               // 关联的Span ID
  fingerprint: string;           // 错误指纹
  groupKey: string;              // 分组键
  count?: number;                // 出现次数
  firstSeen?: number;            // 首次出现时间
  lastSeen?: number;             // 最后出现时间
}
```

## 最佳实践

### 1. 错误处理策略

```typescript
// 分层错误处理
class ErrorHandler {
  static handle(error: Error, context: any) {
    // 1. 记录到监控系统
    monitor.recordError(error, {
      ...context,
      errorLevel: this.determineLevel(error),
      category: this.categorizeError(error)
    });

    // 2. 用户友好提示
    this.showUserFriendlyMessage(error);

    // 3. 错误恢复尝试
    this.attemptRecovery(error);
  }

  private static determineLevel(error: Error): ErrorSeverity {
    // 基于错误类型和内容确定严重程度
    if (error.name === 'TypeError' && error.message.includes('Cannot read')) {
      return ErrorSeverity.HIGH;
    }

    if (error.name === 'NetworkError') {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  private static categorizeError(error: Error): string {
    // 错误分类
    if (error.message.includes('fetch')) return 'api_error';
    if (error.message.includes('localStorage')) return 'storage_error';
    if (error.message.includes('WebSocket')) return 'websocket_error';

    return 'general_error';
  }
}
```

### 2. 错误过滤和采样

```typescript
// 配置错误过滤
await monitor.init({
  serviceName: 'my-app',
  endpoint: 'https://otel.example.com',
  enableErrorMonitoring: true,

  // 排除不重要的错误
  excludedErrors: [
    'Non-Error promise rejection captured',
    'Script error.',
    'ResizeObserver loop limit exceeded'
  ],

  // 排除第三方URL错误
  excludedUrls: [
    'https://www.google-analytics.com',
    'https://stats.g.doubleclick.net',
    'chrome-extension://'
  ],

  // 限制错误频率
  maxErrorsPerMinute: 50
});
```

### 3. 错误监控和性能监控结合

```typescript
// 错误上下文增强
function recordErrorWithPerformanceContext(error: Error) {
  const performanceContext = {
    // 页面性能指标
    fcp: performance.getEntriesByType('paint')[0]?.startTime,
    lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,

    // 内存使用情况
    memoryUsage: (performance as any).memory?.usedJSHeapSize,

    // 用户活跃度
    timeOnPage: Date.now() - pageLoadTime,

    // 网络状况
    connectionType: (navigator as any).connection?.effectiveType,

    // 页面状态
    visibilityState: document.visibilityState,
    isBackground: document.hidden
  };

  monitor.recordError(error, {
    ...performanceContext,
    errorType: ErrorType.JAVASCRIPT
  });
}
```

## 故障排除

### 1. 常见问题

#### Q: 错误没有被捕获
```typescript
// 检查配置
console.log('Error monitor status:', monitor.getErrorStats());

// 检查是否正确初始化
if (!monitor.isInitialized) {
  console.warn('Monitor not initialized');
}
```

#### Q: 错误日志没有发送到后端
```typescript
// 检查网络连接
fetch('/health')
  .then(response => response.json())
  .then(data => console.log('Backend health:', data))
  .catch(error => console.error('Backend connection failed:', error));

// 检查配置的endpoint
console.log('Error monitor config:', {
  endpoint: config.endpoint,
  enabled: config.enableErrorMonitoring
});
```

#### Q: 错误重复过多
```typescript
// 调整过滤配置
monitor.updateConfig({
  excludedErrors: [
    // 添加需要排除的错误模式
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured'
  ],
  maxErrorsPerMinute: 30  // 减少频率限制
});
```

### 2. 调试技巧

```typescript
// 启用详细日志
monitor.updateConfig({
  logToConsole: true
});

// 监控错误统计
setInterval(() => {
  const stats = monitor.getErrorStats();
  if (stats.totalErrors > 0) {
    console.warn('Errors detected:', stats);
  }
}, 30000); // 每30秒检查一次

// 手动触发测试错误
monitor.recordError('测试错误', {
  test: true,
  timestamp: Date.now()
});
```

### 3. 性能优化

```typescript
// 使用错误采样
class ErrorSampler {
  private static lastReset = Date.now();
  private static count = 0;

  static shouldSample(): boolean {
    const now = Date.now();

    // 每分钟重置计数器
    if (now - this.lastReset > 60000) {
      this.count = 0;
      this.lastReset = now;
    }

    // 限制每分钟错误数量
    if (this.count >= 100) {
      return false;
    }

    this.count++;
    return true;
  }
}

// 在错误处理中使用采样
function recordErrorSafely(error: Error) {
  if (ErrorSampler.shouldSample()) {
    monitor.recordError(error);
  } else {
    console.warn('Error rate limited:', error.message);
  }
}
```

## 总结

增强的错误监控系统提供了：

1. **全面的错误捕获** - 覆盖所有JavaScript错误场景
2. **日志+链路结合** - 确保错误信息的完整性和可追溯性
3. **智能去重** - 避免重复错误干扰
4. **结构化数据** - 便于分析和处理
5. **性能优化** - 不影响应用性能

这个系统确保了生产环境中的错误能够被及时发现、分析和解决，同时提供了丰富的上下文信息帮助快速定位问题根因。