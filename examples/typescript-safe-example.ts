/**
 * TypeScript Type-Safe Frontend Monitor SDK Example
 *
 * This example demonstrates type-safe usage of the Frontend Monitor SDK
 * with proper TypeScript integration, error handling, and best practices.
 */

import {
  createFrontendMonitor,
  type FrontendMonitorSDK,
  type MonitorConfig,
  type UserInteractionEvent,
  type CustomSpanOptions,
  type ErrorContext,
  type MetricsCollector,
  type TracingProvider
} from '../src/index'

// ============= TYPE DEFINITIONS =============

/**
 * Type-safe application configuration
 */
interface AppConfig {
  service: {
    name: string
    version: string
    environment: 'development' | 'staging' | 'production'
  }
  monitoring: {
    endpoint: string
    apiKey?: string
    sampleRate: number
    enablePerformanceMonitoring: boolean
    enableErrorMonitoring: boolean
    enableUserInteractionMonitoring: boolean
    enableCustomMetrics: boolean
  }
  features: {
    authentication: boolean
    profiling: boolean
    customMetrics: boolean
    realTimeUpdates: boolean
  }
}

/**
 * Typed user information
 */
interface User {
  id: string
  name: string
  email: string
  role: 'user' | 'admin' | 'moderator'
  preferences: {
    theme: 'light' | 'dark'
    notifications: boolean
    language: string
  }
  createdAt: Date
  lastLoginAt?: Date
}

/**
 * Typed API response wrapper
 */
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, any>
  }
  metadata?: {
    timestamp: string
    requestId: string
    version: string
  }
}

/**
 * Typed login credentials
 */
interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

/**
 * Typed performance metrics
 */
interface TypedPerformanceMetrics {
  fcp?: number
  lcp?: number
  fid?: number
  cls?: number
  ttfb?: number
  domContentLoaded?: number
  loadComplete?: number
  custom?: {
    [key: string]: number | string | boolean
  }
}

/**
 * Typed custom metric definitions
 */
interface MetricDefinitions {
  counters: {
    user_login_attempts: { status: 'success' | 'error'; method: string }
    page_views: { page: string; user_type: string }
    api_requests: { endpoint: string; method: string; status_code: number }
  }
  histograms: {
    response_time: { endpoint: string; method: string }
    user_session_duration: { user_type: string }
    feature_usage: { feature_name: string; user_type: string }
  }
  gauges: {
    active_users: { region: string; user_type: string }
    memory_usage: { component: string }
    cpu_usage: { process: string }
  }
}

// ============= TYPE-SAFE CONFIGURATION FACTORY =============

/**
 * Creates a type-safe monitoring configuration
 */
function createMonitorConfig(config: AppConfig): MonitorConfig {
  return {
    serviceName: config.service.name,
    serviceVersion: config.service.version,
    endpoint: config.monitoring.endpoint,
    apiKey: config.monitoring.apiKey,
    sampleRate: config.monitoring.sampleRate,
    enablePerformanceMonitoring: config.monitoring.enablePerformanceMonitoring,
    enableErrorMonitoring: config.monitoring.enableErrorMonitoring,
    enableUserInteractionMonitoring: config.monitoring.enableUserInteractionMonitoring,
    enableAutoTracing: true,
    enableCustomMetrics: config.monitoring.enableCustomMetrics,
    attributes: {
      environment: config.service.environment,
      app_version: config.service.version,
      typescript: 'true',
      strict_mode: 'true'
    },
    excludedUrls: [
      /\/api\/health/,
      /\/api\/metrics/,
      /.*\.map$/,
      /chrome-extension:\/\//
    ]
  }
}

// ============= TYPE-SAFE API CLIENT =============

/**
 * Type-safe API client with built-in monitoring
 */
class TypedApiClient {
  constructor(
    private monitor: FrontendMonitorSDK,
    private baseUrl: string
  ) {}

