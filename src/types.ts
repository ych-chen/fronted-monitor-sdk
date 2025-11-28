import { SpanStatusCode, SpanKind } from '@opentelemetry/api';

/**
 * 前端监控SDK配置接口
 *
 * 定义了初始化前端监控SDK所需的所有配置选项。
 * 每个配置项都有合理的默认值，用户可以根据需要自定义。
 */
export interface MonitorConfig {
  /**
   * 服务名称 - 必填
   * 用于标识监控数据来源的服务名
   * 建议使用有意义的服务名，如 'user-service'、'web-app'
   */
  serviceName: string;

  /**
   * 服务版本 - 可选
   * 用于标识服务的版本号，在排查问题时非常有用
   * 格式建议遵循语义化版本规范，如 '1.0.0'
   */
  serviceVersion?: string;

  /**
   * OTLP 端点地址 - 必填
   * 用于接收监控数据的后端服务端点URL
   * 必须是有效的HTTP或HTTPS地址
   */
  endpoint: string;

  /**
   * 采样率 - 可选，默认1.0
   * 控制监控数据的采样比例，范围0.0-1.0
   * 1.0表示100%采样，0.1表示10%采样
   * 在生产环境中建议使用较低的采样率以减少性能影响
   */
  sampleRate?: number;

  /**
   * 指标导出间隔（毫秒）- 可选，默认30秒
   * 控制监控指标导出到后端的频率间隔
   * 30秒适用于大多数Web应用
   * 15秒适用于高频性能监控
   * 60秒适用于用户行为分析
   * 5分钟适用于低频或成本敏感场景
   */
  exportIntervalMillis?: number;


  /**
   * 自定义属性 - 可选
   * 全局标签，会附加到所有监控数据中
   * 常用于环境标识、版本信息等
   */
  attributes?: Record<string, string>;

  /**
   * 是否启用性能监控 - 可选，默认true
   * 控制是否自动收集Core Web Vitals等性能指标
   * 包括FCP、LCP、FID、CLS、TTFB等关键性能指标
   */
  enablePerformanceMonitoring?: boolean;

  /**
   * 是否启用错误监控 - 可选，默认true
   * 控制是否自动捕获和上报JavaScript错误
   * 包括全局错误、未处理的Promise拒绝等
   */
  enableErrorMonitoring?: boolean;

  /**
   * 是否启用用户交互监控 - 可选，默认true
   * 控制是否自动跟踪用户的交互行为
   * 包括点击、滚动、表单提交等用户行为
   */
  enableUserInteractionMonitoring?: boolean;

  /**
   * 是否启用自动追踪 - 可选，默认true
   * 控制是否自动对网络请求等操作进行追踪
   * 会自动为fetch和XMLHttpRequest添加追踪
   */
  enableAutoTracing?: boolean;

  /**
   * 是否启用性能指标 - 可选，默认true
   * 控制是否收集和上报详细的性能指标
   * 包括资源加载时间、API响应时间等
   */
  enablePerformanceMetrics?: boolean;

  /**
   * 是否启用自定义指标 - 可选，默认true
   * 控制是否允许用户通过API上报自定义指标
   * 用于业务相关的特定指标监控
   */
  enableCustomMetrics?: boolean;

  /**
   * 排除的URL模式 - 可选
   * 指定不需要监控的URL模式列表
   * 支持正则表达式或字符串匹配，用于过滤掉不需要监控的请求
   */
  excludedUrls?: string[];

  /**
   * 需要注入Trace头的URL模式 - 可选
   * 指定需要自动添加traceparent和tracestate头的URL模式列表
   * 支持通配符匹配，例如：['/api/*', 'https://api.example.com/*']
   */
  propagateTraceHeaderCorsUrls?: string[];

  /**
   * 是否启用路由监控 - 可选，默认false
   * 控制是否自动监控页面路由变化
   * 包括Hash路由、History API、SPA路由变化等
   */
  enableRouteMonitoring?: boolean;

  /**
   * 路由监控配置 - 可选
   * 路由监控的详细配置选项
   */
  routeMonitoringConfig?: RouteMonitoringConfig;
}

/**
 * Span属性接口
 *
 * 定义了追踪span可以包含的属性类型。
 * 属性用于为追踪数据添加额外的上下文信息。
 */
export interface SpanAttributes {
  [key: string]: string | number | boolean;
}

/**
 * 自定义Span选项接口
 *
 * 用于创建自定义追踪span时的配置选项。
 * 支持指定span的名称、类型、属性和开始时间。
 */
export interface CustomSpanOptions {
  /**
   * Span名称 - 必填
   * 用于标识这个span的名称，应该是有意义的描述性名称
   * 例如：'user_login'、'api_call'、'render_component'
   */
  name: string;

  /**
   * Span类型 - 可选
   * 定义span的类型，用于标识操作的类别
   * 常见的类型包括：CLIENT、SERVER、INTERNAL、PRODUCER、CONSUMER
   */
  kind?: SpanKind;

  /**
   * Span属性 - 可选
   * 附加到span的键值对属性，用于提供额外的上下文信息
   * 例如：{ 'user.id': '123', 'feature.name': 'dashboard' }
   */
  attributes?: SpanAttributes;

  /**
   * 开始时间 - 可选
   * 自定义span的开始时间，如果不指定则使用当前时间
   * 格式为Unix时间戳（毫秒）
   */
  startTime?: number;
}

/**
 * 错误上下文接口
 *
 * 用于定义错误发生时的上下文信息。
 * 帮助开发者更好地理解和调试错误。
 */
export interface ErrorContext {
  /**
   * 错误对象 - 必填
   * JavaScript Error对象，包含错误的详细信息
   */
  error: Error;

