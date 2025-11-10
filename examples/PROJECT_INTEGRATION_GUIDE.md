# Frontend Monitor SDK - Complete Project Integration Guide

This guide demonstrates how to integrate the Frontend Monitor SDK into a complete frontend project with proper configuration, build setup, and deployment strategies.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Installation & Setup](#installation--setup)
3. [Configuration Management](#configuration-management)
4. [Build Integration](#build-integration)
5. [Environment Setup](#environment-setup)
6. [CI/CD Integration](#cicd-integration)
7. [Monitoring Dashboard](#monitoring-dashboard)
8. [Troubleshooting](#troubleshooting)

## Project Structure

```
my-frontend-app/
├── src/
│   ├── core/
│   │   ├── monitoring/
│   │   │   ├── index.ts                 # Monitor initialization
│   │   │   ├── config.ts                # Configuration management
│   │   │   ├── services/
│   │   │   │   ├── error-tracker.ts     # Error tracking service
│   │   │   │   ├── performance-tracker.ts # Performance monitoring
│   │   │   │   └── user-tracker.ts      # User interaction tracking
│   │   │   └── utils/
│   │   │       ├── batch-collector.ts   # Batch metric collection
│   │   │       └── sampling.ts          # Intelligent sampling
│   │   └── app.ts                       # App entry point
│   ├── components/
│   │   └── monitoring/
│   │       ├── ErrorBoundary.tsx        # React error boundary
│   │       ├── PerformanceMetrics.tsx   # Performance display
│   │       └── DebugPanel.tsx           # Debug information
│   ├── hooks/
│   │   ├── useMonitor.ts                # React hook
│   │   ├── usePerformanceTracking.ts    # Performance tracking hook
│   │   └── useErrorTracking.ts          # Error tracking hook
│   ├── services/
│   │   └── api.ts                       # API service with monitoring
│   └── types/
│       └── monitoring.ts                # TypeScript types
├── config/
│   ├── monitoring/
│   │   ├── development.json             # Dev config
│   │   ├── staging.json                 # Staging config
│   │   ├── production.json              # Production config
│   │   └── test.json                    # Test config
│   └── webpack/
│       ├── webpack.common.js            # Common webpack config
│       ├── webpack.dev.js               # Development config
│       └── webpack.prod.js              # Production config
├── scripts/
│   ├── build-monitoring.js              # Build-time monitoring setup
│   └── deploy-monitoring.js             # Deployment monitoring setup
├── tests/
│   ├── unit/
│   │   └── monitoring/                  # Unit tests
│   └── integration/
│       └── monitoring.test.ts           # Integration tests
├── package.json
├── tsconfig.json
├── webpack.config.js
├── .env.example
└── docker-compose.yml                  # Optional: local monitoring stack
```

## Installation & Setup

### 1. Package.json Setup

```json
{
  "name": "my-frontend-app",
  "version": "1.0.0",
  "dependencies": {
    "@opentelemetry/api": "^1.4.0",
    "@opentelemetry/sdk-web": "^0.44.0",
    "@opentelemetry/exporter-otlp-http": "^0.44.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "webpack": "^5.88.0",
    "webpack-cli": "^5.1.0",
    "webpack-bundle-analyzer": "^4.9.0",
    "dotenv": "^16.3.0"
  },
  "scripts": {
    "start": "webpack serve --config config/webpack/webpack.dev.js",
    "build": "npm run build:monitoring && webpack --config config/webpack/webpack.prod.js",
    "build:monitoring": "node scripts/build-monitoring.js",
    "test": "jest",
    "test:monitoring": "jest --testPathPattern=monitoring",
    "deploy:staging": "npm run build && node scripts/deploy-monitoring.js staging",
    "deploy:production": "npm run build && node scripts/deploy-monitoring.js production"
  }
}
```

### 2. Environment Configuration

```bash
# .env.example
# Copy to .env.local for local development

# Application Configuration
NODE_ENV=development
REACT_APP_NAME=my-frontend-app
REACT_APP_VERSION=1.0.0
REACT_APP_BUILD_NUMBER=local

# Monitoring Configuration
REACT_APP_MONITOR_ENDPOINT=https://your-collector.example.com
REACT_APP_MONITOR_API_KEY=your-api-key
REACT_APP_MONITOR_SAMPLE_RATE=1.0

# Feature Flags
REACT_APP_ENABLE_MONITORING=true
REACT_APP_ENABLE_PERFORMANCE_MONITORING=true
REACT_APP_ENABLE_ERROR_MONITORING=true
REACT_APP_ENABLE_USER_INTERACTION_MONITORING=true
REACT_APP_ENABLE_DEBUG_PANEL=true

# Build Information (populated by CI/CD)
REACT_APP_GIT_COMMIT=unknown
REACT_APP_BUILD_TIME=unknown
REACT_APP_DEPLOY_TIME=unknown
```

## Configuration Management

### 1. Base Configuration Interface

```typescript
// src/types/monitoring.ts
export interface MonitoringConfig {
  service: {
    name: string
    version: string
    environment: 'development' | 'staging' | 'production' | 'test'
  }
  collector: {
    endpoint: string
    apiKey?: string
    timeout: number
  }
  sampling: {
    rate: number
    strategy: 'fixed' | 'adaptive' | 'error-based'
  }
  features: {
    performance: boolean
    errors: boolean
    userInteractions: boolean
    customMetrics: boolean
    sessionTracking: boolean
    networkMonitoring: boolean
  }
  thresholds: {
    errorRate: number
    responseTime: number
    memoryUsage: number
  }
  excludedUrls: RegExp[]
  customAttributes: Record<string, string>
}
```

### 2. Environment-Specific Configurations

```json
// config/monitoring/development.json
{
  "service": {
    "name": "my-frontend-app",
    "version": "1.0.0-local",
    "environment": "development"
  },
  "collector": {
    "endpoint": "http://localhost:4318",
    "timeout": 5000
  },
  "sampling": {
    "rate": 1.0,
    "strategy": "fixed"
  },
  "features": {
    "performance": true,
    "errors": true,
    "userInteractions": true,
    "customMetrics": true,
    "sessionTracking": true,
    "networkMonitoring": false
  },
  "thresholds": {
    "errorRate": 0.1,
    "responseTime": 2000,
    "memoryUsage": 100
  },
  "excludedUrls": [
    "/api/health",
    "/api/metrics",
    ".*\\.map$",
    "chrome-extension://.*"
  ],
  "customAttributes": {
    "debug_mode": "true",
    "hot_reload": "true"
  }
}
```

```json
// config/monitoring/production.json
{
  "service": {
    "name": "my-frontend-app",
    "version": "1.0.0",
    "environment": "production"
  },
  "collector": {
    "endpoint": "https://collector.example.com",
    "timeout": 3000
  },
  "sampling": {
    "rate": 0.1,
    "strategy": "adaptive"
  },
  "features": {
    "performance": true,
    "errors": true,
    "userInteractions": true,
    "customMetrics": true,
    "sessionTracking": true,
    "networkMonitoring": true
  },
  "thresholds": {
    "errorRate": 0.05,
    "responseTime": 1500,
    "memoryUsage": 50
  },
  "excludedUrls": [
    "/api/health",
    "/api/metrics",
    "/analytics/.*",
    ".*\\.map$",
    "chrome-extension://.*"
  ],
  "customAttributes": {
    "cdn_enabled": "true",
    "security_headers": "true"
  }
}
```

### 3. Configuration Loader

```typescript
// src/core/monitoring/config.ts
import type { MonitoringConfig } from '@/types/monitoring'
import developmentConfig from '../../../config/monitoring/development.json'
import stagingConfig from '../../../config/monitoring/staging.json'
import productionConfig from '../../../config/monitoring/production.json'
import testConfig from '../../../config/monitoring/test.json'

const configs = {
  development: developmentConfig,
  staging: stagingConfig,
  production: productionConfig,
  test: testConfig
}

export function loadMonitoringConfig(): MonitoringConfig {
  const environment = (process.env.NODE_ENV as keyof typeof configs) || 'development'
  const baseConfig = configs[environment]

  // Override with environment variables
  return {
    ...baseConfig,
    service: {
      ...baseConfig.service,
      name: process.env.REACT_APP_NAME || baseConfig.service.name,
      version: process.env.REACT_APP_VERSION || baseConfig.service.version
    },
    collector: {
      ...baseConfig.collector,
      endpoint: process.env.REACT_APP_MONITOR_ENDPOINT || baseConfig.collector.endpoint,
      apiKey: process.env.REACT_APP_MONITOR_API_KEY || baseConfig.collector.apiKey
    },
    sampling: {
      ...baseConfig.sampling,
      rate: parseFloat(process.env.REACT_APP_MONITOR_SAMPLE_RATE || baseConfig.sampling.rate.toString())
    },
    customAttributes: {
      ...baseConfig.customAttributes,
      git_commit: process.env.REACT_APP_GIT_COMMIT || 'unknown',
      build_time: process.env.REACT_APP_BUILD_TIME || new Date().toISOString(),
      build_number: process.env.REACT_APP_BUILD_NUMBER || 'unknown'
    }
  }
}

export function isMonitoringEnabled(): boolean {
  return process.env.REACT_APP_ENABLE_MONITORING === 'true'
}
```

## Build Integration

### 1. Webpack Configuration

```javascript
// config/webpack/webpack.common.js
const path = require('path')
const { EnvironmentPlugin } = require('webpack')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

module.exports = {
  entry: {
    app: './src/core/app.ts'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, '../../src'),
      '@monitoring': path.resolve(__dirname, '../../src/core/monitoring')
    }
  },
  plugins: [
    new EnvironmentPlugin({
      NODE_ENV: 'development',
      REACT_APP_ENABLE_MONITORING: 'true',
      REACT_APP_MONITOR_ENDPOINT: 'http://localhost:4318'
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-analysis.html'
    })
  ],
  optimization: {
    usedExports: true,
    sideEffects: false,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        monitoring: {
          test: /[\\/]node_modules[\\/](@opentelemetry)[\\/]/,
          name: 'monitoring',
          chunks: 'all',
          priority: 20
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
          priority: 10
        }
      }
    }
  }
}
```

```javascript
// config/webpack/webpack.prod.js
const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')
const TerserPlugin = require('terser-webpack-plugin')

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: process.env.NODE_ENV === 'production',
            drop_debugger: true
          }
        }
      })
    ]
  },
  plugins: [
    // Remove monitoring code in production if disabled
    new webpack.DefinePlugin({
      'process.env.REACT_APP_ENABLE_MONITORING': JSON.stringify(
        process.env.REACT_APP_ENABLE_MONITORING !== 'false'
      )
    })
  ]
})
```

### 2. Build-Time Monitoring Setup

```javascript
// scripts/build-monitoring.js
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

function createBuildInfo() {
  const buildInfo = {
    build_time: new Date().toISOString(),
    git_commit: getGitCommit(),
    git_branch: getGitBranch(),
    build_number: getBuildNumber(),
    node_version: process.version,
    build_user: process.env.USER || 'unknown'
  }

  // Write build info to public directory
  const buildInfoPath = path.join(__dirname, '../public/build-info.json')
  fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2))

  // Update environment variables
  process.env.REACT_APP_BUILD_TIME = buildInfo.build_time
  process.env.REACT_APP_GIT_COMMIT = buildInfo.git_commit
  process.env.REACT_APP_BUILD_NUMBER = buildInfo.build_number

  console.log('✅ Build info created:', buildInfo)
  return buildInfo
}

function getGitCommit() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

function getGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

function getBuildNumber() {
  // This could be integrated with your CI/CD system
  return process.env.BUILD_NUMBER || process.env.CI_BUILD_NUMBER || 'local'
}

// Run build info creation
if (require.main === module) {
  createBuildInfo()
}

module.exports = { createBuildInfo }
```

## Environment Setup

### 1. Docker Compose for Local Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Jaeger for local tracing
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
      - "4318:4318"    # OTLP HTTP receiver
      - "4317:4317"    # OTLP gRPC receiver
    environment:
      - COLLECTOR_OTLP_ENABLED=true

  # Prometheus for metrics
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  # Grafana for dashboards
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./config/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./config/grafana/datasources:/etc/grafana/provisioning/datasources

  # Application
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_MONITOR_ENDPOINT=http://localhost:4318
      - REACT_APP_ENABLE_MONITORING=true
    depends_on:
      - jaeger
      - prometheus
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  prometheus_data:
  grafana_data:
```

```yaml
# config/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'jaeger'
    static_configs:
      - targets: ['jaeger:14269']

  - job_name: 'frontend-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s
```

### 2. Local Development Script

```bash
#!/bin/bash
# scripts/dev-setup.sh

echo "🚀 Setting up development environment with monitoring..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker first."
  exit 1
fi

# Start monitoring stack
echo "📊 Starting monitoring stack..."
docker-compose up -d jaeger prometheus grafana

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create build info
echo "🔨 Creating build info..."
node scripts/build-monitoring.js

# Start development server
echo "🌟 Starting development server..."
echo "📊 Monitoring UIs:"
echo "   - Jaeger: http://localhost:16686"
echo "   - Prometheus: http://localhost:9090"
echo "   - Grafana: http://localhost:3001 (admin/admin)"
echo "   - Application: http://localhost:3000"

npm start
```

## CI/CD Integration

### 1. GitHub Actions Workflow

```yaml
# .github/workflows/build-and-deploy.yml
name: Build and Deploy

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run monitoring tests
        run: npm run test:monitoring

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  build:
    needs: test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [staging, production]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Create build info
        env:
          BUILD_NUMBER: ${{ github.run_number }}
          CI_BUILD_NUMBER: ${{ github.run_number }}
          GIT_COMMIT: ${{ github.sha }}
        run: node scripts/build-monitoring.js

      - name: Build application
        env:
          NODE_ENV: ${{ matrix.environment }}
          REACT_APP_MONITOR_ENDPOINT: ${{ secrets.MONITOR_ENDPOINT }}
          REACT_APP_MONITOR_API_KEY: ${{ secrets.MONITOR_API_KEY }}
          REACT_APP_ENABLE_MONITORING: 'true'
        run: npm run build

      - name: Run integration tests
        run: npm run test:integration

      - name: Build Docker image
        run: |
          docker build -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ matrix.environment }}-${{ github.sha }} .
          docker tag ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ matrix.environment }}-latest

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Push Docker image
        run: |
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ matrix.environment }}-${{ github.sha }}
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ matrix.environment }}-latest

      - name: Deploy to ${{ matrix.environment }}
        run: |
          echo "🚀 Deploying to ${{ matrix.environment }}..."
          # Add your deployment commands here
          # For example: kubectl apply, helm upgrade, etc.

      - name: Post-deployment verification
        run: |
          echo "🔍 Verifying deployment..."
          # Add health checks and monitoring verification
          curl -f https://${{ matrix.environment }}.example.com/health || exit 1

      - name: Notify monitoring team
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          channel: '#monitoring-alerts'
          text: 'Deployment to ${{ matrix.environment }} failed'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 2. Deployment Script