  /**
   * Makes a type-safe API request with automatic tracing
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const tracing = this.monitor.startTracing(`api_request_${endpoint}`, {
      attributes: {
        http_method: options.method || 'GET',
        http_url: `${this.baseUrl}${endpoint}`,
        http_target: endpoint
      }
    })

    try {
      const startTime = performance.now()

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      })

      const duration = performance.now() - startTime
      const responseData = await response.json()

      // Record HTTP metrics
      const metrics = this.monitor.getMetricsCollector()
      metrics.incrementCounter('api_requests_total', 1, {
        endpoint,
        method: options.method || 'GET',
        status_code: response.status.toString()
      })
      metrics.recordHistogram('api_request_duration_ms', duration, {
        endpoint,
        method: options.method || 'GET'
      })

      tracing.setAttributes({
        http_status_code: response.status,
        response_size: JSON.stringify(responseData).length
      })

      if (!response.ok) {
        tracing.recordError(new Error(`HTTP ${response.status}: ${response.statusText}`))
        tracing.endSpan()

        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: responseData.message || response.statusText,
            details: responseData
          }
        }
      }

      tracing.endSpan()

      return {
        success: true,
        data: responseData,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          version: '1.0.0'
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      tracing.recordError(new Error(errorMessage))
      tracing.endSpan()

      // Record error metrics
      const metrics = this.monitor.getMetricsCollector()
      metrics.incrementCounter('api_errors_total', 1, {
        endpoint,
        error_type: 'network_error'
      })

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: errorMessage
        }
      }
    }
  }

  /**
   * Type-safe POST request
   */
  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  /**
   * Type-safe GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET'
    })
  }
}

// ============= TYPE-SAFE USER SERVICE =============

/**
 * Type-safe user management service with monitoring
 */
class TypedUserService {
  constructor(
    private apiClient: TypedApiClient,
    private monitor: FrontendMonitorSDK
  ) {}

  /**
   * Authenticates a user with comprehensive monitoring
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string }>> {
    const tracing = this.monitor.startTracing('user_authentication', {
      attributes: {
        user_email: credentials.email,
        remember_me: credentials.rememberMe?.toString() || 'false',
        auth_method: 'email_password'
      }
    })

    try {
      // Record login attempt
      const metrics = this.monitor.getMetricsCollector()
      metrics.incrementCounter('user_login_attempts_total', 1, {
        method: 'email_password'
      })

      const response = await this.apiClient.post<{ user: User; token: string }>('/auth/login', {
        email: credentials.email,
        password: credentials.password,
        rememberMe: credentials.rememberMe
      })

      if (response.success && response.data) {
        // Record successful login
        metrics.incrementCounter('user_login_successful_total', 1, {
          user_type: response.data.user.role
        })

        // Set user context in monitor
        this.monitor.setAttributes({
          user_id: response.data.user.id,
          user_role: response.data.user.role,
          user_email: response.data.user.email
        })

        tracing.setAttributes({
          user_id: response.data.user.id,
          user_role: response.data.user.role
        })

        tracing.endSpan()

        return response
      } else {
        // Record failed login
        metrics.incrementCounter('user_login_failed_total', 1, {
          error_code: response.error?.code || 'unknown'
        })

        tracing.recordError(new Error(response.error?.message || 'Login failed'))
        tracing.endSpan()

        return response
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown authentication error'

      metrics.incrementCounter('user_login_errors_total', 1, {
        error_type: 'system_error'
      })

      tracing.recordError(new Error(errorMessage))
      tracing.endSpan()

      return {
        success: false,
        error: {
          code: 'AUTH_SYSTEM_ERROR',
          message: errorMessage
        }
      }
    }
  }

  /**
   * Fetches user profile with monitoring
   */
  async getUserProfile(userId: string): Promise<ApiResponse<User>> {
    const tracing = this.monitor.startTracing('get_user_profile', {
      attributes: {
        target_user_id: userId
      }
    })

    try {
      const response = await this.apiClient.get<User>(`/users/${userId}`)

      if (response.success) {
        tracing.setAttributes({
          user_role: response.data?.role,
          user_created_at: response.data?.createdAt.toISOString()
        })
      }

      tracing.endSpan()
      return response

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile fetch failed'
      tracing.recordError(new Error(errorMessage))
      tracing.endSpan()

      return {
        success: false,
        error: {
          code: 'PROFILE_FETCH_ERROR',
          message: errorMessage
        }
      }
    }
  }

  /**
   * Updates user profile with monitoring
   */
  async updateProfile(userId: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    const tracing = this.monitor.startTracing('update_user_profile', {
      attributes: {
        target_user_id: userId,
        update_fields: Object.keys(updates).join(',')
      }
    })

    try {
      const response = await this.apiClient.patch<User>(`/users/${userId}`, updates)

      if (response.success) {
        // Record profile update metrics
        const metrics = this.monitor.getMetricsCollector()
        metrics.incrementCounter('user_profile_updates_total', 1, {
          update_type: 'manual'
        })

        tracing.setAttributes({
          updated_fields: Object.keys(updates).length
        })
      }

      tracing.endSpan()
      return response

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed'
      tracing.recordError(new Error(errorMessage))
      tracing.endSpan()

      return {
        success: false,
        error: {
          code: 'PROFILE_UPDATE_ERROR',
          message: errorMessage
        }
      }
    }
  }
}

// ============= TYPED METRICS COLLECTOR =============

/**
 * Type-safe metrics collector with predefined metric types
 */
class TypedMetricsCollector {
  constructor(private metrics: MetricsCollector) {}

