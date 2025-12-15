import { trace, SpanKind, SpanStatusCode, Attributes, context, Span, SpanContext } from '@opentelemetry/api';

export interface TraceOptions {
  name: string;
  kind?: SpanKind;
  attributes?: Attributes;
  startTime?: number;
}

/**
 * 链路追踪管理器
 */
export class TraceManager {
  private tracer: any;

  constructor(serviceName: string, serviceVersion?: string | undefined) {
    this.tracer = trace.getTracer(serviceName, serviceVersion);
  }

  /**
   * 开始一个新的span
   */
  startSpan(name: string, options: Partial<TraceOptions> = {}): any {
    return this.tracer.startSpan(name, {
      kind: options.kind || SpanKind.INTERNAL,
      attributes: options.attributes,
      startTime: options.startTime,
    });
  }

  /**
   * 执行函数并自动追踪
   */
  async traceAsync<T>(
    name: string,
    fn: (span: any) => Promise<T>,
    options: Partial<TraceOptions> = {}
  ): Promise<T> {
    const span = this.startSpan(name, options);

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * 执行同步函数并自动追踪
   */
  trace<T>(
    name: string,
    fn: (span: any) => T,
    options: Partial<TraceOptions> = {}
  ): T {
    const span = this.startSpan(name, options);

    try {
      const result = fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * 记录错误到当前活跃的span
   */
  recordError(error: Error, attributes?: Attributes): SpanContext {
    const activeSpan = this.getActiveSpan();
    if (activeSpan) {
      activeSpan.recordException(error);
      activeSpan.setAttributes(attributes || {});
      activeSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
      return activeSpan.spanContext();
    }
    console.log('recordError activeSpan', activeSpan)
    const errorSpan = this.tracer.startSpan('recordError')
    if (errorSpan) {
      errorSpan.recordException(error);
      errorSpan.setAttributes(attributes || {});
      errorSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
      errorSpan.end();
    }
    console.log('recordError errorSpan', errorSpan)
    return errorSpan.spanContext();
  }
  /**
   * 获取当前活跃的span
   */
  getActiveSpan(): any {
    const active = trace.getActiveSpan() || trace.getSpan(context.active());
    console.log('getActiveSpan ---> ', active)
    return active;
  }

  /**
   * 在当前上下文中执行函数
   */
  runInContext<T>(span: any, fn: () => T): T {
    return context.with(trace.setSpan(context.active(), span), fn);
  }

  /**
   * 设置span属性
   */
  setAttributes(attributes: Attributes): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes(attributes);
    }
  }

  /**
   * 添加事件到span
   */
  addEvent(name: string, attributes?: Attributes): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent(name, attributes);
    }
  }

  /**
   * 创建根span（用于页面加载等）
   */
  createRootSpan(name: string, attributes?: Attributes): any {
    const span = this.tracer.startSpan(name, {
      kind: SpanKind.INTERNAL,
      attributes: {
        ...attributes,
        'span.kind': 'root',
      },
    });
    return span;
  }
}