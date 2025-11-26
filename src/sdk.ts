import { trace, metrics, SpanStatusCode } from '@opentelemetry/api';
import {
  WebTracerProvider,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-web';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';

import type {
  MonitorConfig,
  CustomSpanOptions,
  UserInteractionEvent,
  RouteChangeEvent,
  RouteMonitoringConfig,
  MetricsCollector,
  TracingProvider,
  SpanAttributes,
  TraceModuleConfig,
  MetricsModuleConfig,
} from './types';

// 导入各个模块
import { TraceManager } from './trace/tracer';
import { XHRInstrumentation, FetchInstrumentation } from './trace/instrumentation';
import { PerformanceCollector, CustomMetricsCollector } from './metrics';
import { RouteMonitor } from './route/route-monitor';
import { DEFAULT_CONFIG } from './config/default-config';

/**
 * 追踪提供者实现
 */
class TracingProviderImpl implements TracingProvider {
  private span: any = null;

  constructor(span: any) {
    this.span = span;
  }

  startSpan(name: string, options?: CustomSpanOptions): void {
    throw new Error('Method not implemented. Use TraceManager directly.');
  }

  endSpan(statusCode?: SpanStatusCode, statusMessage?: string): void {
    if (this.span) {
      if (statusCode) {
        this.span.setStatus({
          code: statusCode,
          message: statusMessage,
        });
      }
      this.span.end();
      this.span = null;
    }
  }

  recordError(error: Error, context?: Record<string, any>): void {
    if (this.span) {
      this.span.recordException(error);
      if (context) {
        this.span.setAttributes(context as SpanAttributes);
      }
    }
  }

  getSpan(): any {
    return this.span;
  }
}

/**
 * 指标收集器实现
 */
class MetricsCollectorImpl implements MetricsCollector {
  private customMetrics: CustomMetricsCollector;

  constructor(customMetrics: CustomMetricsCollector) {
    this.customMetrics = customMetrics;
  }

  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    this.customMetrics.incrementCounter(name, value, labels);
  }

  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.customMetrics.recordHistogram(name, value, labels);
  }

  recordGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.customMetrics.setGauge(name, value, labels);
  }
}

/**
 * 重构后的前端监控SDK主类
 */
export class FrontendMonitorSDKImpl {
  private config: MonitorConfig | null = null;
  private tracerProvider: WebTracerProvider | null = null;
  private meterProvider: MeterProvider | null = null;

  // 模块实例
  private traceManager: TraceManager | null = null;
  private performanceCollector: PerformanceCollector | null = null;
  private customMetricsCollector: CustomMetricsCollector | null = null;
  private xhrInstrumentation: XHRInstrumentation | null = null;
  private fetchInstrumentation: FetchInstrumentation | null = null;
  private routeMonitor: RouteMonitor | null = null;

  private isInitialized = false;
  private rootSpan: any = null;

  constructor() {
    // 构造函数
  }

  async init(config: MonitorConfig): Promise<void> {
    if (this.isInitialized) {
      console.warn('Frontend Monitor SDK is already initialized');
      return;
    }

    this.config = {
      ...DEFAULT_CONFIG,
      enablePerformanceMonitoring: true,
      enableErrorMonitoring: true,
      enableUserInteractionMonitoring: true,
      enableAutoTracing: true,
      enablePerformanceMetrics: true,
      enableCustomMetrics: true,
      excludedUrls: [],
      ...config,
    };

    // 初始化OpenTelemetry基础设施
    await this.initializeOpenTelemetry();

    // 初始化各个模块
    this.initializeTraceModule();
    this.initializeMetricsModule();
    this.initializeAutoInstrumentation();

    // 设置自动监控
    this.setupAutoMonitoring();

    this.isInitialized = true;
    console.log('Frontend Monitor SDK initialized successfully');
  }

  /**
   * 初始化OpenTelemetry基础设施
   */
  private async initializeOpenTelemetry(): Promise<void> {
    if (!this.config) return;

    // 创建资源
    const resource = new Resource({
      [SEMRESATTRS_SERVICE_NAME]: this.config.serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: this.config.serviceVersion || '1.0.0',
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: this.config.attributes?.environment || 'production',
      ...this.config.attributes,
    });

    // 初始化追踪
    await this.initializeTracing(resource);

    // 初始化指标
    await this.initializeMetrics(resource);
  }

  /**
   * 初始化追踪
   */
  private async initializeTracing(resource: Resource): Promise<void> {
    if (!this.config) return;

    this.tracerProvider = new WebTracerProvider({
      resource,
      sampler: new TraceIdRatioBasedSampler(this.config.sampleRate || 1.0),
    });

    // 创建追踪导出器
    const traceExporter = new OTLPTraceExporter({
      url: `${this.config.endpoint}/v1/traces`,
    });

    // 添加批量处理器
    this.tracerProvider.addSpanProcessor(
      new BatchSpanProcessor(traceExporter)
    );

    // 注册提供者
    this.tracerProvider.register();
  }