  // Counter methods with type safety
  incrementCounter<K extends keyof MetricDefinitions['counters']>(
    name: K,
    value: number = 1,
    labels: MetricDefinitions['counters'][K]
  ): void {
    this.metrics.incrementCounter(name, value, labels as Record<string, string>)
  }

  // Histogram methods with type safety
  recordHistogram<K extends keyof MetricDefinitions['histograms']>(
    name: K,
    value: number,
    labels: MetricDefinitions['histograms'][K]
  ): void {
    this.metrics.recordHistogram(name, value, labels as Record<string, string>)
  }

  // Gauge methods with type safety
  recordGauge<K extends keyof MetricDefinitions['gauges']>(
    name: K,
    value: number,
    labels: MetricDefinitions['gauges'][K]
  ): void {
    this.metrics.recordGauge(name, value, labels as Record<string, string>)
  }

  // Business-specific metrics methods
  recordUserAction(action: string, userRole: string, duration?: number): void {
    this.incrementCounter('user_actions_total', 1, {
      action,
      user_type: userRole
    })

    if (duration) {
      this.recordHistogram('user_action_duration_ms', duration, {
        action,
        user_type: userRole
      })
    }
  }

  recordFeatureUsage(feature: string, userRole: string, success: boolean): void {
    this.incrementCounter('feature_usage_total', 1, {
      feature_name: feature,
      user_type: userRole,
      status: success ? 'success' : 'error'
    })

    this.recordHistogram('feature_response_time_ms', 100, {
      feature_name: feature,
      user_type: userRole
    })
  }

  recordPageView(page: string, userRole: string, loadTime?: number): void {
    this.incrementCounter('page_views_total', 1, {
      page,
      user_type: userRole
    })

    if (loadTime) {
      this.recordHistogram('page_load_time_ms', loadTime, {
        page,
        user_type: userRole
      })
    }
  }
}

// ============= TYPED TRACING MANAGER =============

/**
 * Type-safe tracing manager with predefined span types
 */
class TypedTracingManager {
  constructor(private tracing: TracingProvider) {}

  /**
   * Starts a user interaction span
   */
  startUserInteraction(
    action: string,
    elementType: string,
    targetId?: string
  ): TracingProvider {
    return this.tracing.startTracing(`user_interaction_${action}`, {
      attributes: {
        interaction_type: 'user_action',
        action,
        element_type: elementType,
        target_id: targetId || '',
        timestamp: Date.now().toString()
      }
    })
  }

  /**
   * Starts an API operation span
   */
  startApiOperation(
    operation: string,
    endpoint: string,
    method: string = 'GET'
  ): TracingProvider {
    return this.tracing.startTracing(`api_${operation}`, {
      attributes: {
        operation_type: 'api_call',
        endpoint,
        http_method: method,
        timestamp: Date.now().toString()
      }
    })
  }

  /**
   * Starts a business operation span
   */
  startBusinessOperation(
    operation: string,
    businessContext: Record<string, any>
  ): TracingProvider {
    return this.tracing.startTracing(`business_${operation}`, {
      attributes: {
        operation_type: 'business_process',
        ...businessContext,
        timestamp: Date.now().toString()
      }
    })
  }

  /**
   * Records an error with context
   */
  recordError(error: Error, context: Record<string, any> = {}): void {
    this.tracing.recordError(error, {
      error_context: JSON.stringify(context),
      timestamp: Date.now().toString(),
      ...context
    })
  }
}

// ============= MAIN APPLICATION CLASS =============

/**
 * Type-safe main application class with comprehensive monitoring integration
 */
class TypedMonitoredApplication {
  private monitor: FrontendMonitorSDK | null = null
  private apiClient: TypedApiClient | null = null
  private userService: TypedUserService | null = null
  private typedMetrics: TypedMetricsCollector | null = null
  private typedTracing: TypedTracingManager | null = null
  private currentUser: User | null = null

  constructor(private config: AppConfig) {}

