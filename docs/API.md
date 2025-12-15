# Frontend Monitor SDK API Documentation

## Overview

The Frontend Monitor SDK is a comprehensive monitoring solution built on OpenTelemetry that provides real-time insights into your web application's performance, user interactions, and error patterns. This document provides complete API reference and integration guidance.

## Quick Start

### Installation

```bash
npm install frontend-monitor-sdk
# or
yarn add frontend-monitor-sdk
```

### Basic Usage

```typescript
import { createFrontendMonitor } from 'frontend-monitor-sdk';

// Create SDK instance
const monitor = createFrontendMonitor();

// Initialize with configuration
await monitor.init({
  serviceName: 'my-web-app',
  endpoint: 'https://your-otel-collector.example.com',
  serviceVersion: '1.0.0',
  enablePerformanceMonitoring: true,
  enableErrorMonitoring: true,
  enableUserInteractionMonitoring: true
});

// Your app is now being monitored!
```

## Core API Reference

### createFrontendMonitor()

Creates a new instance of the Frontend Monitor SDK.

```typescript
function createFrontendMonitor(): FrontendMonitorSDK
```

**Returns**: A new `FrontendMonitorSDK` instance

**Example**:
```typescript
import { createFrontendMonitor, VERSION } from 'frontend-monitor-sdk';

console.log(`SDK Version: ${VERSION}`); // "1.0.0"
const monitor = createFrontendMonitor();
```

### FrontendMonitorSDK Interface

The main SDK interface that provides all monitoring functionality.

#### Methods

##### `init(config: MonitorConfig): Promise<void>`

Initializes the SDK with the provided configuration. Must be called before using other methods.

