import { FrontendMonitorSDKImpl } from './sdk';
export type {
  MonitorConfig,
  SpanAttributes,
  CustomSpanOptions,
  ErrorContext,
  UserInteractionEvent,
  MetricsCollector,
  TracingProvider,
  FrontendMonitorSDK as IFrontendMonitorSDK,
  TraceOptions,
  TraceModuleConfig,
  MetricsModuleConfig,
  InteractionModuleConfig,
  ErrorModuleConfig,
} from './types';

// 导出核心类和工厂函数
export { FrontendMonitorSDKImpl } from './sdk';

/**
 * 创建前端监控SDK实例
 */
export function createFrontendMonitor(): IFrontendMonitorSDK {
  return new FrontendMonitorSDKImpl();
}

/**
 * 默认导出SDK类
 */
export { FrontendMonitorSDKImpl as FrontendMonitorSDK };

/**
 * SDK版本
 */
export const VERSION = '1.0.0';

// 导出各个模块（供高级用户使用）
export { TraceManager } from './trace/tracer';
export { XHRInstrumentation, FetchInstrumentation } from './trace/instrumentation';
export { PerformanceCollector, CustomMetricsCollector } from './metrics';
export type { PerformanceMetrics, PerformanceObserverOptions } from './metrics';