  /**
   * Initializes the application with monitoring
   */
  async initialize(): Promise<void> {
    const tracing = this.createTemporaryTracing('app_initialization')

    try {
      console.log('🚀 Initializing TypeScript-monitored application...')

      // Initialize monitor
      this.monitor = createFrontendMonitor()
      await this.monitor.init(createMonitorConfig(this.config))

      // Initialize services
      this.apiClient = new TypedApiClient(this.monitor, this.config.monitoring.endpoint)
      this.userService = new TypedUserService(this.apiClient, this.monitor)
      this.typedMetrics = new TypedMetricsCollector(this.monitor.getMetricsCollector())
      this.typedTracing = new TypedTracingManager(
        this.monitor.startTracing('root_tracing')
      )

      // Setup global error handling
      this.setupErrorHandling()

      // Setup performance monitoring
      if (this.config.features.customMetrics) {
        this.setupPerformanceMonitoring()
      }

      console.log('✅ Application initialized successfully')
      tracing.endSpan()

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Initialization failed'
      console.error('❌ Application initialization failed:', errorMessage)

      if (this.typedTracing) {
        this.typedTracing.recordError(error, {
          phase: 'initialization',
          config: JSON.stringify(this.config)
        })
      }

      tracing.recordError(error instanceof Error ? error : new Error(errorMessage))
      tracing.endSpan()

      throw error
    }
  }

  /**
   * Sets up global error handling
   */
  private setupErrorHandling(): void {
    if (!this.monitor) return

    // Handle unhandled errors
    window.addEventListener('error', (event) => {
      this.monitor?.recordError(event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message
      })
    })

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.monitor?.recordError(new Error(event.reason), {
        type: 'unhandled_promise_rejection',
        reason: event.reason
      })
    })
  }

  /**
   * Sets up performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    if (!this.typedMetrics) return

    // Monitor page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.typedMetrics?.incrementCounter('page_hidden_total', 1, {
          page: window.location.pathname
        })
      } else {
        this.typedMetrics?.incrementCounter('page_visible_total', 1, {
          page: window.location.pathname
        })
      }
    })

    // Monitor connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      connection?.addEventListener('change', () => {
        this.typedMetrics?.recordGauge('network_effective_type_rtt', connection.rtt || 0, {
          effective_type: connection.effectiveType || 'unknown'
        })
      })
    }
  }

  /**
   * Simulated user login with full monitoring
   */
  async login(email: string, password: string): Promise<boolean> {
    if (!this.userService || !this.typedMetrics || !this.typedTracing) {
      throw new Error('Application not properly initialized')
    }

    const tracing = this.typedTracing.startUserInteraction('login', 'form', 'login-form')

    try {
      const response = await this.userService.login({ email, password })

      if (response.success && response.data) {
        this.currentUser = response.data.user

        // Record login success metrics
        this.typedMetrics.recordUserAction('login', this.currentUser.role, 1000)
        this.typedMetrics.incrementCounter('active_users', 1, {
          region: 'global',
          user_type: this.currentUser.role
        })

        console.log(`✅ User logged in: ${this.currentUser.name} (${this.currentUser.role})`)
        tracing.endSpan()

        return true
      } else {
        console.error('❌ Login failed:', response.error?.message)

        this.typedMetrics.incrementCounter('user_login_failed_total', 1, {
          error_code: response.error?.code || 'unknown'
        })

        tracing.recordError(new Error(response.error?.message || 'Login failed'))
        tracing.endSpan()

        return false
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login error'
      console.error('❌ Login error:', errorMessage)

      this.typedTracing.recordError(error instanceof Error ? error : new Error(errorMessage), {
        action: 'login',
        user_email: email
      })

      tracing.recordError(error instanceof Error ? error : new Error(errorMessage))
      tracing.endSpan()

      return false
    }
  }

  /**
   * Simulated user action with monitoring
   */
  performAction(action: string, details: Record<string, any> = {}): void {
    if (!this.currentUser || !this.typedMetrics || !this.typedTracing) return

    const tracing = this.typedTracing.startUserInteraction(action, details.elementType || 'button')

    try {
      // Simulate action processing time
      const processingTime = Math.random() * 500 + 100

      setTimeout(() => {
        // Record action metrics
        this.typedMetrics!.recordUserAction(action, this.currentUser!.role, processingTime)
        this.typedMetrics!.recordFeatureUsage(`feature_${action}`, this.currentUser!.role, true)

        console.log(`🎯 Action performed: ${action} by ${this.currentUser!.name}`)

        tracing.endSpan()
      }, processingTime)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Action failed'

      this.typedTracing!.recordError(error instanceof Error ? error : new Error(errorMessage), {
        action,
        user_id: this.currentUser!.id
      })

      tracing.recordError(error instanceof Error ? error : new Error(errorMessage))
      tracing.endSpan()
    }
  }

  /**
   * Records custom performance metrics
   */
  recordPerformanceMetrics(metrics: TypedPerformanceMetrics): void {
    if (!this.monitor || !this.typedMetrics) return

    // Record performance metrics
    this.monitor.recordMetrics(metrics)

    // Record custom metrics for analysis
    if (metrics.fcp) {
      this.typedMetrics.recordHistogram('performance_fcp', metrics.fcp, {
        page: window.location.pathname,
        user_type: this.currentUser?.role || 'anonymous'
      })
    }

    if (metrics.lcp) {
      this.typedMetrics.recordHistogram('performance_lcp', metrics.lcp, {
        page: window.location.pathname,
        user_type: this.currentUser?.role || 'anonymous'
      })
    }

    if (metrics.custom) {
      Object.entries(metrics.custom).forEach(([key, value]) => {
        if (typeof value === 'number') {
          this.typedMetrics.recordGauge(`custom_${key}`, value, {
            page: window.location.pathname
          })
        }
      })
    }

    console.log('📊 Performance metrics recorded:', metrics)
  }

  /**
   * Gets current application status
   */
  getStatus(): {
    initialized: boolean
    user: User | null
    monitoring: boolean
    features: Record<string, boolean>
  } {
    return {
      initialized: !!this.monitor,
      user: this.currentUser,
      monitoring: !!this.monitor,
      features: this.config.features
    }
  }

  /**
   * Creates a temporary tracing instance for initialization
   */
  private createTemporaryTracing(name: string): TracingProvider {
    const mockTracing: TracingProvider = {
      startSpan: () => mockTracing,
      endSpan: () => {},
      recordError: () => {}
    }
    return mockTracing
  }

  /**
   * Cleanup method
   */
  async destroy(): Promise<void> {
    if (this.monitor) {
      await this.monitor.destroy()
      console.log('🧹 Application cleaned up successfully')
    }
  }
}

