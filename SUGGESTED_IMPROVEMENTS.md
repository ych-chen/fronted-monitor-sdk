# SDK 接口改进建议

## 问题分析

当前的 `FrontendMonitorSDKImpl` 类中，`performanceCollector` 是私有成员，无法从外部访问 `onMetricsUpdate` 方法。这限制了用户使用性能回调功能。

## 建议的改进方案

### 方案 1: 添加性能指标回调接口 (推荐)

```typescript
// 在 types.ts 中添加
export interface PerformanceCallback {
  (metrics: Partial<PerformanceMetrics>): void;
}

export interface MonitorConfig {
  // ... 现有配置
  onPerformanceUpdate?: PerformanceCallback[]; // 添加性能回调配置
}

// 在 FrontendMonitorSDKImpl 中添加
export class FrontendMonitorSDKImpl {
  private performanceCallbacks: PerformanceCallback[] = [];

  // 添加公共接口
  onPerformanceUpdate(callback: PerformanceCallback): void {
    if (!this.isInitialized) {
      console.warn('SDK is not initialized. Callback will be added after init.');
      // 可以选择存储回调，等待初始化后添加
      return;
    }

    if (this.performanceCollector) {
      this.performanceCollector.onMetricsUpdate(callback);
    }

    this.performanceCallbacks.push(callback);
  }

  removePerformanceUpdate(callback: PerformanceCallback): void {
    const index = this.performanceCallbacks.indexOf(callback);
    if (index > -1) {
      this.performanceCallbacks.splice(index, 1);
    }
  }

  // 在 init() 方法中注册已有回调
  async init(config: MonitorConfig): Promise<void> {
    // ... 现有初始化逻辑

    // 注册性能回调
    if (config.onPerformanceUpdate) {
      config.onPerformanceUpdate.forEach(callback => {
        this.onPerformanceUpdate(callback);
      });
    }
  }
}
```

### 方案 2: 暴露 PerformanceCollector 实例

```typescript
export class FrontendMonitorSDKImpl {
  // 将 private 改为 protected
  protected performanceCollector: PerformanceCollector | null = null;

  // 添加获取方法
  getPerformanceCollector(): PerformanceCollector | null {
    if (!this.isInitialized || !this.performanceCollector) {
      throw new Error('SDK is not initialized or performance monitoring is disabled');
    }
    return this.performanceCollector;
  }
}
```

### 方案 3: 增强现有的 MetricsCollector 接口

```typescript
// 扩展 MetricsCollector 接口
export interface MetricsCollector {
  // ... 现有方法

  // 添加性能指标回调支持
  onPerformanceUpdate(callback: (metrics: Partial<PerformanceMetrics>) => void): void;

  // 获取当前性能指标
  getCurrentPerformanceMetrics(): Partial<PerformanceMetrics>;
}

// 在 MetricsCollectorImpl 中实现
class MetricsCollectorImpl implements MetricsCollector {
  private performanceCollector: PerformanceCollector | null = null;

  constructor(customMetrics: CustomMetricsCollector, performanceCollector?: PerformanceCollector) {
    this.customMetrics = customMetrics;
    this.performanceCollector = performanceCollector || null;
  }

  onPerformanceUpdate(callback: (metrics: Partial<PerformanceMetrics>) => void): void {
    if (this.performanceCollector) {
      this.performanceCollector.onMetricsUpdate(callback);
    } else {
      throw new Error('Performance monitoring is not enabled');
    }
  }

  getCurrentPerformanceMetrics(): Partial<PerformanceMetrics> {
    if (this.performanceCollector) {
      return this.performanceCollector.getCurrentMetrics();
    }
    return {};
  }

  // ... 其他现有方法
}
```

## 推荐实现

基于用户体验和 API 设计原则，我推荐 **方案 1**，因为它：

1. **保持向后兼容** - 不破坏现有 API
2. **提供直观接口** - 专门的方法名称
3. **支持多回调** - 可以注册多个性能回调
4. **配置灵活性** - 支持初始化时配置回调

## 使用示例 (改进后)

```typescript
import { createFrontendMonitor } from '@your-org/frontend-monitor-sdk';

const monitor = createFrontendMonitor();

// 方式一：初始化时配置回调
await monitor.init({
  serviceName: 'my-app',
  endpoint: 'https://collector.example.com',
  enablePerformanceMonitoring: true,
  onPerformanceUpdate: [
    (metrics) => console.log('性能指标更新:', metrics),
    (metrics) => sendToAnalytics(metrics),
    (metrics) => checkPerformanceThresholds(metrics)
  ]
});

// 方式二：动态添加回调
monitor.onPerformanceUpdate((metrics) => {
  console.log('实时性能监控:', metrics);
  updatePerformanceDisplay(metrics);
});

// 移除回调
const myCallback = (metrics) => { /* ... */ };
monitor.onPerformanceUpdate(myCallback);
// 稍后...
monitor.removePerformanceUpdate(myCallback);
```

## 优势

1. **易用性** - 简单直观的 API
2. **灵活性** - 支持多个回调函数
3. **可维护性** - 清晰的接口分离
4. **扩展性** - 为未来功能扩展留出空间
5. **测试友好** - 易于编写单元测试和集成测试