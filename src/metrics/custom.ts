import { metrics } from '@opentelemetry/api';

export interface CustomMetricOptions {
  name?: string;
  description?: string;
  unit?: string;
  labels?: Record<string, string>;
  [key: string]: any; // 允许其他属性以支持动态标签
}

/**
 * 自定义指标收集器
 */
export class CustomMetricsCollector {
  private meter: any;
  private counters: Map<string, any> = new Map();
  private histograms: Map<string, any> = new Map();
  private gauges: Map<string, any> = new Map();

  constructor(meter: any) {
    this.meter = meter;
  }

  /**
   * 创建或获取计数器指标
   */
  getCounter(name: string, options: CustomMetricOptions = {}): any {
    if (!this.counters.has(name)) {
      const counter = this.meter.createCounter(name, {
        description: options.description || `Counter metric: ${name}`,
        unit: options.unit || 'count',
      });
      this.counters.set(name, counter);
    }
    return this.counters.get(name);
  }

  /**
   * 创建或获取直方图指标
   */
  getHistogram(name: string, options: CustomMetricOptions = {}): any {
    if (!this.histograms.has(name)) {
      const histogram = this.meter.createHistogram(name, {
        description: options.description || `Histogram metric: ${name}`,
        unit: options.unit || 'ms',
      });
      this.histograms.set(name, histogram);
    }
    return this.histograms.get(name);
  }

  /**
   * 创建或获取仪表盘指标
   */
  getGauge(name: string, options: CustomMetricOptions = {}): any {
    if (!this.gauges.has(name)) {
      const gauge = this.meter.createUpDownCounter(name, {
        description: options.description || `Gauge metric: ${name}`,
        unit: options.unit || 'value',
      });
      this.gauges.set(name, gauge);
    }
    return this.gauges.get(name);
  }

  /**
   * 增加计数器
   */
  incrementCounter(
    name: string,
    value: number = 1,
    options: CustomMetricOptions = {}
  ): void {
    const counter = this.getCounter(name, options);
    if (options.labels) {
      counter.add(value, options.labels);
    } else {
      counter.add(value);
    }
  }

  /**
   * 记录直方图值
   */
  recordHistogram(
    name: string,
    value: number,
    options: CustomMetricOptions = {}
  ): void {
    const histogram = this.getHistogram(name, options);
    if (options.labels) {
      histogram.record(value, options.labels);
    } else {
      histogram.record(value);
    }
  }

  /**
   * 设置仪表盘值
   */
  setGauge(
    name: string,
    value: number,
    options: CustomMetricOptions = {}
  ): void {
    const gauge = this.getGauge(name, options);
    if (options.labels) {
      // 对于gauge，我们需要处理增量更新
      const currentValue = this.getCurrentGaugeValue(name, options.labels);
      const delta = value - currentValue;
      if (delta !== 0) {
        gauge.add(delta, options.labels);
      }
    } else {
      gauge.record(value);
    }
  }

  /**
   * 增加仪表盘值
   */
  incrementGauge(
    name: string,
    value: number = 1,
    options: CustomMetricOptions = {}
  ): void {
    const gauge = this.getGauge(name, options);
    if (options.labels) {
      gauge.add(value, options.labels);
    } else {
      gauge.add(value);
    }
  }

  /**
   * 减少仪表盘值
   */
  decrementGauge(
    name: string,
    value: number = 1,
    options: CustomMetricOptions = {}
  ): void {
    this.incrementGauge(name, -value, options);
  }

  /**
   * 记录事件次数（使用计数器）
   */
  recordEvent(
    eventName: string,
    count: number = 1,
    labels?: Record<string, string>
  ): void {
    const metricName = `events_${eventName}_total`;
    this.incrementCounter(metricName, count, {
      event: eventName,
      ...labels,
    });
  }

  /**
   * 记录操作耗时（使用直方图）
   */
  recordDuration(
    operationName: string,
    durationMs: number,
    labels?: Record<string, string>
  ): void {
    const metricName = `${operationName}_duration_ms`;
    this.recordHistogram(metricName, durationMs, {
      operation: operationName,
      ...labels,
    });
  }

  /**
   * 记录状态值（使用仪表盘）
   */
  recordState(
    stateName: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    const metricName = `${stateName}_current`;
    this.setGauge(metricName, value, {
      state: stateName,
      ...labels,
    });
  }

  /**
   * 批量记录指标
   */
  recordBatch(metrics: Array<{
    type: 'counter' | 'histogram' | 'gauge';
    name: string;
    value: number;
    options?: CustomMetricOptions;
  }>): void {
    metrics.forEach(metric => {
      switch (metric.type) {
        case 'counter':
          this.incrementCounter(metric.name, metric.value, metric.options);
          break;
        case 'histogram':
          this.recordHistogram(metric.name, metric.value, metric.options);
          break;
        case 'gauge':
          this.setGauge(metric.name, metric.value, metric.options);
          break;
      }
    });
  }

  /**
   * 记录HTTP请求指标
   */
  recordHTTPRequest(
    method: string,
    url: string,
    statusCode: number,
    durationMs: number
  ): void {
    const urlPath = this.extractPath(url);
    const labels = {
      method,
      status_code: statusCode.toString(),
      path: urlPath,
      success: (statusCode >= 200 && statusCode < 400).toString(),
    };

    // 请求计数
    this.incrementCounter('http_requests_total', 1, labels);

    // 请求耗时
    this.recordHistogram('http_request_duration_ms', durationMs, labels);

    // 错误计数
    if (statusCode >= 400) {
      this.incrementCounter('http_errors_total', 1, labels);
    }
  }

  /**
   * 记录用户操作指标
   */
  recordUserAction(
    actionType: string,
    elementType: string,
    durationMs?: number
  ): void {
    const labels = {
      action_type: actionType,
      element_type: elementType,
    };

    // 用户操作计数
    this.incrementCounter('user_actions_total', 1, labels);

    // 操作耗时（如果提供）
    if (durationMs !== undefined) {
      this.recordHistogram('user_action_duration_ms', durationMs, labels);
    }
  }

  /**
   * 记录业务指标
   */
  recordBusinessMetric(
    metricName: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    const fullMetricName = `business_${metricName}`;
    this.recordHistogram(fullMetricName, value, {
      metric: metricName,
      ...labels,
    });
  }

  /**
   * 获取当前Gauge值（简化实现，实际中可能需要存储当前值）
   */
  private getCurrentGaugeValue(name: string, labels?: Record<string, string>): number {
    // 这里是简化实现，实际应用中可能需要维护当前值的状态
    return 0;
  }

  /**
   * 从URL提取路径
   */
  private extractPath(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * 获取所有已注册的指标名称
   */
  getMetricNames(): {
    counters: string[];
    histograms: string[];
    gauges: string[];
  } {
    return {
      counters: Array.from(this.counters.keys()),
      histograms: Array.from(this.histograms.keys()),
      gauges: Array.from(this.gauges.keys()),
    };
  }

  /**
   * 清理所有指标
   */
  clear(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }
}