**Parameters**:
- `config` - Configuration object (see [MonitorConfig](#monitorconfig))

**Example**:
```typescript
await monitor.init({
  serviceName: 'my-app',
  endpoint: 'https://otel.example.com',
  serviceVersion: '2.1.0',
  sampleRate: 0.1, // 10% sampling
  enableRouteMonitoring: true,
  attributes: {
    environment: 'production',
    region: 'us-west-2'
  }
});
```

##### `startTracing(name: string, options?: CustomSpanOptions): TracingProvider`

Starts a new custom trace span for monitoring specific operations.

**Parameters**:
- `name` - Name of the trace span
- `options` - Optional span configuration

**Returns**: `TracingProvider` instance for controlling the span

**Example**:
```typescript
// Start a custom trace
const tracer = monitor.startTracing('user_login', {
  kind: SpanKind.CLIENT,
  attributes: {
    'user.id': userId,
    'login.method': 'email'
  }
});

// Your login logic here
try {
  await performLogin();
  tracer.endSpan();
} catch (error) {
  tracer.recordError(error);
  tracer.endSpan(SpanStatusCode.ERROR);
}
```

##### `recordError(error: Error | string, context?: Record<string, any>): void`

Records an error with optional context information.

**Parameters**:
- `error` - Error object or error message string
- `context` - Additional context information

**Example**:
```typescript
try {
  await riskyOperation();
} catch (error) {
  monitor.recordError(error, {
    'operation.name': 'data_processing',
    'user.id': getCurrentUserId(),
    'retry.count': 3
  });
}

// Also accepts string errors
monitor.recordError('Network timeout occurred', {
  timeout: 5000,
  endpoint: '/api/users'
});
```

##### `recordUserInteraction(event: UserInteractionEvent): void`

Records user interaction events for behavioral analytics.

**Parameters**:
- `event` - User interaction event details

**Example**:
```typescript
// Record button click
monitor.recordUserInteraction({
  type: 'click',
  element: 'button',
  target: 'submit-button',
  timestamp: Date.now(),
  value: 'form_submit'
});

// Record navigation
monitor.recordUserInteraction({
  type: 'navigation',
  timestamp: Date.now(),
  duration: 1200,
  value: {
    from: '/dashboard',
    to: '/profile'
  }
});
```

##### `setUser(userInfo: UserInfo): void`

Sets user context for all subsequent monitoring data.

**Parameters**:
- `userInfo` - User information object

**Example**:
```typescript
monitor.setUser({
  id: 'user_12345',
  name: 'John Doe',
  email: 'john@example.com',
  plan: 'premium',
  role: 'admin',
  customField: 'custom_value'
});
```

##### `updateUser(userInfo: Partial<UserInfo>): void`

Updates user context with partial information.

**Example**:
```typescript
monitor.updateUser({
  plan: 'enterprise',
  lastLogin: new Date().toISOString()
});
```

##### `clearUser(): void`

Clears all user context information.

```typescript
// On logout
monitor.clearUser();
```

##### `getCurrentUser(): UserInfo | null`

Gets the current user context.

**Returns**: Current user information or null if not set

##### `getMetricsCollector(): MetricsCollector`

Returns a metrics collector for custom metrics.

**Returns**: `MetricsCollector` instance

**Example**:
```typescript
const metrics = monitor.getMetricsCollector();

// Counter metrics
metrics.incrementCounter('api_calls', 1, {
  endpoint: '/api/users',
  method: 'GET'
});

// Histogram metrics
metrics.recordHistogram('response_time_ms', 250, {
  endpoint: '/api/users'
});

// Gauge metrics
metrics.recordGauge('active_connections', 42);
```

## Configuration Reference

### MonitorConfig Interface

Complete configuration options for SDK initialization.

```typescript
interface MonitorConfig {
  // Required
  serviceName: string;
  endpoint: string;

  // Optional with defaults
  serviceVersion?: string;
  sampleRate?: number; // Default: 1.0
  exportIntervalMillis?: number; // Default: 30000

  // Feature flags (all default to true)
  enablePerformanceMonitoring?: boolean;
  enableErrorMonitoring?: boolean;
  enableUserInteractionMonitoring?: boolean;
  enableAutoTracing?: boolean;
  enablePerformanceMetrics?: boolean;
  enableCustomMetrics?: boolean;
  enableRouteMonitoring?: boolean; // Default: false

  // Advanced configuration
  attributes?: Record<string, string>;
  excludedUrls?: string[];
  propagateTraceHeaderCorsUrls?: string[];
  routeMonitoringConfig?: RouteMonitoringConfig;
}
```

#### Configuration Examples

**Minimal Configuration**:
```typescript
await monitor.init({
  serviceName: 'my-app',
  endpoint: 'https://otel.example.com'
});
```

**Production Configuration**:
```typescript
await monitor.init({
  serviceName: 'production-app',
  endpoint: 'https://otel-collector.company.com',
  serviceVersion: '2.1.0',
  sampleRate: 0.1, // 10% sampling for production
  exportIntervalMillis: 60000, // Export every minute
  enablePerformanceMonitoring: true,
  enableErrorMonitoring: true,
  enableUserInteractionMonitoring: false, // Disable for privacy
  enableRouteMonitoring: true,
  attributes: {
    environment: 'production',
    datacenter: 'us-west-2',
    version: '2.1.0'
  },
  excludedUrls: [
    '/health',
    '/status',
    '/api/analytics' // Don't trace analytics calls
  ],
  routeMonitoringConfig: {
    hashRouting: true,
    historyAPI: true,
    parseParams: true,
    parseQuery: true,
    ignoredPaths: ['/health', '/status']
  }
});
```

## Data Types Reference

### UserInfo Interface

```typescript
interface UserInfo {
  id: string;           // Required - Unique user identifier
  name?: string;        // Optional - User's display name
  email?: string;       // Optional - User's email
  plan?: string;        // Optional - Subscription plan
  role?: string;        // Optional - User role
  [key: string]: any;   // Optional - Custom fields
}
```

### UserInteractionEvent Interface

```typescript
interface UserInteractionEvent {
  type: 'click' | 'scroll' | 'input' | 'navigation';
  element?: string;      // HTML element type (button, input, etc.)
  target?: string;       // Element ID, class, or identifier
  timestamp: number;     // Unix timestamp in milliseconds
  duration?: number;     // Duration in milliseconds
  value?: any;          // Additional interaction data
}
```

### CustomSpanOptions Interface

```typescript
interface CustomSpanOptions {
  name: string;
  kind?: SpanKind;      // CLIENT, SERVER, INTERNAL, etc.
  attributes?: SpanAttributes;
  startTime?: number;    // Custom start timestamp
}
```

### RouteChangeEvent Interface

```typescript
interface RouteChangeEvent {
  type: 'hash' | 'popstate' | 'pushstate' | 'replacestate' | 'load';
  from: string;         // Source path
  to: string;          // Destination path
  timestamp: number;    // When the change occurred
  duration?: number;    // Time taken for navigation
  params?: Record<string, string>;     // Route parameters
  query?: Record<string, string>;      // Query parameters
  title?: string;       // Page title after navigation
  state?: any;         // History API state
  isSPA?: boolean;     // Whether this is an SPA navigation
}
```

### RouteMonitoringConfig Interface

```typescript
interface RouteMonitoringConfig {
  enabled?: boolean;
  hashRouting?: boolean;     // Monitor hash routes (#/path)
  historyAPI?: boolean;      // Monitor History API
  popstate?: boolean;        // Monitor popstate events
  parseParams?: boolean;     // Parse route parameters
  parseQuery?: boolean;      // Parse query parameters
  ignoredPaths?: string[];   // Paths to ignore
  exportIntervalMillis?: number;
  customRouteMatcher?: (path: string) => {
    params?: Record<string, string>;
    query?: Record<string, string>;
  };
}
```

## Advanced Usage Patterns

### Custom Metrics Collection

```typescript
import { createFrontendMonitor } from 'frontend-monitor-sdk';

const monitor = createFrontendMonitor();
await monitor.init(config);

const metrics = monitor.getMetricsCollector();

// Business metrics
metrics.incrementCounter('orders_completed', 1, {
  payment_method: 'credit_card',
  currency: 'USD'
});

// Performance metrics
metrics.recordHistogram('api_response_time', responseTime, {
  endpoint: '/api/orders',
  method: 'POST'
});

// State metrics
metrics.recordGauge('active_users_count', activeUsersCount);

// Custom events
metrics.incrementCounter('feature_usage', 1, {
  feature_name: 'advanced_search',
  user_plan: 'premium'
});
```

### Error Boundary Integration

```typescript
import React from 'react';
import { monitor } from './monitoring';

class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    monitor.recordError(error, {
      component_stack: errorInfo.componentStack,
      error_boundary: true,
      user_agent: navigator.userAgent
    });
  }

  render() {
    return this.props.children;
  }
}
```

### Route Monitoring with React Router

```typescript
import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { monitor } from './monitoring';

function RouteTracker() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    const routeChangeEvent = {
      type: navigationType === 'POP' ? 'popstate' : 'pushstate',
      from: location.pathname,
      to: location.pathname,
      timestamp: Date.now(),
      isSPA: true
    };

    monitor.recordRouteChange(routeChangeEvent);
  }, [location, navigationType]);

  return null;
}
```

### Performance Monitoring

```typescript
// Manual performance recording
const startTime = performance.now();

await performExpensiveOperation();

const duration = performance.now() - startTime;
monitor.recordUserInteraction({
  type: 'navigation',
  element: 'operation',
  target: 'expensive_operation',
  timestamp: Date.now(),
  duration
});

// Custom performance metrics
const metrics = monitor.getMetricsCollector();
metrics.recordHistogram('custom_operation_duration', duration, {
  operation_name: 'data_processing',
  success: 'true'
});
```

## Framework Integration Examples

### Next.js Integration

```typescript
// pages/_app.tsx
import { useEffect } from 'react';
import { createFrontendMonitor } from 'frontend-monitor-sdk';

const monitor = createFrontendMonitor();

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    monitor.init({
      serviceName: 'nextjs-app',
      endpoint: process.env.NEXT_PUBLIC_OTEL_ENDPOINT!,
      serviceVersion: process.env.NEXT_PUBLIC_VERSION,
      enableRouteMonitoring: true
    });

    // Set user context if available
    if (pageProps.user) {
      monitor.setUser(pageProps.user);
    }

    return () => {
      monitor.destroy();
    };
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
```

### Vue.js Integration

```typescript
// src/main.ts
import { createApp } from 'vue';
import { createRouter } from 'vue-router';
import { createFrontendMonitor } from 'frontend-monitor-sdk';

const monitor = createFrontendMonitor();

monitor.init({
  serviceName: 'vue-app',
  endpoint: process.env.VUE_OTEL_ENDPOINT,
  enableRouteMonitoring: true
});

const router = createRouter({
  // ... router config
});

// Track route changes
router.afterEach((to, from) => {
  monitor.recordRouteChange({
    type: 'pushstate',
    from: from.path,
    to: to.path,
    timestamp: Date.now(),
    isSPA: true
  });
});

const app = createApp(App);
app.use(router);
app.mount('#app');
```

### Angular Integration

```typescript
// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { createFrontendMonitor } from 'frontend-monitor-sdk';

const monitor = createFrontendMonitor();

@NgModule({
  // ...
})
export class AppModule {
  constructor(private router: Router) {
    this.initMonitoring();
  }

  private async initMonitoring() {
    await monitor.init({
      serviceName: 'angular-app',
      endpoint: process.env['NG_APP_OTEL_ENDPOINT'],
      enableRouteMonitoring: true
    });

    // Track navigation
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        monitor.recordRouteChange({
          type: 'pushstate',
          from: event.urlAfterRedirects,
          to: event.url,
          timestamp: Date.now(),
          isSPA: true
        });
      }
    });
  }
}
```

## Troubleshooting Guide

### Common Issues

#### 1. Build/Import Errors

**Issue**: Cannot find module exports
```typescript
// ❌ Incorrect
import { FrontendMonitorSDK } from 'frontend-monitor-sdk';

// ✅ Correct
import { createFrontendMonitor } from 'frontend-monitor-sdk';
```

#### 2. Missing Data

**Issue**: No monitoring data appears in your backend

**Checklist**:
- Verify `endpoint` configuration is correct
- Check network tab for failed requests to OTLP endpoint
- Ensure `sampleRate` is not too low
- Verify CORS configuration allows requests to your endpoint

```typescript
// Debug: Check SDK status
console.log('SDK Initialized:', !!monitor.getCurrentUser());
console.log('User Context:', monitor.getCurrentUser());
```

#### 3. Performance Issues

**Issue**: SDK impacts application performance

**Solutions**:
- Reduce `sampleRate` for production (e.g., 0.1 for 10% sampling)
- Increase `exportIntervalMillis` to reduce export frequency
- Disable unnecessary features:
```typescript
await monitor.init({
  serviceName: 'my-app',
  endpoint: 'https://otel.example.com',
  enableUserInteractionMonitoring: false, // Disable if not needed
  enableAutoTracing: false, // Disable network tracing
  sampleRate: 0.05, // 5% sampling
  exportIntervalMillis: 60000 // Export every minute
});
```

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
// Enable OpenTelemetry debug
localStorage.setItem('debug', 'otel*');

// Check SDK initialization status
const monitor = createFrontendMonitor();
await monitor.init(config);

// Verify everything is working
console.log('User context:', monitor.getCurrentUser());
console.log('Current route:', monitor.getCurrentRoute());
```

### Network Debugging

Monitor outgoing requests in your browser's network tab:

1. Look for requests to your OTLP endpoint
2. Check for CORS errors
3. Verify request payloads contain trace data
4. Check response status codes

Expected requests:
- `POST /v1/traces` - Trace data
- `POST /v1/metrics` - Metrics data

## Best Practices

### 1. Configuration

**Development**:
```typescript
await monitor.init({
  serviceName: 'my-app-dev',
  endpoint: 'http://localhost:4318',
  sampleRate: 1.0, // 100% sampling for debugging
  enablePerformanceMonitoring: true,
  enableErrorMonitoring: true,
  enableUserInteractionMonitoring: true,
  enableAutoTracing: true
});
```

**Production**:
```typescript
await monitor.init({
  serviceName: 'my-app',
  endpoint: 'https://otel.company.com',
  sampleRate: 0.1, // 10% sampling to reduce costs
  exportIntervalMillis: 30000, // 30 seconds
  enablePerformanceMonitoring: true,
  enableErrorMonitoring: true,
  enableUserInteractionMonitoring: false, // Privacy compliance
  enableAutoTracing: true,
  attributes: {
    environment: 'production',
    version: process.env.APP_VERSION
  }
});
```

### 2. Error Handling

Always wrap SDK operations in try-catch blocks:

```typescript
try {
  await monitor.init(config);
} catch (error) {
  console.error('Failed to initialize monitoring:', error);
  // Fallback to local monitoring or continue without monitoring
}

try {
  monitor.recordError(appError, context);
} catch (error) {
  console.error('Failed to record error:', error);
}
```

### 3. User Privacy

Be mindful of privacy regulations:

```typescript
// Don't record sensitive user interactions
monitor.recordUserInteraction({
  type: 'click',
  element: 'button',
  target: 'login-button', // ✅ Non-identifying
  timestamp: Date.now()
  // ❌ Avoid recording passwords, PII, etc.
});

// Use non-identifying user IDs
monitor.setUser({
  id: 'user_hash_abc123', // ✅ Hashed or UUID
  plan: 'premium',
  // ❌ Avoid real emails, names, etc.
});
```

### 4. Performance Optimization

- Use appropriate sampling rates
- Set reasonable export intervals
- Monitor SDK overhead
- Disable unused features

### 5. Resource Management

Always clean up resources:

```typescript
// In React
useEffect(() => {
  const monitor = createFrontendMonitor();
  monitor.init(config);

  return () => {
    monitor.destroy(); // Cleanup resources
  };
}, []);

// In SPAs before page unload
window.addEventListener('beforeunload', () => {
  monitor.destroy();
});
```

## API Reference Summary

### Functions
- `createFrontendMonitor()` - Creates SDK instance
- `VERSION` - SDK version string

### FrontendMonitorSDK Methods
- `init(config)` - Initialize SDK
- `startTracing(name, options)` - Start custom trace
- `recordError(error, context)` - Record error
- `recordUserInteraction(event)` - Record user action
- `setUser(userInfo)` - Set user context
- `updateUser(userInfo)` - Update user context
- `clearUser()` - Clear user context
- `getCurrentUser()` - Get current user
- `getMetricsCollector()` - Get metrics collector
- `recordRouteChange(event)` - Record route change
- `getCurrentRoute()` - Get current route info
- `destroy()` - Cleanup resources

### MetricsCollector Methods
- `incrementCounter(name, value, labels)` - Increment counter
- `recordHistogram(name, value, labels)` - Record histogram value
- `recordGauge(name, value, labels)` - Set gauge value

### Classes Available for Advanced Usage
- `TraceManager` - Advanced tracing operations
- `PerformanceCollector` - Performance metrics collection
- `CustomMetricsCollector` - Custom metrics operations

---

For more advanced usage examples and integration patterns, see the [examples directory](./examples/) in the SDK repository.