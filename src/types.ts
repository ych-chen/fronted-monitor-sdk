import { SpanStatusCode, SpanKind } from '@opentelemetry/api';

export interface MonitorConfig {
  /** 服务名称 */
  serviceName: string;
  /** 服务版本 */
  serviceVersion?: string;
  /** OTLP 端点地址 */
  endpoint: string;
  /** 采样率，0-1之间，默认1.0 */
  sampleRate?: number;
  /** API Key 用于认证 */
  apiKey?: string;
  /** 自定义属性 */
  attributes?: Record<string, string>;
  /** 是否启用性能监控 */
  enablePerformanceMonitoring?: boolean;
  /** 是否启用错误监控 */
  enableErrorMonitoring?: boolean;
  /** 是否启用用户交互监控 */
  enableUserInteractionMonitoring?: boolean;
  /** 是否启用自动追踪 */
  enableAutoTracing?: boolean;
  /** 是否启用性能指标 */
  enablePerformanceMetrics?: boolean;
  /** 是否启用自定义指标 */
  enableCustomMetrics?: boolean;
  /** 排除的URL模式 */
  excludedUrls?: string[];
}

export interface SpanAttributes {
  [key: string]: string | number | boolean;
}

export interface CustomSpanOptions {
  name: string;
  kind?: SpanKind;
  attributes?: SpanAttributes;
  startTime?: number;
}

export interface ErrorContext {
  error: Error;
  context?: Record<string, any>;
  level?: 'error' | 'warning' | 'info';
}

export interface UserInteractionEvent {
  type: 'click' | 'scroll' | 'input' | 'navigation';
  element?: string;
  target?: string;
  timestamp: number;
  duration?: number;
  value?: any;
}

// 链路追踪相关接口
export interface TraceOptions {
  name: string;
  kind?: SpanKind;
  attributes?: SpanAttributes;
  startTime?: number;
}

export interface TracingProvider {
  startSpan(name: string, options?: CustomSpanOptions): void;
  endSpan(statusCode?: SpanStatusCode, statusMessage?: string): void;
  recordError(error: Error, context?: Record<string, any>): void;
}

// 指标相关接口
export interface MetricsCollector {
  incrementCounter(name: string, value?: number, labels?: Record<string, string>): void;
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
  recordGauge(name: string, value: number, labels?: Record<string, string>): void;
}

export interface FrontendMonitorSDK {
  /** 初始化SDK */
  init(config: MonitorConfig): Promise<void>;
  /** 开始追踪 */
  startTracing(name: string, options?: CustomSpanOptions): TracingProvider;
  /** 记录错误 */
  recordError(error: Error | string, context?: Record<string, any>): void;
  /** 记录性能指标 */
  recordMetrics(metrics: Partial<any>): void;
  /** 记录用户交互 */
  recordUserInteraction(event: UserInteractionEvent): void;
  /** 获取指标收集器 */
  getMetricsCollector(): MetricsCollector;
  /** 获取追踪管理器 */
  getTraceManager(): any;
  /** 销毁SDK */
  destroy(): Promise<void>;
}

// 模块配置接口
export interface TraceModuleConfig {
  enabled: boolean;
  excludedUrls?: string[];
  propagateTraceHeaderCorsUrls?: string[];
}

export interface MetricsModuleConfig {
  enabled: boolean;
  fcp?: boolean;
  lcp?: boolean;
  fid?: boolean;
  cls?: boolean;
  ttfb?: boolean;
}

export interface InteractionModuleConfig {
  enabled: boolean;
  clicks?: boolean;
  forms?: boolean;
  navigation?: boolean;
  scroll?: boolean;
  input?: boolean;
}

export interface ErrorModuleConfig {
  enabled: boolean;
  captureGlobalErrors?: boolean;
  captureUnhandledRejections?: boolean;
  captureResourceErrors?: boolean;
}