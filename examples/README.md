# Frontend Monitor SDK Examples

This directory contains comprehensive examples demonstrating how to use the Frontend Monitor SDK across different frameworks and use cases.

## 📁 Example Files

### Framework-Specific Examples

| Example | Framework | Description | Key Features |
|---------|-----------|-------------|--------------|
| [`vue3-app.vue`](./vue3-app.vue) | Vue 3 | Complete Vue 3 + Composition API application | Reactive state management, performance dashboard, custom metrics |
| [`react-hooks-app.tsx`](./react-hooks-app.tsx) | React | Modern React with custom hooks | Custom hooks, separation of concerns, type-safe monitoring |
| [`vanilla-js-enhanced.html`](./vanilla-js-enhanced.html) | Vanilla JS | Enhanced standalone HTML application | Modern UI, real-time monitoring, no framework dependencies |
| [`typescript-safe-example.ts`](./typescript-safe-example.ts) | TypeScript | Type-safe monitoring integration | Strong typing, error handling, comprehensive monitoring patterns |

### Documentation & Guides

| File | Purpose | Content |
|------|---------|---------|
| [`FRAMEWORK_BEST_PRACTICES.md`](./FRAMEWORK_BEST_PRACTICES.md) | Best Practices | Framework-specific guidelines and patterns |
| [`PROJECT_INTEGRATION_GUIDE.md`](./PROJECT_INTEGRATION_GUIDE.md) | Integration Guide | Complete project setup with CI/CD, deployment, and monitoring stack |

## 🚀 Quick Start

### 1. Vue 3 Example
```bash
# Open the Vue example in your browser
open vue3-app.vue
```
Features:
- ✅ Vue 3 Composition API with `<script setup>`
- ✅ Reactive performance metrics display
- ✅ User authentication flow monitoring
- ✅ Custom metrics recording
- ✅ Error handling and tracking

### 2. React Hooks Example
```bash
# The React example can be integrated into any React project
cp react-hooks-app.tsx your-project/src/
```
Features:
- ✅ Custom React hooks (`useFrontendMonitor`, `useUserManagement`, etc.)
- ✅ TypeScript support with strict typing
- ✅ Component lifecycle monitoring
- ✅ Performance tracking with hooks

### 3. Vanilla JavaScript Example
```bash
# Open directly in browser (no build required)
open vanilla-js-enhanced.html
```
Features:
- ✅ Standalone HTML with embedded monitoring
- ✅ Modern UI with responsive design
- ✅ Real-time metrics dashboard
- ✅ Session monitoring and statistics

### 4. TypeScript Example
```bash
# Import into your TypeScript project
import { TypedMonitoredApplication } from './typescript-safe-example'
```
Features:
- ✅ Strict TypeScript typing throughout
- ✅ Type-safe configuration and APIs
- ✅ Generic monitoring service
- ✅ Comprehensive error handling

## 📊 Key Monitoring Features Demonstrated

### Performance Monitoring
- **Core Web Vitals**: FCP, LCP, FID, CLS, TTFB
- **Custom Metrics**: Response times, memory usage, network latency
- **Resource Monitoring**: Asset loading, API performance

### Error Tracking
- **Global Error Handlers**: JavaScript errors, unhandled promises
- **Contextual Errors**: Component-specific error tracking
- **Error Categorization**: Network, authentication, permission errors

### User Interaction Monitoring
- **Click Tracking**: Button clicks, link interactions
- **Form Monitoring**: Submissions, validation errors
- **Navigation Tracking**: Page views, route changes

### Custom Metrics
- **Business Metrics**: User actions, feature usage
- **Application Metrics**: Active users, session duration
- **Performance Metrics**: Component render times, API latency

## 🛠️ Integration Patterns

### 1. Basic Setup
```typescript
import { createFrontendMonitor } from '../src/index'

const monitor = createFrontendMonitor()
await monitor.init({
  serviceName: 'my-app',
  endpoint: 'https://your-collector.example.com',
  enablePerformanceMonitoring: true,
  enableErrorMonitoring: true,
  enableUserInteractionMonitoring: true
})
```

### 2. Framework Integration
Each example demonstrates framework-specific patterns:
- **Vue**: Composables, plugin integration, lifecycle hooks
- **React**: Custom hooks, context providers, error boundaries
- **Vanilla JS**: Module patterns, event delegation, global handlers
- **TypeScript**: Generic services, type-safe configurations

### 3. Advanced Features
- **Batch Processing**: Efficient metric collection
- **Adaptive Sampling**: Intelligent rate limiting
- **Session Tracking**: User journey monitoring
- **Health Checks**: System status monitoring

## 📋 Monitoring Checklist

### ✅ Initialization
- [ ] Configure service name and version
- [ ] Set up collector endpoint
- [ ] Configure sampling rate
- [ ] Enable required monitoring features
- [ ] Set up error handlers

### ✅ Performance Monitoring
- [ ] Track Core Web Vitals
- [ ] Monitor API response times
- [ ] Track component render performance
- [ ] Monitor memory usage
- [ ] Set performance thresholds

### ✅ Error Monitoring
- [ ] Set up global error handlers
- [ ] Track unhandled promise rejections
- [ ] Monitor resource loading errors
- [ ] Categorize and prioritize errors
- [ ] Set up error alerts

### ✅ User Tracking
- [ ] Monitor page views
- [ ] Track user interactions
- [ ] Monitor form submissions
- [ ] Track feature usage
- [ ] Respect privacy settings

### ✅ Custom Metrics
- [ ] Define business-relevant metrics
- [ ] Track user engagement
- [ ] Monitor application health
- [ ] Set up custom dashboards
- [ ] Configure alerts

## 🏗️ Production Deployment

### 1. Environment Configuration
```typescript
const config = {
  serviceName: 'my-app',
  endpoint: process.env.MONITOR_ENDPOINT,
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enablePerformanceMonitoring: true,
  enableErrorMonitoring: true,
  enableUserInteractionMonitoring: process.env.NODE_ENV !== 'development'
}
```

### 2. Build Integration
- Tree-shaking for monitoring code
- Environment-specific configurations
- Build-time metadata injection
- Bundle optimization

### 3. CI/CD Pipeline
- Automated testing of monitoring
- Deployment event tracking
- Health checks and verification
- Monitoring dashboard updates

## 🔍 Troubleshooting

### Common Issues
1. **SDK not initializing**: Check configuration and network connectivity
2. **Metrics not appearing**: Verify collector endpoint and API keys
3. **High performance impact**: Reduce sample rate or disable features
4. **Missing errors**: Check error handler setup and filtering rules

### Debug Tools
- Health check endpoints
- Debug panel component
- Browser console logging
- Network request inspection

## 📚 Additional Resources

- [FRAMEWORK_BEST_PRACTICES.md](./FRAMEWORK_BEST_PRACTICES.md) - Detailed best practices
- [PROJECT_INTEGRATION_GUIDE.md](./PROJECT_INTEGRATION_GUIDE.md) - Complete integration guide
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/) - Core concepts
- [Frontend Performance Guide](https://web.dev/performance/) - Performance optimization

## 🤝 Contributing

Have an idea for a new example or improvement? Feel free to:
1. Create a new example file
2. Update this README
3. Follow the existing patterns and style
4. Add comprehensive documentation

## 📄 License

These examples are part of the Frontend Monitor SDK project. See the main project license for details.