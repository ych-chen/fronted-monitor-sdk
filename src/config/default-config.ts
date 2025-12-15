import type { MonitorConfig } from '../types';

/**
 * 默认监控配置
 */
export const DEFAULT_CONFIG: Partial<MonitorConfig> = {
  sampleRate: 1.0,
  exportIntervalMills: 30000, // 默认30秒上报一次
  enablePerformanceMonitoring: true,
  enableErrorMonitoring: true,
  enableUserInteractionMonitoring: true,
  enableAutoTracing: true,
  enablePerformanceMetrics: true,
  enableCustomMetrics: true,
  excludedUrls: [],
  attributes: {},
};

/**
 * 性能指标默认配置
 */
export const PERFORMANCE_CONFIG = {
  fcp: true,    // First Contentful Paint
  lcp: true,    // Largest Contentful Paint
  fid: true,    // First Input Delay
  cls: true,    // Cumulative Layout Shift
  ttfb: true,   // Time to First Byte
  navigation: true, // Navigation timing
};

/**
 * 自动追踪配置
 */
export const AUTO_TRACE_CONFIG = {
  xhr: true,    // XMLHttpRequest
  fetch: true,  // Fetch API
  history: true, // History API
  websockets: false, // WebSockets (可选)
};

/**
 * 交互追踪配置
 */
export const INTERACTION_CONFIG = {
  clicks: true,
  forms: true,
  navigation: true,
  scroll: false,  // 性能敏感，默认关闭
  input: true,
};