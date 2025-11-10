import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import type { TraceManager } from '../tracer';

interface FetchOptions {
  propagateTraceHeaderCorsUrls?: string[];
  excludedUrls?: string[];
}

/**
 * Fetch API 自动instrumentation
 */
export class FetchInstrumentation {
  private originalFetch: typeof globalThis.fetch;
  private tracer: TraceManager;
  private options: FetchOptions;
  private enabled = false;

  constructor(tracer: TraceManager, options: FetchOptions = {}) {
    this.tracer = tracer;
    this.options = {
      propagateTraceHeaderCorsUrls: [],
      excludedUrls: [],
      ...options,
    };

    this.originalFetch = globalThis.fetch.bind(globalThis);
  }

  /**
   * 启用Fetch追踪
   */
  enable(): void {
    if (this.enabled) return;

    this.enabled = true;
    this.patchFetch();
  }

  /**
   * 禁用Fetch追踪
   */
  disable(): void {
    if (!this.enabled) return;

    this.enabled = false;
    this.restoreFetch();
  }

  /**
   * 拦截fetch方法
   */
  private patchFetch(): void {
    const self = this;

    globalThis.fetch = async function(
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      if (!self.enabled) {
        return self.originalFetch(input, init);
      }

      try {
        // 提取URL信息
        const requestInfo = self.extractRequestInfo(input, init);

        // 检查是否应该追踪
        if (!self.shouldTrack(requestInfo.url)) {
          return self.originalFetch(input, init);
        }

        // 创建span
        const span = self.tracer.startSpan(`HTTP ${requestInfo.method}`, {
          kind: SpanKind.CLIENT,
          attributes: {
            'http.method': requestInfo.method,
            'http.url': self.sanitizeUrl(requestInfo.url),
            'http.request.body.size': requestInfo.bodySize,
            'http.request.header.content-type': requestInfo.contentType,
          },
        });

        // 注入trace头
        const modifiedInit = self.injectTraceHeaders(init, span);

        const startTime = Date.now();

        try {
          // 执行原始fetch
          const response = await self.originalFetch(input, modifiedInit);

          // 记录成功响应
          const endTime = Date.now();
          const duration = endTime - startTime;

          span.setAttributes({
            'http.status_code': response.status,
            'http.status_text': response.statusText,
            'http.response_body.size': response.headers.get('content-length') || 0,
            'http.duration_ms': duration,
            'http.response.header.content-type': response.headers.get('content-type') || '',
          });

          // 根据状态码设置状态
          if (response.ok) {
            span.setStatus({ code: SpanStatusCode.OK });
          } else {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: `HTTP ${response.status}`,
            });
          }

          span.end();

          return response;

        } catch (error) {
          // 记录错误
          const endTime = Date.now();
          const duration = endTime - startTime;

          span.setAttributes({
            'http.duration_ms': duration,
            'error.name': (error as Error).name,
            'error.message': (error as Error).message,
          });

          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });

          span.end();

          throw error;
        }

      } catch (error) {
        // 如果追踪本身出错，回退到原始fetch
        return self.originalFetch(input, init);
      }
    };
  }

  /**
   * 恢复原始fetch方法
   */
  private restoreFetch(): void {
    globalThis.fetch = this.originalFetch;
  }

  /**
   * 提取请求信息
   */
  private extractRequestInfo(input: RequestInfo | URL, init?: RequestInit) {
    let url: string;
    let method: string = 'GET';
    let contentType: string | undefined;
    let bodySize: number = 0;

    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input instanceof Request) {
      url = input.url;
      method = input.method;
      contentType = input.headers.get('content-type') || undefined;
      bodySize = this.estimateBodySize(input.body);
    } else {
      url = String(input);
    }

    // 从init中获取信息
    if (init) {
      method = init.method || method;
      if (!contentType && init.headers) {
        contentType = this.extractContentType(init.headers);
      }
      if (!bodySize && init.body) {
        bodySize = this.estimateBodySize(init.body);
      }
    }

    return {
      url,
      method: method.toUpperCase(),
      contentType,
      bodySize,
    };
  }

  /**
   * 提取Content-Type头
   */
  private extractContentType(headers: HeadersInit): string | undefined {
    if (headers instanceof Headers) {
      return headers.get('content-type') || undefined;
    }
    if (Array.isArray(headers)) {
      const header = headers.find(([key]) => key.toLowerCase() === 'content-type');
      return header?.[1];
    }
    if (typeof headers === 'object') {
      return headers['content-type'] || headers['Content-Type'];
    }
    return undefined;
  }

  /**
   * 估算请求体大小
   */
  private estimateBodySize(body: BodyInit | null): number {
    if (!body) return 0;

    if (typeof body === 'string') {
      return new Blob([body]).size;
    }

    if (body instanceof ArrayBuffer || body instanceof DataView) {
      return body.byteLength;
    }

    if (body instanceof Blob) {
      return body.size;
    }

    if (body instanceof FormData) {
      // 简化估算
      let size = 0;
      for (const [key, value] of body.entries()) {
        size += key.length + 2; // key + '='
        if (typeof value === 'string') {
          size += value.length;
        } else if (value instanceof Blob) {
          size += value.size;
        }
      }
      return size;
    }

    if (body instanceof URLSearchParams) {
      return body.toString().length;
    }

    return 0;
  }

  /**
   * 注入trace头
   */
  private injectTraceHeaders(init?: RequestInit, span?: any): RequestInit | undefined {
    if (!init || !span) return init;

    try {
      const traceContext = span?.getTraceContext?.();
      if (!traceContext) return init;

      const headers = new Headers(init.headers);

      Object.entries(traceContext).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers.set(key, value);
        }
      });

      return {
        ...init,
        headers,
      };
    } catch (error) {
      // 静默忽略错误
      return init;
    }
  }

  /**
   * 判断是否应该追踪此请求
   */
  private shouldTrack(url: string): boolean {
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
    return url.includes(pattern);
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
}