```javascript
// scripts/deploy-monitoring.js
const fs = require('fs')
const path = require('path')
const https = require('https')

async function deployMonitoring(environment) {
  console.log(`🚀 Deploying monitoring for ${environment}...`)

  // Read build info
  const buildInfo = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../public/build-info.json'), 'utf8')
  )

  // Create deployment event
  const deploymentEvent = {
    service: 'my-frontend-app',
    version: buildInfo.build_number,
    environment,
    timestamp: new Date().toISOString(),
    git_commit: buildInfo.git_commit,
    build_time: buildInfo.build_time,
    deployer: process.env.USER || 'ci-cd'
  }

  // Send deployment event to monitoring system
  await sendDeploymentEvent(deploymentEvent)

  console.log('✅ Monitoring deployment event sent:', deploymentEvent)
}

async function sendDeploymentEvent(event) {
  const data = JSON.stringify(event)

  const options = {
    hostname: process.env.MONITOR_ENDPOINT?.replace('https://', '') || 'localhost',
    port: process.env.MONITOR_ENDPOINT ? 443 : 4318,
    path: '/api/v1/deployments',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Authorization': `Bearer ${process.env.MONITOR_API_KEY || ''}`
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(res)
      } else {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`))
      }
    })

    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

// Run deployment
if (require.main === module) {
  const environment = process.argv[2] || 'staging'
  deployMonitoring(environment).catch(console.error)
}

