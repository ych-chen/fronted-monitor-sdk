import { trace, metrics, SpanStatusCode, context, SpanContext } from '@opentelemetry/api';
import {
  Span,
  WebTracerProvider,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-web';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';  // 之前未装包
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes, detectResources, Resource } from '@opentelemetry/resources';

import {
  BatchLogRecordProcessor,
  LoggerProvider,
  LogRecordProcessor
} from '@opentelemetry/sdk-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { logs, Logger } from '@opentelemetry/api-logs'

import type {
  MonitorConfig,
  CustomSpanOptions,
  UserInteractionEvent,
  MetricsCollector,
  TracingProvider,
  SpanAttributes,
  TraceModuleConfig,
  MetricsModuleConfig,
  UserInfo
} from './types';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator
} from '@opentelemetry/core'
import { ZoneContextManager } from '@opentelemetry/context-zone';

// 导入各个模块
import { TraceManager } from './trace/tracer';
import { XHRInstrumentation, FetchInstrumentation } from './trace/instrumentation';
import { PerformanceCollector, CustomMetricsCollector } from './metrics';
import { DEFAULT_CONFIG } from './config/default-config';
import { UserContextManager } from './user/user-context-manager';
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request'
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction'
import { LogManager } from './log';
import { formatToDateTime } from './utils/utils';
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
  private loggerProvider: LoggerProvider | null = null;

  private logger: Logger | null = null

  // 模块实例
  private traceManager: TraceManager | null = null;
  private performanceCollector: PerformanceCollector | null = null;
  private customMetricsCollector: CustomMetricsCollector | null = null;

  private logManager: LogManager | null = null;

  private xhrInstrumentation: XHRInstrumentation | null = null;
  private fetchInstrumentation: FetchInstrumentation | null = null;
  private userContextManager: UserContextManager | null = null;

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
      // 是否启用性能指标 
      enablePerformanceMetrics: true,
      // 是否启用性能监控
      enablePerformanceMonitoring: true,
      // 是否启用自定义指标
      enableCustomMetrics: true,
      // 是否启用日志监控
      enableLogMonitoring: true,
      // 是否启用错误监控
      enableErrorMonitoring: true,
      // 是否启用自动追踪
      enableAutoTracing: true,
      // 是否启用用户交互监控，包括点击、滚动、表单提交等用户行为
      enableUserInteractionMonitoring: true,
      // 排除的URL模式
      excludedUrls: [],
      ...config,
    };

    // 初始化OpenTelemetry基础设施
    await this.initializeOpenTelemetry();

    // 初始化追踪模块
    this.initializeTraceModule();

    // 初始化指标模块
    this.initializeMetricsModule();

    // 初始化日志模块
    this.initializeLogModule();

    // 初始化用户上下文管理器(需要在初始化自动instrumentation之前)
    this.userContextManager = new UserContextManager();

    // 初始化自动instrumentation
    this.initializeAutoInstrumentation();

    // 设置自动监控
    this.setupAutoMonitoring();

    // 劫持console.error
    // this.patchConsole()

    this.isInitialized = true;
    console.log('Frontend Monitor SDK initialized successfully');
  }

  /**
   * 初始化OpenTelemetry基础设施
   */
  private async initializeOpenTelemetry(): Promise<void> {
    if (!this.config) return;

    // 创建资源
    const resource = resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.attributes?.environment || 'production',
      ...this.config.attributes,
    });

    // 初始化追踪
    await this.initializeTracing(resource);

    // 初始化指标
    await this.initializeMetrics(resource);

    // 初始化日志
    await this.initializeLogs(resource)
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
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 添加批量处理器
    this.tracerProvider.addSpanProcessor(
      new BatchSpanProcessor(traceExporter)
    );

    // 注册提供者
    this.tracerProvider.register({
      // 4.1 contextManager管理上下文，ZoneContextManager自动管理JavaScript异步上下文
      // contextManager: new ZoneContextManager(),
      // 4.2 propagator传播器，用于跨服务传递追踪上下文信息
      propagator: new CompositePropagator({
        // W3CBaggagePropagator：传递自定义键值对，也是默认格式； W3CTraceContext传递trace上下文
        propagators: [new W3CBaggagePropagator(), new W3CTraceContextPropagator()]
      })
    })
  }

  /**
   * 初始化指标
   */
  private async initializeMetrics(resource: Resource): Promise<void> {
    if (!this.config) return;

    // 创建指标导出器
    const metricExporter = new OTLPMetricExporter({
      url: `${this.config.endpoint}/v1/metrics`,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 添加批量导出器
    this.meterProvider = new MeterProvider({
      resource,
      readers: [
        new PeriodicExportingMetricReader({
          exporter: metricExporter,
          exportIntervalMillis: this.config.exportIntervalMills || 30000
        })
      ]
    })

    // 注册提供者
    metrics.setGlobalMeterProvider(this.meterProvider);
  }

  /**
   * 初始化日志
   */
  private async initializeLogs(resource: Resource): Promise<void> {
    if (!this.config) return;

    // 创建 OLTP HTTP 导出器,用于将日志数据发送到后端
    const logExporter = new OTLPLogExporter({
      url: `${this.config.endpoint}/v1/logs`,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // 创建日志提供者，配置批处理日志记录处理器
    this.loggerProvider = new LoggerProvider({
      resource,
      processors: [new BatchLogRecordProcessor(logExporter)]
    })

    // // 注册提供者
    logs.setGlobalLoggerProvider(this.loggerProvider)
  }



  /**
   * 初始化追踪模块
   */
  private initializeTraceModule(): void {
    if (!this.config || !this.config.enableAutoTracing) return;

    this.traceManager = new TraceManager(this.config.serviceName, this.config.serviceVersion);
    console.log('✅ 链路模块初始化... traceManager:', this.traceManager);
    // 创建页面加载的根span
    // this.rootSpan = this.traceManager.createRootSpan('page_load', {
    //   page_url: window.location.href,
    //   user_agent: navigator.userAgent,
    // });
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
      console.log('✅ 性能指标收集器初始化... performanceCollector: ', this.performanceCollector);
    }

    // 自定义指标收集器
    if (this.config.enableCustomMetrics) {
      this.customMetricsCollector = new CustomMetricsCollector(meter);
      console.log('✅ 自定义指标收集器初始化... customMetricsCollector: ', this.customMetricsCollector);
    }
  }

  // 初始化日志模块
  private initializeLogModule(): void {
    if (!this.config) return

    if (this.config.enableLogMonitoring) {
      this.logManager = new LogManager(this.config.serviceName, this.config.serviceVersion);
      console.log('✅ 日志收集器初始化... LogManager: ', this.logManager);
    }
  }

  /**
   * 初始化自动instrumentation
   */
  private initializeAutoInstrumentation(): void {
    if (!this.config || !this.config.enableAutoTracing || !this.traceManager) return;

    registerInstrumentations({
      instrumentations: [
        new XMLHttpRequestInstrumentation({
          // 哪些URL需要注入traceparent等trace头，用于链路追踪
          propagateTraceHeaderCorsUrls: this.config.propagateTraceHeaderCorsUrls,
          // propagateTraceHeaderCorsUrls: [new RegExp('^https?://[^/]+/icp/api/.*')],
          // 忽略某些请求
          ignoreUrls: [/\/v1\/traces/, /\/v1\/metrics/, /\/v1\/logs/],
          // 在span完成后清理浏览器performanceTiming相关资源，避免性能数据堆积
          clearTimingResources: true,
          applyCustomAttributesOnSpan: (span, xhr) => {
            const userAttributes = this.userContextManager?.getUserAttributes() || {};
            span.setAttributes({
              ...userAttributes
            })
            // span.setAttribute('http.method', 'POST');
            // span.setAttribute('http.url', 'https://your-collector.example.com');
            // span.setAttribute('http.status_code', 200);
          }
        }),
      ]
    })
    // XMLHttpRequest instrumentation
    // this.xhrInstrumentation = new XHRInstrumentation(this.traceManager, traceConfig, this.userContextManager);
    // this.xhrInstrumentation.enable();

    // // Fetch instrumentation
    // this.fetchInstrumentation = new FetchInstrumentation(this.traceManager, traceConfig, this.userContextManager);
    // this.fetchInstrumentation.enable();
  }

  /**
   * 设置自动监控
   */
  private setupAutoMonitoring(): void {
    if (!this.config) return;
    console.log('⚙️ 设置自动监控...')
    // 设置性能监控
    if (this.config.enablePerformanceMonitoring && this.performanceCollector) {
      console.log('⚙️ 自动监控中 正在收集性能监控...')
      this.performanceCollector.startCollection({
        fcp: true,
        lcp: true,
        fid: true,
        cls: true,
        ttfb: true,
      });
    }

    // 设置用户交互监控，设置了之后就可以对于用户交互行为进行trace跟踪了
    if (this.config.enableUserInteractionMonitoring) {
      console.log('⚙️ 自动监控中 正在收集用户交互监控...')
      // this.setupUserInteractionMonitoring();
      this.patchEventListener();
    }

    // 设置错误监控
    if (this.config.enableErrorMonitoring) {
      console.log('⚙️ 自动监控中 正在收集错误监控...')
      this.setupErrorMonitoring();
    }

  }

  /**
   * 自动捕获能力
   */
  private patchEventListener(): void {
    const sdk = this;
    const nativeAdd = EventTarget.prototype.addEventListener;

    EventTarget.prototype.addEventListener = function (type, handler, options) {
      if (typeof handler !== 'function') {
        return nativeAdd.call(this, type, handler, options)
      }

      const INTERACTION_EVENTS = ['click', 'input']
      if (!INTERACTION_EVENTS.includes(type)) {
        return nativeAdd.call(this, type, handler, options)
      }

      if (handler.__otel_wrapped) {
        return nativeAdd.call(this, type, handler, options)
      }
      const wrappedHandler = (event: Event) => {
        const target = event.target as any; // HTMLElement | HTMLInputElement
        if (!event.__otel_interaction_created) {
          event.__otel_interaction_created = true
          const userAttributes = sdk.userContextManager?.getUserAttributes() || {};
          const span = sdk.traceManager?.startSpan(`user_interaction_${event.type}`, {
            attributes: {
              ...userAttributes,
              'interaction.type': event.type,
              'interaction.element': target.tagName.toLowerCase(),
              'interaction.target': target.id || target.className || undefined,
              'interaction.timestamp': formatToDateTime(Date.now()),
              'interaction.value': event?.type == 'input' ? target?.value : (target.textContent + "")?.substr(0, 25),
            },
          })
          console.log('span start: ', span);
          return context.with(trace.setSpan(context.active(), span), () => {
            try {
              return handler.call(this, event)
              // TODO:对于 projection 类型的错误 无法被 try...catch 捕获  ，所以下方的catch 内容不会执行
            } catch (error) {
              try {
                Object.defineProperty(error, "__otel_recorded", { value: true, configurable: true })
              } catch (e) { /** ignore */ }
              sdk.recordError(error as any)
              throw error
            } finally {
              console.log('span end: ', span);
              span.end()
            }
          })
        } else {
          return handler.call(this, event)
        }
      }
      wrappedHandler.__otel_wrapped = true
      return nativeAdd.call(this, type, wrappedHandler, options)
    }
  }

  /**
   * 设置错误监控
   */
  private setupErrorMonitoring(): void {
    console.log('setupErrorMonitoring: 设置错误监控',);
    // 全局错误处理
    window.addEventListener('error', (event) => {
      console.log('全局error错误处理: ', event);

      const err = event.error
      if (err && err.__otel_recorded) {
        console.log('标记错误已经被处理', err.__otel_recorded)
        return
      }

      this.recordError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript_error',
      });
    });

    // Promise错误处理
    window.addEventListener('unhandledrejection', (event) => {
      console.log('全局unhandledrejection错误捕获: ', event);

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
  // private setupUserInteractionMonitoring(): void {
  //   console.log('✅ 用户交互监控已启用')

  //   // 点击事件监控
  //   document.addEventListener('click', (event) => {
  //     const target = event.target as HTMLElement;
  //     console.log('click target: ', target);
  //     this.recordUserInteraction({
  //       type: 'click',
  //       element: target.tagName.toLowerCase(),
  //       target: target.id || target.className || undefined,
  //       timestamp: Date.now(),
  //     });
  //   });

  //   // 输入事件监控
  //   document.addEventListener('input', (event) => {
  //     const target = event.target as HTMLInputElement;
  //     this.recordUserInteraction({
  //       type: 'input',
  //       element: target.tagName.toLowerCase(),
  //       target: target.id || target.className || undefined,
  //       timestamp: Date.now(),
  //       value: target.value,
  //     });
  //   });

  //   // 页面导航监控
  //   window.addEventListener('beforeunload', () => {
  //     this.recordUserInteraction({
  //       type: 'navigation',
  //       timestamp: Date.now(),
  //     });
  //   });
  // }

  startTracing(name: string, options?: CustomSpanOptions): TracingProvider {
    if (!this.isInitialized || !this.traceManager) {
      throw new Error('SDK is not initialized. Call init() first.');
    }

    // 获取用户属性并合并其他属性
    const userAttributes = this.userContextManager ? this.userContextManager.getUserAttributes() : {};
    const enrichedOptions = {
      ...options,
      attributes: {
        ...userAttributes,
        ...options?.attributes
      },
    };
    const span = this.traceManager.startSpan(name, enrichedOptions);
    return new TracingProviderImpl(span);
  }

  /**
   * 记录错误到链路上，到日志上，可以作为监控实例共用方法
   * @param error 
   * @param context 
   * @returns 
   */
  recordError(error: Error | string, context?: Record<string, any>): void {
    if (!this.isInitialized) return;

    const errorObj = typeof error === 'string' ? new Error(error) : error;
    // 获取用户属性
    const userAttributes = this.userContextManager ? this.userContextManager.getUserAttributes() : {};
    // 合并用户属性和上下文信息
    const enrichedContext = {
      ...userAttributes,
      ...context,
    };

    let spanContext: SpanContext | undefined;
    if (this.traceManager) {
      spanContext = this.traceManager.recordError(errorObj, enrichedContext);
    }

    // 记录日志错误
    if (this.logManager && spanContext) {
      this.logManager?.error(errorObj.message, enrichedContext, errorObj, spanContext)
    }

    // 记录错误指标
    if (this.customMetricsCollector) {
      this.customMetricsCollector.recordEvent('error', 1, {
        ...userAttributes,
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
   * 设置用户信息
   */
  setUser(userInfo: UserInfo): void {
    if (!this.isInitialized || !this.userContextManager) {
      throw new Error('SDK is not initialized. Call init() first.');
    }
    this.userContextManager.setUser(userInfo);
  }

  /** 更新用户信息 */
  updateUser(userInfo: Partial<UserInfo>): void {
    if (!this.isInitialized || !this.userContextManager) {
      throw new Error('SDK is not initialized. Call init() first.');
    }
    this.userContextManager.updateUser(userInfo);
  }

  /**
   * 清除用户信息
   */
  clearUser(): void {
    if (!this.isInitialized || !this.userContextManager) {
      throw new Error('SDK is not initialized. Call init() first.');
    }
    this.userContextManager.clearUser();
  }

  /** 获取用户信息 */
  getCurrentUser(): UserInfo | null {
    if (!this.isInitialized || !this.userContextManager) {
      throw new Error('SDK is not initialized. Call init() first.');
    }
    return this.userContextManager.getCurrentUser();
  }

  /**
   * 记录 error 级别日志
   * @param message 
   * @param attributes 
   * @param error 
   */
  logError(name: string, error: Error) {
    if (!this.isInitialized || !this.logManager) return;
    const span = this.traceManager?.startSpan(name + ': error')
    this.traceManager?.runInContext(span, () => {
      this.recordError(error as any)
    })
    span.end()
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

    if (this.loggerProvider) {
      await this.loggerProvider.shutdown();
      this.loggerProvider = null;
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

    if (this.userContextManager) {
      this.userContextManager.clearUser();
      this.userContextManager = null;
    }

    this.traceManager = null;
    this.customMetricsCollector = null;
    this.isInitialized = false;
  }
}