  /**
   * 初始化指标
   */
  private async initializeMetrics(resource: Resource): Promise<void> {
    if (!this.config) return;

    this.meterProvider = new MeterProvider({
      resource,
    });

    // 创建指标导出器
    const metricExporter = new OTLPMetricExporter({
      url: `${this.config.endpoint}/v1/metrics`,
    });

    // 添加批量导出器
    const PeriodicExportingMetricReader = (await import('@opentelemetry/sdk-metrics')).PeriodicExportingMetricReader;
    this.meterProvider.addMetricReader(
      new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 30000,
      })
    );

    // 注册提供者
    metrics.setGlobalMeterProvider(this.meterProvider);
  }

  /**
   * 初始化追踪模块
   */
  private initializeTraceModule(): void {
    if (!this.config || !this.config.enableAutoTracing) return;

    this.traceManager = new TraceManager(this.config.serviceName);

    // 创建页面加载的根span
    this.rootSpan = this.traceManager.createRootSpan('page_load', {
      page_url: window.location.href,
      user_agent: navigator.userAgent,
    });
  }

  /**
   * 初始化指标模块
   */
  private initializeMetricsModule(): void {
    if (!this.config) return;

    const meter = metrics.getMeter(this.config.serviceName);

    // 性能指标收集器
    if (this.config.enablePerformanceMetrics) {
      this.performanceCollector = new PerformanceCollector(meter);
    }

    // 自定义指标收集器
    if (this.config.enableCustomMetrics) {
      this.customMetricsCollector = new CustomMetricsCollector(meter);
    }
  }

  /**
   * 初始化自动instrumentation
   */
  private initializeAutoInstrumentation(): void {
    if (!this.config || !this.config.enableAutoTracing || !this.traceManager) return;

    const traceConfig: TraceModuleConfig = {
      enabled: true,
      excludedUrls: this.config.excludedUrls,
      propagateTraceHeaderCorsUrls: [this.config.endpoint],
    };

    // XMLHttpRequest instrumentation
    this.xhrInstrumentation = new XHRInstrumentation(this.traceManager, traceConfig);
    this.xhrInstrumentation.enable();

    // Fetch instrumentation
    this.fetchInstrumentation = new FetchInstrumentation(this.traceManager, traceConfig);
    this.fetchInstrumentation.enable();
  }

  /**
   * 设置自动监控
   */
  private setupAutoMonitoring(): void {
    if (!this.config) return;

    // 设置性能监控
    if (this.config.enablePerformanceMonitoring && this.performanceCollector) {
      this.performanceCollector.startCollection({
        fcp: true,
        lcp: true,
        fid: true,
        cls: true,
        ttfb: true,
      });
    }

    // 设置错误监控
    if (this.config.enableErrorMonitoring) {
      this.setupErrorMonitoring();
    }

    // 设置用户交互监控
    if (this.config.enableUserInteractionMonitoring) {
      this.setupUserInteractionMonitoring();
    }

    // 设置路由监控
    if (this.config.enableRouteMonitoring) {
      this.setupRouteMonitoring();
    }
  }

  /**
   * 设置错误监控
   */
  private setupErrorMonitoring(): void {
    // 全局错误处理
    window.addEventListener('error', (event) => {
      this.recordError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript_error',
      });
    });

    // Promise错误处理
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          type: 'promise_rejection',
          promise: event.promise,
        }
      );
    });
  }

  /**
   * 设置用户交互监控
   */
  private setupUserInteractionMonitoring(): void {
    // 点击事件监控
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      this.recordUserInteraction({
        type: 'click',
        element: target.tagName.toLowerCase(),
        target: target.id || target.className || undefined,
        timestamp: Date.now(),
      });
    });

    // 输入事件监控
    document.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      this.recordUserInteraction({
        type: 'input',
        element: target.tagName.toLowerCase(),
        target: target.id || target.className || undefined,
        timestamp: Date.now(),
        value: target.value ? 'has_value' : 'empty',
      });
    });

    // 页面导航监控
    window.addEventListener('beforeunload', () => {
      this.recordUserInteraction({
        type: 'navigation',
        timestamp: Date.now(),
      });
    });
  }

  /**
   * 设置路由监控
   */
  private setupRouteMonitoring(): void {
    if (!this.config) return;

    const routeConfig = this.config.routeMonitoringConfig || {};

    this.routeMonitor = new RouteMonitor({
      enabled: true,
      hashRouting: true,
      historyAPI: true,
      popstate: true,
      parseParams: true,
      parseQuery: true,
      ignoredPaths: [],
      ...routeConfig,
    });

    // 设置路由变化回调
    this.routeMonitor.onRouteChange((event: RouteChangeEvent) => {
      // 记录路由变化事件为用户交互
      this.recordUserInteraction({
        type: 'navigation',
        element: 'route',
        target: event.to,
        timestamp: event.timestamp,
        duration: event.duration,
        value: {
          route_type: event.type,
          from: event.from,
          to: event.to,
          is_spa: event.isSPA,
          params: event.params,
          query: event.query,
        },
      });

      // 记录路由变化指标
      if (this.customMetricsCollector) {
        this.customMetricsCollector.recordEvent('route_change', 1, {
          route_type: event.type,
          from_path: this.extractPath(event.from),
          to_path: this.extractPath(event.to),
          is_spa: event.isSPA?.toString() || 'false',
        });

        // 记录路由切换时间
        if (event.duration) {
          this.customMetricsCollector.recordDuration('route_change_duration', event.duration, {
            route_type: event.type,
            is_spa: event.isSPA?.toString() || 'false',
          });
        }
      }

      // 创建路由切换的追踪span
      if (this.traceManager) {
        const span = this.traceManager.startSpan(`route_change_${event.type}`, {
          attributes: {
            'route.from': event.from,
            'route.to': event.to,
            'route.type': event.type,
            'route.is_spa': event.isSPA || false,
            'route.duration': event.duration || 0,
          },
        });
        span.end();
      }
    });

    this.routeMonitor.enable();
    console.log('Route monitoring enabled with config:', routeConfig);
  }

  startTracing(name: string, options?: CustomSpanOptions): TracingProvider {
    if (!this.isInitialized || !this.traceManager) {
      throw new Error('SDK is not initialized. Call init() first.');
    }

    const span = this.traceManager.startSpan(name, options);
    return new TracingProviderImpl(span);
  }

  recordError(error: Error | string, context?: Record<string, any>): void {
    if (!this.isInitialized) return;

    const errorObj = typeof error === 'string' ? new Error(error) : error;

    if (this.traceManager) {
      this.traceManager.recordError(errorObj, context);
    }

    // 记录错误指标
    if (this.customMetricsCollector) {
      this.customMetricsCollector.recordEvent('error', 1, {
        error_type: errorObj.name,
        error_message: errorObj.message,
      });
    }
  }

  recordMetrics(metrics: Partial<any>): void {
    if (!this.isInitialized || !this.performanceCollector) return;

    this.performanceCollector.recordCustomMetrics(metrics);
  }

  recordUserInteraction(event: UserInteractionEvent): void {
    if (!this.isInitialized) return;

    if (this.traceManager) {
      const span = this.traceManager.startSpan(`user_interaction_${event.type}`, {
        attributes: {
          'interaction.type': event.type,
          'interaction.element': event.element,
          'interaction.target': event.target,
          'interaction.timestamp': event.timestamp,
          'interaction.duration': event.duration,
          'interaction.value': event.value,
        },
      });

      span.end();
    }

    // 记录交互指标
    if (this.customMetricsCollector) {
      this.customMetricsCollector.recordUserAction(
        event.type,
        event.element || 'unknown',
        event.duration
      );
    }
  }

  getMetricsCollector(): MetricsCollector {
    if (!this.isInitialized || !this.customMetricsCollector) {
      throw new Error('SDK is not initialized. Call init() first.');
    }
    return new MetricsCollectorImpl(this.customMetricsCollector);
  }

  getTraceManager(): TraceManager | null {
    if (!this.isInitialized) {
      throw new Error('SDK is not initialized. Call init() first.');
    }
    return this.traceManager;
  }

  /**
   * 记录路由变化
   */
  recordRouteChange(event: RouteChangeEvent): void {
    if (!this.isInitialized || !this.routeMonitor) {
      console.warn('Route monitoring is not initialized');
      return;
    }

    this.routeMonitor.recordRouteChange(event);
  }

  /**
   * 获取当前路由信息
   */
  getCurrentRoute(): { path: string; query: Record<string, string>; params: Record<string, string> } {
    if (!this.isInitialized || !this.routeMonitor) {
      return {
        path: window.location.pathname + window.location.search + window.location.hash,
        query: {},
        params: {},
      };
    }

    return this.routeMonitor.getCurrentRoute();
  }

  /**
   * 提取路径中的路径部分（移除查询参数和hash）
   */
  private extractPath(fullPath: string): string {
    try {
      const url = new URL(fullPath, window.location.origin);
      return url.pathname;
    } catch {
      return fullPath.split('?')[0].split('#')[0];
    }
  }

  async destroy(): Promise<void> {
    if (this.tracerProvider) {
      await this.tracerProvider.shutdown();
      this.tracerProvider = null;
    }

    if (this.meterProvider) {
      await this.meterProvider.shutdown();
      this.meterProvider = null;
    }

    // 清理自动instrumentation
    if (this.xhrInstrumentation) {
      this.xhrInstrumentation.disable();
      this.xhrInstrumentation = null;
    }

    if (this.fetchInstrumentation) {
      this.fetchInstrumentation.disable();
      this.fetchInstrumentation = null;
    }

    // 清理性能监控
    if (this.performanceCollector) {
      this.performanceCollector.stopCollection();
      this.performanceCollector = null;
    }

    // 结束根span
    if (this.rootSpan) {
      this.rootSpan.end();
      this.rootSpan = null;
    }

    // 清理路由监控
    if (this.routeMonitor) {
      this.routeMonitor.destroy();
      this.routeMonitor = null;
    }

    this.traceManager = null;
    this.customMetricsCollector = null;
    this.isInitialized = false;
  }
}