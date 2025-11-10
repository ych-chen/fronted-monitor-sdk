import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import type { TraceManager } from '../tracer';

interface XHROptions {
  propagateTraceHeaderCorsUrls?: string[];
  excludedUrls?: string[];
}

/**
 * XMLHttpRequest 自动instrumentation
 */
export class XHRInstrumentation {
  private originalXHROpen: typeof XMLHttpRequest.prototype.open;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send;
  private originalXHRSetRequestHeader: typeof XMLHttpRequest.prototype.setRequestHeader;
  private tracer: TraceManager;
  private options: XHROptions;
  private enabled = false;

  constructor(tracer: TraceManager, options: XHROptions = {}) {
    this.tracer = tracer;
    this.options = {
      propagateTraceHeaderCorsUrls: [],
      excludedUrls: [],
      ...options,
    };

    // 保存原始方法
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;
    this.originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  }

  /**
   * 启用XHR追踪
   */
  enable(): void {
    if (this.enabled) return;

    this.enabled = true;
    this.patchXHR();
  }

  /**
   * 禁用XHR追踪
   */
  disable(): void {
    if (!this.enabled) return;

    this.enabled = false;
    this.restoreXHR();
  }

  /**
   * 拦截XMLHttpRequest方法
   */
  private patchXHR(): void {
    const self = this;

    // 拦截open方法
    XMLHttpRequest.prototype.open = function(
      method: string,
      url: string | URL,
      async?: boolean,
      user?: string | null,
      password?: string | null
    ) {
      // 存储请求信息
      (this as any).__monitor_url = url.toString();
      (this as any).__monitor_method = method.toUpperCase();
      (this as any).__monitor_async = async !== false;

      return self.originalXHROpen.call(this, method, url, async || true, user, password);
    };

    // 拦截setRequestHeader方法
    XMLHttpRequest.prototype.setRequestHeader = function(
      name: string,
      value: string
    ) {
      // 记录请求头
      if (!(this as any).__monitor_headers) {
        (this as any).__monitor_headers = {};
      }
      (this as any).__monitor_headers[name.toLowerCase()] = value;

      return self.originalXHRSetRequestHeader.call(this, name, value);
    };

    // 拦截send方法
    XMLHttpRequest.prototype.send = function(body?: Document | BodyInit | null) {
      if (!self.enabled || !self.shouldTrack(this as XMLHttpRequest)) {
        return self.originalXHRSend.call(this, body as any);
      }

      const url = (this as any).__monitor_url;
      const method = (this as any).__monitor_method;
      const startTime = Date.now();

      // 创建span
      const span = self.tracer.startSpan(`HTTP ${method}`, {
        kind: SpanKind.CLIENT,
        attributes: {
          'http.method': method,
          'http.url': self.sanitizeUrl(url),
          'http.request.body.size': body ? self.getRequestBodySize(body) : 0,
          'user_agent': navigator.userAgent,
        },
      });

      // 注入trace头
      self.injectTraceHeaders(this, span);

      // 监听事件
      const onLoadHandler = () => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        span.setAttributes({
          'http.status_code': this.status,
          'http.response_body.size': this.getResponseHeader('content-length') || 0,
          'http.duration_ms': duration,
          'http.status_text': this.statusText,
        });

        // 根据状态码设置状态
        if (this.status >= 200 && this.status < 400) {
          span.setStatus({ code: SpanStatusCode.OK });
        } else {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${this.status}`,
          });
        }

        span.end();
        self.cleanupListeners(this);
      };

      const onErrorHandler = () => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        span.setAttributes({
          'http.duration_ms': duration,
          'error.name': 'XHR Error',
          'error.message': 'XMLHttpRequest failed',
        });

        span.recordException(new Error('XMLHttpRequest failed'));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: 'XMLHttpRequest failed',
        });

        span.end();
        self.cleanupListeners(this);
      };

      const onAbortHandler = () => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        span.setAttributes({
          'http.duration_ms': duration,
          'http.aborted': true,
        });

        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: 'XMLHttpRequest aborted',
        });

        span.end();
        self.cleanupListeners(this);
      };

      // 添加事件监听器
      this.addEventListener('load', onLoadHandler);
      this.addEventListener('error', onErrorHandler);
      this.addEventListener('abort', onAbortHandler);

      // 存储监听器以便清理
      (this as any).__monitor_listeners = [
        { event: 'load', handler: onLoadHandler },
        { event: 'error', handler: onErrorHandler },
        { event: 'abort', handler: onAbortHandler },
      ];

      return self.originalXHRSend.call(this, body as any);
    };
  }

  /**
   * 恢复原始XMLHttpRequest方法
   */
  private restoreXHR(): void {
    XMLHttpRequest.prototype.open = this.originalXHROpen;
    XMLHttpRequest.prototype.send = this.originalXHRSend;
    XMLHttpRequest.prototype.setRequestHeader = this.originalXHRSetRequestHeader;
  }

  /**
   * 判断是否应该追踪此请求
   */
  private shouldTrack(xhr: XMLHttpRequest): boolean {
    const url = (xhr as any).__monitor_url;

    if (!url) return false;

    // 检查排除URL
    if (this.options.excludedUrls) {
      for (const pattern of this.options.excludedUrls) {
        if (this.matchPattern(url, pattern)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * URL模式匹配
   */
  private matchPattern(url: string, pattern: string): boolean {
    if (pattern.startsWith('*')) {
      return url.endsWith(pattern.substring(1));
    }
    if (pattern.endsWith('*')) {
      return url.startsWith(pattern.substring(0, pattern.length - 1));
    }
    return url === pattern;
  }

  /**
   * 注入trace头
   */
  private injectTraceHeaders(xhr: XMLHttpRequest, span: any): void {
    // 这里应该注入OpenTelemetry的trace头
    // 由于我们没有直接的API来注入，这里简化处理
    try {
      const headers = span?.getTraceContext?.();
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value as string);
        });
      }
    } catch (error) {
      // 静默忽略错误
    }
  }

  /**
   * 清理事件监听器
   */
  private cleanupListeners(xhr: XMLHttpRequest): void {
    const listeners = (xhr as any).__monitor_listeners;
    if (listeners) {
      listeners.forEach(({ event, handler }: { event: string; handler: () => void }) => {
        xhr.removeEventListener(event, handler);
      });
      (xhr as any).__monitor_listeners = null;
    }
  }

  /**
   * 清理URL中的敏感信息
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // 移除查询参数中的敏感信息
      urlObj.search = '';
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * 获取请求体大小
   */
  private getRequestBodySize(body: Document | BodyInit | null): number {
    if (!body) return 0;

    if (typeof body === 'string') {
      return new Blob([body]).size;
    }

    if (body instanceof FormData) {
      // 简化计算
      return Array.from(body.entries()).length * 100; // 估算大小
    }

    if (body instanceof ArrayBuffer || body instanceof DataView) {
      return body.byteLength;
    }

    return 0;
  }
}