// ============= USAGE EXAMPLE =============

/**
 * Example usage of the type-safe monitored application
 */
async function demonstrateTypeSafeMonitoring(): Promise<void> {
  // Type-safe configuration
  const appConfig: AppConfig = {
    service: {
      name: 'typescript-frontend-app',
      version: '1.0.0',
      environment: 'development'
    },
    monitoring: {
      endpoint: 'https://your-collector.example.com',
      apiKey: 'your-api-key',
      sampleRate: 1.0,
      enablePerformanceMonitoring: true,
      enableErrorMonitoring: true,
      enableUserInteractionMonitoring: true,
      enableCustomMetrics: true
    },
    features: {
      authentication: true,
      profiling: true,
      customMetrics: true,
      realTimeUpdates: true
    }
  }

  // Create and initialize application
  const app = new TypedMonitoredApplication(appConfig)

  try {
    // Initialize the application
    await app.initialize()

    // Simulate user login
    const loginSuccess = await app.login('user@example.com', 'password123')

    if (loginSuccess) {
      // Simulate user actions
      app.performAction('view_dashboard', { elementType: 'navigation' })
      app.performAction('edit_profile', { elementType: 'button' })
      app.performAction('save_changes', { elementType: 'form' })

      // Record performance metrics
      app.recordPerformanceMetrics({
        fcp: 1200,
        lcp: 2400,
        fid: 45,
        cls: 0.1,
        ttfb: 180,
        domContentLoaded: 800,
        loadComplete: 1500,
        custom: {
          memory_usage: 45.2,
          cpu_usage: 12.8,
          network_latency: 23
        }
      })

      // Check application status
      console.log('📋 Application Status:', app.getStatus())
    }

    // Simulate some runtime before cleanup
    setTimeout(async () => {
      await app.destroy()
    }, 5000)

  } catch (error) {
    console.error('❌ Application error:', error)
    await app.destroy()
  }
}

// Export for use in other modules
export {
  TypedMonitoredApplication,
  TypedApiClient,
  TypedUserService,
  TypedMetricsCollector,
  TypedTracingManager,
  type AppConfig,
  type User,
  type ApiResponse,
  type LoginCredentials,
  type TypedPerformanceMetrics,
  type MetricDefinitions,
  createMonitorConfig,
  demonstrateTypeSafeMonitoring
}

// Auto-demo if running directly
if (typeof window !== 'undefined') {
  // Browser environment - attach to window for demo
  (window as any).demonstrateTypeSafeMonitoring = demonstrateTypeSafeMonitoring
  console.log('🎯 TypeScript Type-Safe Frontend Monitor SDK loaded')
  console.log('Run demonstrateTypeSafeMonitoring() to see the demo')
}