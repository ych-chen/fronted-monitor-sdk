import { metrics } from '@opentelemetry/api';

export interface PerformanceMetrics {
  fcp?: number;    // First Contentful Paint
  lcp?: number;    // Largest Contentful Paint
  fid?: number;    // First Input Delay
  cls?: number;    // Cumulative Layout Shift
  ttfb?: number;   // Time to First Byte
  domContentLoaded?: number;
  loadComplete?: number;
}

export interface PerformanceObserverOptions {
  fcp?: boolean;
  lcp?: boolean;
  fid?: boolean;
  cls?: boolean;
  ttfb?: boolean;
}

/**
 * 性能指标收集器
 */
export class PerformanceCollector {
  private meter: any;
  private observers: PerformanceObserver[] = [];
  private metrics: Partial<PerformanceMetrics> = {};
  private callbacks: ((metrics: Partial<PerformanceMetrics>) => void)[] = [];

  constructor(meter: any) {
    this.meter = meter;
    this.setupMetrics();
  }

  /**
   * 设置指标收集器
   */
  private setupMetrics(): void {
    // 创建性能指标
    this.meter.createHistogram('performance_fcp', {
      description: 'First Contentful Paint time in milliseconds',
      unit: 'ms',
    });

    this.meter.createHistogram('performance_lcp', {
      description: 'Largest Contentful Paint time in milliseconds',
      unit: 'ms',
    });

    this.meter.createHistogram('performance_fid', {
      description: 'First Input Delay time in milliseconds',
      unit: 'ms',
    });

    this.meter.createHistogram('performance_cls', {
      description: 'Cumulative Layout Shift score',
      unit: 'score',
    });

    this.meter.createHistogram('performance_ttfb', {
      description: 'Time to First Byte in milliseconds',
      unit: 'ms',
    });

    this.meter.createHistogram('performance_dom_content_loaded', {
      description: 'DOM Content Loaded time in milliseconds',
      unit: 'ms',
    });

    this.meter.createHistogram('performance_load_complete', {
      description: 'Page Load Complete time in milliseconds',
      unit: 'ms',
    });
  }

  /**
   * 启动性能指标收集
   */
  startCollection(options: PerformanceObserverOptions = {}): void {
    const config = {
      fcp: true,
      lcp: true,
      fid: true,
      cls: true,
      ttfb: true,
      ...options,
    };

    // FCP - First Contentful Paint
    if (config.fcp && 'PerformanceObserver' in window) {
      this.observePaintMetrics('first-contentful-paint', 'fcp');
    }

    // LCP - Largest Contentful Paint
    if (config.lcp && 'PerformanceObserver' in window) {
      this.observeLCP();
    }

    // FID - First Input Delay
    if (config.fid && 'PerformanceObserver' in window) {
      this.observeFID();
    }

    // CLS - Cumulative Layout Shift
    if (config.cls && 'PerformanceObserver' in window) {
      this.observeCLS();
    }

    // TTFB - Time to First Byte
    if (config.ttfb) {
      this.collectTTFB();
    }

    // Navigation timing
    this.collectNavigationTiming();
  }

  /**
   * 停止性能指标收集
   */
  stopCollection(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  /**
   * 观察Paint指标（FCP）
   */
  private observePaintMetrics(name: string, key: keyof PerformanceMetrics): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const entry = entries[entries.length - 1]; // 获取最后一个FCP

        if (entry) {
          const value = Math.round(entry.startTime);
          this.metrics[key] = value;
          this.recordMetric(key as string, value);
          this.notifyCallbacks();
        }
      });

      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn(`Failed to observe ${name}:`, error);
    }
  }

  /**
   * 观察LCP指标
   */
  private observeLCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;

        if (lastEntry && lastEntry.startTime) {
          const value = Math.round(lastEntry.startTime);
          this.metrics.lcp = value;
          this.recordMetric('lcp', value);
          this.notifyCallbacks();
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to observe LCP:', error);
    }
  }

  /**
   * 观察FID指标
   */
  private observeFID(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const entry = entries[0] as any;

        if (entry && entry.processingStart && entry.startTime) {
          const value = Math.round(entry.processingStart - entry.startTime);
          this.metrics.fid = value;
          this.recordMetric('fid', value);
          this.notifyCallbacks();
        }
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to observe FID:', error);
    }
  }

  /**
   * 观察CLS指标
   */
  private observeCLS(): void {
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.metrics.cls = Math.round(clsValue * 1000) / 1000; // 保留3位小数
            this.recordMetric('cls', clsValue);
            this.notifyCallbacks();
          }
        });
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to observe CLS:', error);
    }
  }

  /**
   * 收集TTFB指标
   */
  private collectTTFB(): void {
    try {
      if ('performance' in window && 'getEntriesByType' in performance) {
        const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navigationEntries.length > 0) {
          const navEntry = navigationEntries[0];
          const ttfb = Math.round(navEntry.responseStart - navEntry.requestStart);
          if (ttfb > 0) {
            this.metrics.ttfb = ttfb;
            this.recordMetric('ttfb', ttfb);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to collect TTFB:', error);
    }
  }

  /**
   * 收集Navigation Timing指标
   */
  private collectNavigationTiming(): void {
    try {
      if ('performance' in window && 'getEntriesByType' in performance) {
        const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navigationEntries.length > 0) {
          const navEntry = navigationEntries[0];

          // DOM Content Loaded - 使用fetchStart作为基准
          const domContentLoaded = Math.round(navEntry.domContentLoadedEventEnd - navEntry.fetchStart);
          if (domContentLoaded > 0) {
            this.metrics.domContentLoaded = domContentLoaded;
            this.recordMetric('dom_content_loaded', domContentLoaded);
          }

          // Load Complete - 使用fetchStart作为基准
          const loadComplete = Math.round(navEntry.loadEventEnd - navEntry.fetchStart);
          if (loadComplete > 0) {
            this.metrics.loadComplete = loadComplete;
            this.recordMetric('load_complete', loadComplete);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to collect Navigation Timing:', error);
    }
  }

  /**
   * 记录指标到OpenTelemetry
   */
  private recordMetric(name: string, value: number): void {
    try {
      const histogram = this.meter.getHistogram(`performance_${name}`);
      if (histogram) {
        histogram.record(value);
      }
    } catch (error) {
      console.warn(`Failed to record metric ${name}:`, error);
    }
  }

  /**
   * 添加性能指标变化回调
   */
  onMetricsUpdate(callback: (metrics: Partial<PerformanceMetrics>) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * 通知所有回调
   */
  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => {
      try {
        callback({ ...this.metrics });
      } catch (error) {
        console.warn('Performance metrics callback error:', error);
      }
    });
  }

  /**
   * 获取当前收集的指标
   */
  getCurrentMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  /**
   * 手动记录性能指标
   */
  recordCustomMetrics(metrics: Partial<PerformanceMetrics>): void {
    Object.entries(metrics).forEach(([key, value]) => {
      if (value !== undefined && value > 0) {
        this.metrics[key as keyof PerformanceMetrics] = value;
        this.recordMetric(key, value);
      }
    });
    this.notifyCallbacks();
  }
}