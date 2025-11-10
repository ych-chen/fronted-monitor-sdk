import { FrontendMonitorSDKImpl } from './sdk';
import type {
  FrontendMonitorSDK,
  MonitorConfig,
  SpanAttributes,
  CustomSpanOptions,
  ErrorContext,
  UserInteractionEvent,
  MetricsCollector,
  TracingProvider,
  TraceOptions,
  TraceModuleConfig,
  MetricsModuleConfig,
  InteractionModuleConfig,
  ErrorModuleConfig,
} from './types';

// 导出类型定义
export type {
  MonitorConfig,
  SpanAttributes,
  CustomSpanOptions,
  ErrorContext,
  UserInteractionEvent,
  MetricsCollector,
  TracingProvider,
  FrontendMonitorSDK,
  TraceOptions,
  TraceModuleConfig,
  MetricsModuleConfig,
  InteractionModuleConfig,
  ErrorModuleConfig,
};

/**
 * 创建前端监控SDK实例
 *
 * 这是SDK的入口函数，用于创建一个新的监控实例。
 * 每个实例都有独立的配置和数据收集器。
 *
 * @returns {FrontendMonitorSDK} 返回一个新的前端监控SDK实例
 *
 * @example
 * ```typescript
 * import { createFrontendMonitor } from '@your-org/frontend-monitor-sdk';
 *
 * const monitor = createFrontendMonitor();
 * await monitor.init({
 *   serviceName: 'my-app',
 *   endpoint: 'https://your-collector.example.com',
 *   enablePerformanceMonitoring: true,
 *   enableErrorMonitoring: true
 * });
 * ```
 */
export function createFrontendMonitor(): FrontendMonitorSDK {
  return new FrontendMonitorSDKImpl();
}

/**
 * 前端监控SDK版本号
 *
 * 当前SDK的版本，用于版本管理和兼容性检查。
 * 在错误报告和诊断信息中会包含此版本信息。
 *
 * @type {string}
 * @readonly
 */
export const VERSION = '1.0.0';

// 导出各个模块（供高级用户使用）
// 这些模块可以单独使用，但需要用户自行管理依赖和初始化
export { TraceManager } from './trace/tracer';
export { XHRInstrumentation, FetchInstrumentation } from './trace/instrumentation';
export { PerformanceCollector, CustomMetricsCollector } from './metrics';
export type { PerformanceMetrics, PerformanceObserverOptions } from './metrics';