module.exports = { deployMonitoring }
```

## Monitoring Dashboard

### 1. Grafana Dashboard Configuration

```json
// config/grafana/dashboards/frontend-monitoring.json
{
  "dashboard": {
    "title": "Frontend Application Monitoring",
    "panels": [
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(frontend_errors_total[5m]) * 100",
            "legendFormat": "Error Rate %"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(frontend_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(frontend_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "title": "User Interactions",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(frontend_user_interactions_total[5m])",
            "legendFormat": "Interactions/sec"
          }
        ]
      },
      {
        "title": "Performance Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "frontend_performance_fcp_seconds",
            "legendFormat": "First Contentful Paint"
          },
          {
            "expr": "frontend_performance_lcp_seconds",
            "legendFormat": "Largest Contentful Paint"
          },
          {
            "expr": "frontend_performance_fid_seconds",
            "legendFormat": "First Input Delay"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

### 2. Alert Rules

```yaml
# config/prometheus/alerts.yml
groups:
  - name: frontend_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(frontend_errors_total[5m]) * 100 > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}% for the last 5 minutes"

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(frontend_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response times detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: LowUserEngagement
        expr: rate(frontend_user_interactions_total[10m]) < 0.1
        for: 10m
        labels:
          severity: info
        annotations:
          summary: "Low user engagement detected"
          description: "User interaction rate is {{ $value }}/sec for the last 10 minutes"
```

## Troubleshooting

### 1. Common Issues and Solutions

#### Issue: Monitor SDK not initializing
```typescript
// Debug initialization
import { createFrontendMonitor } from '../src/index'

async function debugInitialization() {
  try {
    console.log('🔍 Starting monitor initialization...')

    const config = loadMonitoringConfig()
    console.log('📋 Configuration:', JSON.stringify(config, null, 2))

    const monitor = createFrontendMonitor()
    console.log('📦 Monitor instance created')

    await monitor.init(config)
    console.log('✅ Monitor initialized successfully')

  } catch (error) {
    console.error('❌ Monitor initialization failed:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
  }
}
```

#### Issue: Metrics not appearing in dashboard
```typescript
// Debug metric collection
function debugMetricsCollection() {
  const monitor = getMonitorInstance()

  // Test basic metric collection
  monitor.getMetricsCollector().incrementCounter('test_counter', 1, {
    test: 'debug',
    timestamp: Date.now().toString()
  })

  console.log('📊 Test metric recorded')

  // Test error recording
  monitor.recordError(new Error('Test error for debugging'), {
    debug: true,
    timestamp: Date.now().toString()
  })

  console.log('🚨 Test error recorded')

  // Test user interaction
  monitor.recordUserInteraction({
    type: 'click',
    element: 'button',
    target: 'debug-button',
    timestamp: Date.now()
  })

  console.log('👆 Test interaction recorded')
}
```

### 2. Health Check Endpoint

```typescript
// src/core/monitoring/health-check.ts
export class MonitoringHealthCheck {
  constructor(private monitor: FrontendMonitorSDK) {}

  async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: {
      initialization: boolean
      collector: boolean
      errorTracking: boolean
      performanceTracking: boolean
    }
    metrics: {
      lastErrorTime?: number
      errorCount: number
      lastMetricTime?: number
      metricCount: number
    }
  }> {
    const checks = {
      initialization: !!this.monitor,
      collector: await this.checkCollectorHealth(),
      errorTracking: this.checkErrorTracking(),
      performanceTracking: this.checkPerformanceTracking()
    }

    const metrics = {
      lastErrorTime: this.getLastErrorTime(),
      errorCount: this.getErrorCount(),
      lastMetricTime: this.getLastMetricTime(),
      metricCount: this.getMetricCount()
    }

    const failedChecks = Object.values(checks).filter(check => !check).length

    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (failedChecks === 0) {
      status = 'healthy'
    } else if (failedChecks <= 2) {
      status = 'degraded'
    } else {
      status = 'unhealthy'
    }

    return { status, checks, metrics }
  }

  private async checkCollectorHealth(): Promise<boolean> {
    try {
      // Send a test metric to verify collector connectivity
      this.monitor?.getMetricsCollector().incrementCounter('health_check_total', 1)
      return true
    } catch {
      return false
    }
  }

  private checkErrorTracking(): boolean {
    return !!this.monitor
  }

  private checkPerformanceTracking(): boolean {
    return !!this.monitor && 'performance' in window
  }

  private getLastErrorTime(): number | undefined {
    // Implementation depends on your error tracking setup
    return undefined
  }

  private getErrorCount(): number {
    // Implementation depends on your error tracking setup
    return 0
  }

  private getLastMetricTime(): number | undefined {
    // Implementation depends on your metrics storage
    return Date.now()
  }

  private getMetricCount(): number {
    // Implementation depends on your metrics storage
    return 0
  }
}
```

### 3. Debug Panel Component

```tsx
// src/components/monitoring/DebugPanel.tsx
import React, { useState, useEffect } from 'react'
import { useMonitor } from '@/hooks/useMonitor'
import { MonitoringHealthCheck } from '@/core/monitoring/health-check'

export const DebugPanel: React.FC = () => {
  const { monitor } = useMonitor()
  const [healthCheck, setHealthCheck] = useState<any>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (!monitor) return

    const healthChecker = new MonitoringHealthCheck(monitor)
    const performCheck = async () => {
      const result = await healthChecker.performHealthCheck()
      setHealthCheck(result)
    }

    performCheck()
    const interval = setInterval(performCheck, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [monitor])

  if (!monitor || !healthCheck) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '🟢'
      case 'degraded': return '🟡'
      case 'unhealthy': return '🔴'
      default: return '⚪'
    }
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 9999,
      minWidth: '300px'
    }}>
      <div onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer' }}>
        📊 Monitoring Debug {getStatusColor(healthCheck.status)}
      </div>

      {isExpanded && (
        <div style={{ marginTop: '10px' }}>
          <div>Status: {healthCheck.status} {getStatusColor(healthCheck.status)}</div>
          <div>Initialization: {healthCheck.checks.initialization ? '✅' : '❌'}</div>
          <div>Collector: {healthCheck.checks.collector ? '✅' : '❌'}</div>
          <div>Error Tracking: {healthCheck.checks.errorTracking ? '✅' : '❌'}</div>
          <div>Performance: {healthCheck.checks.performanceTracking ? '✅' : '❌'}</div>
          <div>Errors: {healthCheck.metrics.errorCount}</div>
          <div>Metrics: {healthCheck.metrics.metricCount}</div>
        </div>
      )}
    </div>
  )
}
```

This comprehensive integration guide provides everything needed to successfully integrate the Frontend Monitor SDK into a production frontend application, including proper configuration, build setup, CI/CD integration, and troubleshooting tools.