  /**
   * 上下文信息 - 可选
   * 错误发生时的额外上下文信息
   * 例如：用户信息、组件状态、请求参数等
   */
  context?: Record<string, any>;

  /**
   * 错误级别 - 可选
   * 错误的严重程度，用于分类和优先级处理
   * 'error': 严重错误，需要立即处理
   * 'warning': 警告信息，需要注意但不是严重问题
   * 'info': 信息性错误，主要用于记录
   */
  level?: 'error' | 'warning' | 'info';
}

/**
 * 用户交互事件接口
 *
 * 定义了用户交互事件的数据结构。
 * 用于跟踪和分析用户在应用中的行为模式。
 */
export interface UserInteractionEvent {
  /**
   * 交互类型 - 必填
   * 用户交互的类型，支持以下类型：
   * 'click': 点击事件（鼠标点击、触摸点击）
   * 'scroll': 滚动事件（页面滚动、元素滚动）
   * 'input': 输入事件（表单输入、文本编辑）
   * 'navigation': 导航事件（页面跳转、路由变化）
   */
  type: 'click' | 'scroll' | 'input' | 'navigation';

  /**
   * 交互元素 - 可选
   * 触发交互的HTML元素类型
   * 例如：'button'、'input'、'a'、'div'
   */
  element?: string;

  /**
   * 交互目标 - 可选
   * 交互目标的标识符
   * 可能是元素的ID、类名、文本内容等
   */
  target?: string;

  /**
   * 时间戳 - 必填
   * 交互发生的时间戳（Unix毫秒时间戳）
   */
  timestamp: number;

  /**
   * 持续时间 - 可选
   * 交互操作的持续时间（毫秒）
   * 对于长时间操作特别有用，如表单填写、页面滚动等
   */
  duration?: number;

  /**
   * 交互值 - 可选
   * 与交互相关的数据值
   * 例如：输入框的值、选择项、滚动位置等
   */
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
  /** 记录路由变化 */
  recordRouteChange(event: RouteChangeEvent): void;
  /** 获取指标收集器 */
  getMetricsCollector(): MetricsCollector;
  /** 获取追踪管理器 */
  getTraceManager(): any;
  /** 获取当前路由信息 */
  getCurrentRoute(): { path: string; query: Record<string, string>; params: Record<string, string> };

  /** 设置用户信息 */
  setUser(userInfo: UserInfo): void;

  /** 更新用户信息（合并更新） */
  updateUser(userInfo: Partial<UserInfo>): void;

  /** 清除用户信息 */
  clearUser(): void;

  /** 获取当前用户信息 */
  getCurrentUser(): UserInfo | null;

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

/**
 * 路由变化事件接口
 *
 * 用于监控页面路由变化的详细信息
 */
export interface RouteChangeEvent {
  /**
   * 路由类型 - 必填
   * 'hash': Hash路由变化 (#/path)
   * 'popstate': 浏览器前进/后退
   * 'pushstate': History API pushState
   * 'replacestate': History API replaceState
   * 'load': 页面初次加载
   */
  type: 'hash' | 'popstate' | 'pushstate' | 'replacestate' | 'load';

  /**
   * 源路径 - 路由变化前的路径
   */
  from: string;

  /**
   * 目标路径 - 路由变化后的路径
   */
  to: string;

  /**
   * 时间戳 - 必填
   * 路由变化发生的时间戳
   */
  timestamp: number;

  /**
   * 路由切换耗时 - 可选
   * 从开始路由变化到完成的时间（毫秒）
   */
  duration?: number;

  /**
   * 路由参数 - 可选
   * 解析后的路由参数对象
   */
  params?: Record<string, string>;

  /**
   * 查询参数 - 可选
   * URL查询参数对象
   */
  query?: Record<string, string>;

  /**
   * 页面标题 - 可选
   * 路由变化后的页面标题
   */
  title?: string;

  /**
   * 导航状态 - 可选
   * popstate事件的状态对象
   */
  state?: any;

  /**
   * 是否为SPA路由 - 可选
   * 标识是否为单页应用的路由变化
   */
  isSPA?: boolean;
}

/**
 * 用户信息接口
 *
 * 定义了用户上下文信息的数据结构
 * 用于在监控链路中标识和追踪用户行为
 */
export interface UserInfo {
  /** 用户唯一标识 - 必填 */
  id: string;
  /** 用户姓名 - 可选 */
  name?: string;
  /** 用户邮箱 - 可选 */
  email?: string;
  /** 用户套餐/等级 - 可选 */
  plan?: string;
  /** 用户角色 - 可选 */
  role?: string;
  /** 其他自定义属性 - 可选 */
  [key: string]: any;
}

/**
 * 路由监控配置接口
 */
export interface RouteMonitoringConfig {
  /**
   * 是否启用路由监控
   */
  enabled?: boolean;

  /**
   * 是否监控Hash路由变化
   */
  hashRouting?: boolean;

  /**
   * 是否监控History API
   */
  historyAPI?: boolean;

  /**
   * 是否监控popstate事件
   */
  popstate?: boolean;

  /**
   * 需要忽略的路径模式
   */
  ignoredPaths?: string[];

  /**
   * 是否解析路由参数
   */
  parseParams?: boolean;

  /**
   * 是否解析查询参数
   */
  parseQuery?: boolean;

  /**
   * 指标导出间隔（毫秒）
   * 默认30秒（30000毫秒），适用于大多数应用场景
   * 高频监控（如性能指标）建议15秒
   * 业务指标（如用户行为）建议60秒
   */
  exportIntervalMillis?: number;

  /**
   * 自定义路由匹配函数
   */
  customRouteMatcher?: (path: string) => { params?: Record<string, string>; query?: Record<string, string> };
}