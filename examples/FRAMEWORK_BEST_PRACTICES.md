# Frontend Monitor SDK - Framework-Specific Best Practices

This guide provides comprehensive best practices for integrating the Frontend Monitor SDK with different frontend frameworks and architectures.

## Table of Contents

1. [General Best Practices](#general-best-practices)
2. [React Best Practices](#react-best-practices)
3. [Vue.js Best Practices](#vuejs-best-practices)
4. [Vanilla JavaScript Best Practices](#vanilla-javascript-best-practices)
5. [TypeScript Best Practices](#typescript-best-practices)
6. [Performance Optimization](#performance-optimization)
7. [Error Handling Patterns](#error-handling-patterns)
8. [Testing Considerations](#testing-considerations)
9. [Deployment Guidelines](#deployment-guidelines)

## General Best Practices

### 1. SDK Initialization
```typescript
// ✅ Best: Initialize early and handle errors properly
async function initializeMonitor(config: MonitorConfig): Promise<void> {
  try {
    const monitor = createFrontendMonitor()
    await monitor.init(config)
    console.log('✅ Monitor SDK initialized successfully')
  } catch (error) {
    console.error('❌ Monitor SDK initialization failed:', error)
    // Fallback: continue without monitoring in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Running without monitoring in development mode')
    }
  }
}

// ❌ Avoid: Synchronous initialization without error handling
const monitor = createFrontendMonitor()
monitor.init(config) // Missing error handling and async/await
```

### 2. Configuration Management
```typescript
// ✅ Best: Environment-specific configuration
const createMonitorConfig = (): MonitorConfig => {
  const isProduction = process.env.NODE_ENV === 'production'
  const isDevelopment = process.env.NODE_ENV === 'development'

  return {
    serviceName: 'my-frontend-app',
    serviceVersion: process.env.APP_VERSION || '1.0.0',
    endpoint: process.env.MONITOR_ENDPOINT || 'http://localhost:4318',
    apiKey: process.env.MONITOR_API_KEY,
    sampleRate: isProduction ? 0.1 : 1.0, // Lower sample rate in production
    enablePerformanceMonitoring: true,
    enableErrorMonitoring: true,
    enableUserInteractionMonitoring: !isDevelopment, // Disable in dev
    enableCustomMetrics: true,
    attributes: {
      environment: process.env.NODE_ENV || 'unknown',
      build_time: process.env.BUILD_TIME || new Date().toISOString(),
      git_commit: process.env.GIT_COMMIT || 'unknown'
    },
    excludedUrls: [
      /\/api\/health/,
      /\/api\/metrics/,
      /.*\.map$/,
      /chrome-extension:\/\//,
      /localhost:3000\/sockjs-node/ // Dev server
    ]
  }
}
```

### 3. Error Handling Strategy
```typescript
// ✅ Best: Structured error handling with context
class ErrorBoundary {
  constructor(private monitor: FrontendMonitorSDK) {}

  handle(error: Error, context: Record<string, any>): void {
    // Record error with full context
    this.monitor.recordError(error, {
      component: context.componentName,
      props: JSON.stringify(context.props),
      state: JSON.stringify(context.state),
      user_action: context.userAction,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      url: window.location.href
    })

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error details:', { error, context })
    }
  }
}
```

## React Best Practices

### 1. Hooks Integration
```typescript
// ✅ Best: Custom hook for monitoring
function useFrontendMonitor(config?: MonitorConfig) {
  const [monitor, setMonitor] = useState<FrontendMonitorSDK | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    let mounted = true

    const initializeMonitor = async () => {
      try {
        const monitorInstance = createFrontendMonitor()
        await monitorInstance.init(config || getDefaultConfig())

        if (mounted) {
          setMonitor(monitorInstance)
          setIsInitialized(true)
        }
      } catch (error) {
        console.error('Failed to initialize monitor:', error)
      }
    }

    initializeMonitor()

    return () => {
      mounted = false
      monitor?.destroy()
    }
  }, [])

  return { monitor, isInitialized }
}

// Usage in component
function App() {
  const { monitor, isInitialized } = useFrontendMonitor()

  if (!isInitialized) {
    return <div>Loading...</div>
  }

  return <Router>{/* App content */}</Router>
}
```

### 2. Component-Level Monitoring
```typescript
// ✅ Best: HOC for component monitoring
function withMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return function MonitoredComponent(props: P) {
    const { monitor } = useFrontendMonitor()
    const renderStartTime = useRef<number>()

    useEffect(() => {
      renderStartTime.current = performance.now()
    })

    useEffect(() => {
      if (monitor && renderStartTime.current) {
        const renderTime = performance.now() - renderStartTime.current
        monitor.getMetricsCollector().recordHistogram('component_render_ms', renderTime, {
          component_name: componentName
        })
      }
    })

    useEffect(() => {
      if (monitor) {
        monitor.recordUserInteraction({
          type: 'navigation',
          element: 'component',
          target: componentName,
          timestamp: Date.now()
        })
      }
    }, [])

    return <WrappedComponent {...props} />
  }
}

// Usage
const UserProfile = withMonitoring(({ userId }) => {
  // Component implementation
}, 'UserProfile')
```

### 3. Context Integration
```typescript
// ✅ Best: React Context for monitoring
interface MonitorContextValue {
  monitor: FrontendMonitorSDK | null
  recordUserAction: (action: string, details?: Record<string, any>) => void
  recordError: (error: Error, context?: Record<string, any>) => void
}

const MonitorContext = createContext<MonitorContextValue | null>(null)

export function MonitorProvider({ children, config }: {
  children: React.ReactNode
  config?: MonitorConfig
}) {
  const monitor = useFrontendMonitor(config)

  const recordUserAction = useCallback((action: string, details = {}) => {
    if (monitor.monitor) {
      monitor.monitor.recordUserInteraction({
        type: 'click',
        element: details.elementType || 'button',
        target: action,
        timestamp: Date.now(),
        ...details
      })
    }
  }, [monitor.monitor])

  const recordError = useCallback((error: Error, context = {}) => {
    if (monitor.monitor) {
      monitor.monitor.recordError(error, context)
    }
  }, [monitor.monitor])

  const value = useMemo(() => ({
    monitor: monitor.monitor,
    recordUserAction,
    recordError
  }), [monitor.monitor, recordUserAction, recordError])

  return (
    <MonitorContext.Provider value={value}>
      {children}
    </MonitorContext.Provider>
  )
}

export function useMonitorContext() {
  const context = useContext(MonitorContext)
  if (!context) {
    throw new Error('useMonitorContext must be used within MonitorProvider')
  }
  return context
}
```

### 4. Performance Monitoring in React
```typescript
// ✅ Best: Component performance monitoring
function usePerformanceMonitoring(componentName: string) {
  const { monitor } = useMonitorContext()
  const renderCount = useRef(0)

  useEffect(() => {
    renderCount.current += 1

    if (monitor) {
      monitor.getMetricsCollector().incrementCounter('component_renders_total', 1, {
        component_name: componentName,
        render_count: renderCount.current.toString()
      })
    }
  })

  const startOperationTiming = useCallback((operationName: string) => {
    if (!monitor) return () => {}

    const startTime = performance.now()
    return () => {
      const duration = performance.now() - startTime
      monitor!.getMetricsCollector().recordHistogram('component_operation_ms', duration, {
        component_name: componentName,
        operation_name: operationName
      })
    }
  }, [monitor, componentName])

  return { startOperationTiming }
}
```

## Vue.js Best Practices

### 1. Composition API Integration
```typescript
// ✅ Best: Vue 3 Composable for monitoring
function useFrontendMonitor(config?: MonitorConfig) {
  const monitor = ref<FrontendMonitorSDK | null>(null)
  const isInitialized = ref(false)

  const initializeMonitor = async () => {
    try {
      const monitorInstance = createFrontendMonitor()
      await monitorInstance.init(config || getDefaultConfig())
      monitor.value = monitorInstance
      isInitialized.value = true
    } catch (error) {
      console.error('Failed to initialize monitor:', error)
    }
  }

  onMounted(() => {
    initializeMonitor()
  })

  onUnmounted(() => {
    if (monitor.value) {
      monitor.value.destroy()
    }
  })

  const recordUserAction = (action: string, details: Record<string, any> = {}) => {
    if (monitor.value) {
      monitor.value.recordUserInteraction({
        type: 'click',
        element: details.elementType || 'button',
        target: action,
        timestamp: Date.now(),
        ...details
      })
    }
  }

  const recordError = (error: Error, context: Record<string, any> = {}) => {
    if (monitor.value) {
      monitor.value.recordError(error, context)
    }
  }

  return {
    monitor: readonly(monitor),
    isInitialized: readonly(isInitialized),
    recordUserAction,
    recordError
  }
}
```

### 2. Plugin Integration
```typescript
// ✅ Best: Vue Plugin for global monitoring
import { App, Plugin } from 'vue'

export const FrontendMonitorPlugin: Plugin = {
  install(app: App, config: MonitorConfig) {
    let monitorInstance: FrontendMonitorSDK | null = null

    const initializeMonitor = async () => {
      try {
        monitorInstance = createFrontendMonitor()
        await monitorInstance.init(config)

        app.config.globalProperties.$monitor = monitorInstance
        app.provide('monitor', monitorInstance)
      } catch (error) {
        console.error('Failed to initialize monitor:', error)
      }
    }

    initializeMonitor()

    // Error handling
    app.config.errorHandler = (error, instance, info) => {
      if (monitorInstance) {
        monitorInstance.recordError(error, {
          component_name: instance?.$options.__name || 'Unknown',
          error_info: info,
          vue_lifecycle: true
        })
      }
    }

    // Global properties
    app.config.globalProperties.$trackAction = (action: string, details?: any) => {
      if (monitorInstance) {
        monitorInstance.recordUserInteraction({
          type: 'click',
          element: 'vue_component',
          target: action,
          timestamp: Date.now(),
          ...details
        })
      }
    }

    app.config.globalProperties.$trackError = (error: Error, context?: any) => {
      if (monitorInstance) {
        monitorInstance.recordError(error, context)
      }
    }
  }
}

// Usage in main.ts
const app = createApp(App)
app.use(FrontendMonitorPlugin, {
  serviceName: 'vue-frontend-app',
  endpoint: 'https://your-collector.example.com',
  // ... other config
})
```

### 3. Component Monitoring
```vue
<!-- ✅ Best: Component with integrated monitoring -->
<template>
  <div class="user-profile">
    <h2>{{ user.name }}</h2>
    <button @click="handleEdit">Edit Profile</button>
    <button @click="handleLogout">Logout</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useFrontendMonitor } from '@/composables/useFrontendMonitor'

interface Props {
  userId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  edit: []
  logout: []
}>()

const { monitor, recordUserAction, recordError } = useFrontendMonitor()
const user = ref<User | null>(null)
const loading = ref(false)

onMounted(async () => {
  await loadUserProfile()
})

const loadUserProfile = async () => {
  if (!monitor.value) return

  const tracing = monitor.value.startTracing('load_user_profile', {
    attributes: { user_id: props.userId }
  })

  loading.value = true

  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))

    user.value = {
      id: props.userId,
      name: 'John Doe',
      email: 'john@example.com'
    }

    recordUserAction('profile_viewed', {
      userId: props.userId,
      elementType: 'component'
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Load failed'
    recordError(error instanceof Error ? error : new Error(errorMessage), {
      operation: 'load_user_profile',
      userId: props.userId
    })
  } finally {
    loading.value = false
    tracing.endSpan()
  }
}

const handleEdit = () => {
  recordUserAction('edit_profile', {
    elementType: 'button',
    userId: props.userId
  })
  emit('edit')
}

const handleLogout = () => {
  recordUserAction('logout', {
    elementType: 'button',
    userId: props.userId
  })
  emit('logout')
}
</script>
```

## Vanilla JavaScript Best Practices

### 1. Module Pattern
```typescript
// ✅ Best: Module-based monitoring integration
class FrontendMonitorManager {
  private monitor: FrontendMonitorSDK | null = null
  private config: MonitorConfig

  constructor(config: MonitorConfig) {
    this.config = config
    this.init()
  }

  private async init(): Promise<void> {
    try {
      this.monitor = createFrontendMonitor()
      await this.monitor.init(this.config)
      this.setupGlobalHandlers()
      console.log('✅ Frontend monitor initialized')
    } catch (error) {
      console.error('❌ Failed to initialize frontend monitor:', error)
    }
  }

  private setupGlobalHandlers(): void {
    if (!this.monitor) return

    // Global error handling
    window.addEventListener('error', (event) => {
      this.monitor?.recordError(event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message,
        source: 'global_error_handler'
      })
    })

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.monitor?.recordError(new Error(event.reason), {
        type: 'unhandled_promise_rejection',
        source: 'global_error_handler'
      })
    })

    // Performance monitoring
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            this.monitor?.recordMetrics({
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
              ttfb: navEntry.responseStart - navEntry.requestStart
            })
          }
        })
      })
      observer.observe({ entryTypes: ['navigation', 'paint'] })
    }
  }

  // Public API
  trackAction(action: string, details: Record<string, any> = {}): void {
    if (this.monitor) {
      this.monitor.recordUserInteraction({
        type: details.type || 'click',
        element: details.element || 'button',
        target: action,
        timestamp: Date.now(),
        ...details
      })
    }
  }

  trackError(error: Error, context: Record<string, any> = {}): void {
    if (this.monitor) {
      this.monitor.recordError(error, {
        source: 'manual_tracking',
        ...context
      })
    }
  }

  recordMetrics(metrics: Record<string, number>): void {
    if (this.monitor) {
      this.monitor.recordMetrics(metrics)
    }
  }

  async destroy(): Promise<void> {
    if (this.monitor) {
      await this.monitor.destroy()
      this.monitor = null
    }
  }
}

// Usage
const monitorManager = new FrontendMonitorManager({
  serviceName: 'vanilla-js-app',
  endpoint: 'https://your-collector.example.com',
  enablePerformanceMonitoring: true,
  enableErrorMonitoring: true,
  enableUserInteractionMonitoring: true
})

// Global functions for easy access
window.trackAction = (action: string, details?: any) => {
  monitorManager.trackAction(action, details)
}

window.trackError = (error: Error, context?: any) => {
  monitorManager.trackError(error, context)
}
```

### 2. Event Delegation
```javascript
// ✅ Best: Event delegation for automatic tracking
class EventTracker {
  constructor(private monitorManager: FrontendMonitorManager) {
    this.setupEventDelegation()
  }

  private setupEventDelegation(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const actionData = this.extractActionData(target)

      if (actionData) {
        this.monitorManager.trackAction(actionData.action, {
          elementType: target.tagName.toLowerCase(),
          elementId: target.id,
          elementClass: target.className,
          elementText: target.textContent?.substring(0, 50),
          ...actionData.details
        })
      }
    })

    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement
      this.monitorManager.trackAction('form_submit', {
        elementType: 'form',
        formId: form.id,
        formAction: form.action,
        formMethod: form.method
      })
    })

    document.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement
      if (target.type === 'select' || target.type === 'radio' || target.type === 'checkbox') {
        this.monitorManager.trackAction('input_change', {
          elementType: target.type,
          inputName: target.name,
          inputValue: target.value
        })
      }
    })
  }

  private extractActionData(element: HTMLElement): { action: string; details?: Record<string, any> } | null {
    // Check for data attributes
    const trackAction = element.getAttribute('data-track-action')
    if (trackAction) {
      const trackDetails = element.getAttribute('data-track-details')
      return {
        action: trackAction,
        details: trackDetails ? JSON.parse(trackDetails) : undefined
      }
    }

    // Check for button text
    if (element.tagName === 'BUTTON' && element.textContent) {
      return {
        action: element.textContent.trim().toLowerCase().replace(/\s+/g, '_')
      }
    }

    // Check for links
    if (element.tagName === 'A' && element.getAttribute('href')) {
      return {
        action: 'link_click',
        details: { href: element.getAttribute('href') }
      }
    }

    return null
  }
}

// Initialize event tracking
const eventTracker = new EventTracker(monitorManager)
```

## TypeScript Best Practices

### 1. Type-Safe Configuration
```typescript
// ✅ Best: Strongly typed configuration
interface TypedMonitorConfig extends MonitorConfig {
  service: {
    name: string
    version: string
    environment: 'development' | 'staging' | 'production'
  }
  features: {
    performance: boolean
    errors: boolean
    userInteractions: boolean
    customMetrics: boolean
    sessionTracking: boolean
  }
  thresholds: {
    errorRate: number
    responseTime: number
    memoryUsage: number
  }
}

const createTypedConfig = (overrides: Partial<TypedMonitorConfig> = {}): TypedMonitorConfig => ({
  service: {
    name: 'my-app',
    version: '1.0.0',
    environment: (process.env.NODE_ENV as any) || 'development'
  },
  features: {
    performance: true,
    errors: true,
    userInteractions: true,
    customMetrics: true,
    sessionTracking: true
  },
  thresholds: {
    errorRate: 0.05, // 5%
    responseTime: 2000, // 2 seconds
    memoryUsage: 50 // MB
  },
  ...overrides,
  serviceName: overrides.service?.name || 'my-app',
  serviceVersion: overrides.service?.version || '1.0.0',
  endpoint: overrides.endpoint || 'https://your-collector.example.com',
  enablePerformanceMonitoring: overrides.features?.performance ?? true,
  enableErrorMonitoring: overrides.features?.errors ?? true,
  enableUserInteractionMonitoring: overrides.features?.userInteractions ?? true,
  enableCustomMetrics: overrides.features?.customMetrics ?? true
})
```

### 2. Generic Monitoring Service
```typescript
// ✅ Best: Generic type-safe monitoring service
class TypedMonitoringService<TUser = any, TContext = any> {
  constructor(
    private monitor: FrontendMonitorSDK,
    private userContext?: TUser,
    private appContext?: TContext
  ) {}

  // Typed error recording
  recordError<TError extends Error>(
    error: TError,
    context?: Partial<TContext>
  ): void {
    this.monitor.recordError(error, {
      user_context: this.userContext ? JSON.stringify(this.userContext) : undefined,
      app_context: context ? JSON.stringify(context) : undefined,
      error_type: error.constructor.name,
      timestamp: new Date().toISOString()
    })
  }

  // Typed user interaction
  recordInteraction<TInteraction extends UserInteractionEvent>(
    interaction: TInteraction
  ): void {
    this.monitor.recordUserInteraction({
      ...interaction,
      user_context: this.userContext ? JSON.stringify(this.userContext) : undefined
    })
  }

  // Typed metrics with validation
  recordMetric<T extends Record<string, number | string>>(
    metrics: T
  ): void {
    // Validate metrics
    Object.entries(metrics).forEach(([key, value]) => {
      if (typeof value !== 'number' && typeof value !== 'string') {
        console.warn(`Invalid metric value for ${key}: expected number or string, got ${typeof value}`)
      }
    })

    this.monitor.recordMetrics(metrics)
  }

  // Type-safe tracing
  startTracing<TName extends string>(
    name: TName,
    options?: CustomSpanOptions
  ): TracingProvider {
    return this.monitor.startTracing(name, {
      ...options,
      attributes: {
        ...options?.attributes,
        user_context: this.userContext ? JSON.stringify(this.userContext) : undefined,
        app_context: this.appContext ? JSON.stringify(this.appContext) : undefined
      }
    })
  }

  // Update user context
  updateUserContext(user: TUser): void {
    this.userContext = user
    this.monitor.setAttributes({
      user_context: JSON.stringify(user)
    })
  }
}
```

## Performance Optimization

### 1. Sampling Strategies
```typescript
// ✅ Best: Intelligent sampling based on error rate and performance
class AdaptiveSampling {
  private errorCount = 0
  private totalRequests = 0
  private sampleRate = 1.0

  constructor(private monitor: FrontendMonitorSDK) {}

  shouldSample(): boolean {
    const shouldSample = Math.random() < this.sampleRate
    this.totalRequests++

    if (shouldSample) {
      this.updateSampleRate()
    }

    return shouldSample
  }

  recordError(): void {
    this.errorCount++
    this.updateSampleRate()
  }

  private updateSampleRate(): void {
    const errorRate = this.errorCount / this.totalRequests

    // Increase sampling if error rate is high
    if (errorRate > 0.1) { // 10% error rate
      this.sampleRate = Math.min(1.0, this.sampleRate * 1.2)
    }
    // Decrease sampling if error rate is low
    else if (errorRate < 0.01 && this.totalRequests > 100) { // 1% error rate
      this.sampleRate = Math.max(0.1, this.sampleRate * 0.9)
    }
  }
}
```

### 2. Batch Processing
```typescript
// ✅ Best: Batch metrics processing
class BatchMetricsCollector {
  private metricsQueue: Array<{
    type: 'counter' | 'histogram' | 'gauge'
    name: string
    value: number
    labels?: Record<string, string>
    timestamp: number
  }> = []
  private batchSize = 50
  private flushInterval = 5000 // 5 seconds

  constructor(private monitor: FrontendMonitorSDK) {
    this.setupBatchProcessing()
  }

  private setupBatchProcessing(): void {
    setInterval(() => {
      this.flush()
    }, this.flushInterval)

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush()
    })
  }

  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    this.addToQueue({
      type: 'counter',
      name,
      value,
      labels,
      timestamp: Date.now()
    })
  }

  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.addToQueue({
      type: 'histogram',
      name,
      value,
      labels,
      timestamp: Date.now()
    })
  }

  recordGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.addToQueue({
      type: 'gauge',
      name,
      value,
      labels,
      timestamp: Date.now()
    })
  }

  private addToQueue(metric: any): void {
    this.metricsQueue.push(metric)

    if (this.metricsQueue.length >= this.batchSize) {
      this.flush()
    }
  }

  private flush(): void {
    if (this.metricsQueue.length === 0) return

    const metrics = this.monitor.getMetricsCollector()

    // Process metrics in batches
    this.metricsQueue.forEach(metric => {
      switch (metric.type) {
        case 'counter':
          metrics.incrementCounter(metric.name, metric.value, metric.labels)
          break
        case 'histogram':
          metrics.recordHistogram(metric.name, metric.value, metric.labels)
          break
        case 'gauge':
          metrics.recordGauge(metric.name, metric.value, metric.labels)
          break
      }
    })

    this.metricsQueue = []
  }
}
```

## Error Handling Patterns

### 1. Centralized Error Handler
```typescript
// ✅ Best: Centralized error handling with categorization
class CentralizedErrorHandler {
  constructor(private monitor: FrontendMonitorSDK) {
    this.setupGlobalHandlers()
  }

  private setupGlobalHandlers(): void {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        type: 'javascript_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message
      })
    })

    // Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new Error(event.reason), {
        type: 'promise_rejection',
        reason: event.reason
      })
    })

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError(new Error('Resource loading failed'), {
          type: 'resource_error',
          element: (event.target as Element).tagName,
          source: (event.target as HTMLImageElement | HTMLScriptElement).src
        })
      }
    }, true)
  }

  private handleError(error: Error, context: Record<string, any>): void {
    // Categorize errors
    const errorCategory = this.categorizeError(error, context)

    // Record with full context
    this.monitor.recordError(error, {
      ...context,
      error_category: errorCategory,
      user_agent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      session_id: this.getSessionId(),
      build_version: process.env.APP_VERSION
    })

    // User-friendly error handling
    this.handleUserNotification(error, errorCategory)
  }

  private categorizeError(error: Error, context: Record<string, any>): string {
    if (context.type === 'resource_error') return 'resource'
    if (context.type === 'promise_rejection') return 'async'
    if (error.name === 'NetworkError') return 'network'
    if (error.message.includes('permission')) return 'permission'
    if (error.message.includes('authentication')) return 'auth'
    return 'application'
  }

  private handleUserNotification(error: Error, category: string): void {
    // Show user-friendly messages based on error category
    switch (category) {
      case 'network':
        this.showUserMessage('Network error. Please check your connection.', 'warning')
        break
      case 'auth':
        this.showUserMessage('Authentication required. Please log in again.', 'error')
        break
      case 'permission':
        this.showUserMessage('Permission denied for this action.', 'error')
        break
      default:
        this.showUserMessage('An unexpected error occurred.', 'error')
    }
  }

  private showUserMessage(message: string, type: 'error' | 'warning' | 'info'): void {
    // Implementation depends on your UI framework
    console.log(`[${type.toUpperCase()}] ${message}`)
  }

  private getSessionId(): string {
    // Generate or retrieve session ID
    let sessionId = sessionStorage.getItem('monitor_session_id')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem('monitor_session_id', sessionId)
    }
    return sessionId
  }
}
```

## Testing Considerations

### 1. Mock Monitor for Testing
```typescript
// ✅ Best: Mock monitor for unit testing
export class MockFrontendMonitorSDK implements FrontendMonitorSDK {
  private errors: Error[] = []
  private interactions: UserInteractionEvent[] = []
  private metrics: Record<string, any> = {}

  async init(config: MonitorConfig): Promise<void> {
    console.log('Mock monitor initialized with config:', config)
  }

  startTracing(name: string, options?: CustomSpanOptions): TracingProvider {
    return new MockTracingProvider(name)
  }

  recordError(error: Error, context?: Record<string, any>): void {
    this.errors.push({ ...error, context })
  }

  recordMetrics(metrics: Partial<any>): void {
    this.metrics = { ...this.metrics, ...metrics }
  }

  recordUserInteraction(event: UserInteractionEvent): void {
    this.interactions.push(event)
  }

  getMetricsCollector(): MetricsCollector {
    return new MockMetricsCollector()
  }

  getTraceManager(): any {
    return new MockTraceManager()
  }

  setAttributes(attributes: Record<string, string>): void {
    console.log('Mock attributes set:', attributes)
  }

  async destroy(): Promise<void> {
    console.log('Mock monitor destroyed')
  }

  // Test helpers
  getRecordedErrors(): Error[] {
    return this.errors
  }

  getRecordedInteractions(): UserInteractionEvent[] {
    return this.interactions
  }

  getRecordedMetrics(): Record<string, any> {
    return this.metrics
  }

  reset(): void {
    this.errors = []
    this.interactions = []
    this.metrics = {}
  }
}

// Usage in tests
describe('MyComponent', () => {
  let mockMonitor: MockFrontendMonitorSDK

  beforeEach(() => {
    mockMonitor = new MockFrontendMonitorSDK()
  })

  it('should record user interactions', () => {
    const component = new MyComponent(mockMonitor)
    component.handleClick()

    const interactions = mockMonitor.getRecordedInteractions()
    expect(interactions).toHaveLength(1)
    expect(interactions[0].target).toBe('button')
  })

  it('should record errors', () => {
    const component = new MyComponent(mockMonitor)
    component.simulateError()

    const errors = mockMonitor.getRecordedErrors()
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toBe('Test error')
  })
})
```

### 2. Integration Testing
```typescript
// ✅ Best: Integration testing with real monitor
describe('Monitoring Integration', () => {
  let monitor: FrontendMonitorSDK
  let testEndpoint: string

  beforeAll(async () => {
    // Setup test collector endpoint
    testEndpoint = 'http://localhost:4318/test'

    monitor = createFrontendMonitor()
    await monitor.init({
      serviceName: 'test-app',
      endpoint: testEndpoint,
      sampleRate: 1.0,
      enablePerformanceMonitoring: true,
      enableErrorMonitoring: true,
      enableUserInteractionMonitoring: true
    })
  })

  afterAll(async () => {
    await monitor.destroy()
  })

  it('should send metrics to collector', async () => {
    // Perform some actions
    monitor.recordUserInteraction({
      type: 'click',
      element: 'button',
      target: 'test-button',
      timestamp: Date.now()
    })

    monitor.recordError(new Error('Test error'), {
      test: 'integration'
    })

    // Wait for metrics to be sent
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Verify metrics were sent (implementation depends on your collector)
    // This is just an example - actual implementation will vary
    const metrics = await fetchMetricsFromCollector(testEndpoint)
    expect(metrics).toContainEqual(
      expect.objectContaining({
        name: 'test-button',
        type: 'click'
      })
    )
  })
})
```

## Deployment Guidelines

### 1. Environment Configuration
```typescript
// ✅ Best: Environment-specific deployment configurations
const getProductionConfig = (): MonitorConfig => ({
  serviceName: process.env.SERVICE_NAME || 'frontend-app',
  serviceVersion: process.env.BUILD_VERSION || '1.0.0',
  endpoint: process.env.MONITOR_ENDPOINT || 'https://prod-collector.example.com',
  apiKey: process.env.MONITOR_API_KEY,
  sampleRate: parseFloat(process.env.MONITOR_SAMPLE_RATE || '0.1'),
  enablePerformanceMonitoring: true,
  enableErrorMonitoring: true,
  enableUserInteractionMonitoring: true,
  enableCustomMetrics: true,
  attributes: {
    environment: 'production',
    build_number: process.env.BUILD_NUMBER || 'unknown',
    deploy_time: new Date().toISOString(),
    git_commit: process.env.GIT_COMMIT || 'unknown',
    cdn_version: process.env.CDN_VERSION || 'unknown'
  },
  excludedUrls: [
    /\/api\/health/,
    /\/api\/metrics/,
    /.*\.map$/,
    /chrome-extension:\/\//,
    /\/analytics\/.*/
  ]
})

const getStagingConfig = (): MonitorConfig => ({
  ...getProductionConfig(),
  endpoint: process.env.STAGING_MONITOR_ENDPOINT || 'https://staging-collector.example.com',
  sampleRate: parseFloat(process.env.STAGING_MONITOR_SAMPLE_RATE || '0.5'),
  attributes: {
    ...getProductionConfig().attributes,
    environment: 'staging'
  }
})

const getDevelopmentConfig = (): MonitorConfig => ({
  ...getProductionConfig(),
  endpoint: process.env.DEV_MONITOR_ENDPOINT || 'http://localhost:4318',
  sampleRate: 1.0,
  enableUserInteractionMonitoring: false, // Disable in development
  attributes: {
    ...getProductionConfig().attributes,
    environment: 'development'
  }
})

export const getConfig = (): MonitorConfig => {
  const env = process.env.NODE_ENV || 'development'

  switch (env) {
    case 'production':
      return getProductionConfig()
    case 'staging':
      return getStagingConfig()
    default:
      return getDevelopmentConfig()
  }
}
```

### 2. Build-time Optimization
```javascript
// webpack.config.js or similar build configuration
module.exports = {
  // ... other config
  plugins: [
    // Conditional monitoring imports
    new webpack.DefinePlugin({
      'process.env.ENABLE_MONITORING': JSON.stringify(
        process.env.NODE_ENV === 'production' || process.env.ENABLE_MONITORING === 'true'
      )
    })
  ],
  optimization: {
    // Tree shaking for monitoring code
    usedExports: true,
    sideEffects: false
  }
}

// In your code
const enableMonitoring = process.env.ENABLE_MONITORING === 'true'

let monitor: FrontendMonitorSDK | null = null

if (enableMonitoring) {
  monitor = createFrontendMonitor()
  // Initialize monitor...
}
```

This comprehensive guide provides best practices for integrating the Frontend Monitor SDK across different frameworks and environments. Following these patterns will ensure reliable, performant, and maintainable monitoring implementations.