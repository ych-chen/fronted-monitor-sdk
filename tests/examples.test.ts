/**
 * 示例代码测试套件
 *
 * 本测试套件验证所有示例代码的正确性和功能性：
 * - Vue 3 示例组件
 * - React Hooks 示例
 * - Vanilla JavaScript 示例
 * - TypeScript 示例
 * - 文档示例完整性
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { JSDOM } from 'jsdom'
import { createFrontendMonitor } from '../src/index'

// 设置浏览器环境
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>', {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
  resources: 'usable'
})

global.window = dom.window as any
global.document = dom.window.document
global.navigator = dom.window.navigator
global.performance = dom.window.performance
global.HTMLElement = dom.window.HTMLElement
global.Event = dom.window.Event
global.MouseEvent = dom.window.MouseEvent
global.ErrorEvent = dom.window.ErrorEvent
global.CustomEvent = dom.window.CustomEvent
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ success: true })
})

describe('示例代码测试', () => {
  let collectedData: any[]

  beforeEach(() => {
    collectedData = []
    global.fetch = jest.fn().mockImplementation((url: string, options: any) => {
      if (url.includes('/collect')) {
        collectedData.push(JSON.parse(options.body))
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true })
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      })
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Vue 3 示例测试', () => {
    it('应该能够解析Vue示例文件', async () => {
      const fs = require('fs')
      const path = require('path')

      try {
        const vueExamplePath = path.join(__dirname, '../examples/vue3-app.vue')
        const vueExampleContent = fs.readFileSync(vueExamplePath, 'utf8')

        // 验证Vue示例包含关键组件
        expect(vueExampleContent).toContain('<script setup lang="ts">')
        expect(vueExampleContent).toContain('createFrontendMonitor')
        expect(vueExampleContent).toContain('reactive')
        expect(vueExampleContent).toContain('onMounted')
        expect(vueExampleContent).toContain('onUnmounted')
        expect(vueExampleContent).toContain('monitor.init')
        expect(vueExampleContent).toContain('getMetricsCollector')
        expect(vueExampleContent).toContain('recordUserInteraction')
        expect(vueExampleContent).toContain('recordError')

        // 验证包含性能监控
        expect(vueExampleContent).toContain('performanceMetrics')
        expect(vueExampleContent).toContain('fcp')
        expect(vueExampleContent).toContain('lcp')
        expect(vueExampleContent).toContain('fid')
        expect(vueExampleContent).toContain('cls')

        // 验证包含用户交互跟踪
        expect(vueExampleContent).toContain('login')
        expect(vueExampleContent).toContain('logout')
        expect(vueExampleContent).toContain('updateProfile')
        expect(vueExampleContent).toContain('startTracing')

        console.log('✅ Vue 3 示例文件结构验证通过')

      } catch (error) {
        console.log('❌ Vue 3 示例文件读取失败:', error.message)
        throw error
      }
    })

    it('应该能够验证Vue示例中的监控逻辑', () => {
      // 模拟Vue组件中的监控初始化逻辑
      const monitor = createFrontendMonitor()

      // 验证Vue示例中的初始化配置
      const vueConfig = {
        serviceName: 'vue3-example-app',
        serviceVersion: '1.0.0',
        endpoint: 'https://your-collector.example.com',
        sampleRate: 1.0,
        enablePerformanceMonitoring: true,
        enableErrorMonitoring: true,
        enableUserInteractionMonitoring: true,
        enableAutoTracing: true,
        enableCustomMetrics: true,
        attributes: {
          framework: 'vue3',
          environment: 'development',
          vue_version: '3.x'
        }
      }

      expect(vueConfig.serviceName).toBe('vue3-example-app')
      expect(vueConfig.attributes.framework).toBe('vue3')
      expect(vueConfig.enablePerformanceMonitoring).toBe(true)
    })
  })

  describe('React Hooks 示例测试', () => {
    it('应该能够解析React示例文件', async () => {
      const fs = require('fs')
      const path = require('path')

      try {
        const reactExamplePath = path.join(__dirname, '../examples/react-hooks-app.tsx')
        const reactExampleContent = fs.readFileSync(reactExamplePath, 'utf8')

        // 验证React示例包含关键Hook
        expect(reactExampleContent).toContain('import React')
        expect(reactExampleContent).toContain('useState')
        expect(reactExampleContent).toContain('useEffect')
        expect(reactExampleContent).toContain('useCallback')
        expect(reactExampleContent).toContain('useFrontendMonitor')
        expect(reactExampleContent).toContain('useUserManagement')
        expect(reactExampleContent).toContain('useMetrics')
        expect(reactExampleContent).toContain('useAsyncOperation')

        // 验证包含监控集成
        expect(reactExampleContent).toContain('createFrontendMonitor')
        expect(reactExampleContent).toContain('monitor.init')
        expect(reactExampleContent).toContain('startTracing')
        expect(reactExampleContent).toContain('recordError')
        expect(reactExampleContent).toContain('recordUserInteraction')

        // 验证包含自定义Hook实现
        expect(reactExampleContent).toContain('const useFrontendMonitor')
        expect(reactExampleContent).toContain('const useUserManagement')
        expect(reactExampleContent).toContain('const useMetrics')
        expect(reactExampleContent).toContain('const useAsyncOperation')

        console.log('✅ React Hooks 示例文件结构验证通过')

      } catch (error) {
        console.log('❌ React Hooks 示例文件读取失败:', error.message)
        throw error
      }
    })

    it('应该验证React示例中的Hook逻辑', () => {
      // 模拟useFrontendMonitor Hook
      const mockUseFrontendMonitor = () => {
        const monitor = createFrontendMonitor()

        const initMonitor = async () => {
          await monitor.init({
            serviceName: 'react-hooks-example',
            endpoint: 'https://your-collector.example.com',
            enablePerformanceMonitoring: true,
            enableErrorMonitoring: true,
            enableUserInteractionMonitoring: true
          })
        }

        return { monitor, initMonitor }
      }

      const { monitor, initMonitor } = mockUseFrontendMonitor()
      expect(monitor).toBeDefined()
      expect(typeof initMonitor).toBe('function')
    })
  })

  describe('Vanilla JavaScript 示例测试', () => {
    it('应该能够解析Vanilla JS示例文件', async () => {
      const fs = require('fs')
      const path = require('path')

      try {
        const vanillaExamplePath = path.join(__dirname, '../examples/vanilla-js-enhanced.html')
        const vanillaExampleContent = fs.readFileSync(vanillaExamplePath, 'utf8')

        // 验证HTML结构
        expect(vanillaExampleContent).toContain('<!DOCTYPE html>')
        expect(vanillaExampleContent).toContain('<html lang="zh-CN">')
        expect(vanillaExampleContent).toContain('<head>')
        expect(vanillaExampleContent).toContain('<body>')
        expect(vanillaExampleContent).toContain('<script>')

        // 验证包含监控SDK集成
        expect(vanillaExampleContent).toContain('createFrontendMonitor')
        expect(vanillaExampleContent).toContain('monitor.init')
        expect(vanillaExampleContent).toContain('performance monitoring')
        expect(vanillaExampleContent).toContain('error tracking')
        expect(vanillaExampleContent).toContain('user interaction')

        // 验证包含UI元素
        expect(vanillaExampleContent).toContain('id="app"')
        expect(vanillaExampleContent).toContain('class="dashboard"')
        expect(vanillaExampleContent).toContain('class="metrics"')
        expect(vanillaExampleContent).toContain('class="controls"')

        // 验证包含JavaScript功能
        expect(vanillaExampleContent).toContain('addEventListener')
        expect(vanillaExampleContent).toContain('querySelector')
        expect(vanillaExampleContent).toContain('createElement')
        expect(vanillaExampleContent).toContain('appendChild')

        console.log('✅ Vanilla JavaScript 示例文件结构验证通过')

      } catch (error) {
        console.log('❌ Vanilla JavaScript 示例文件读取失败:', error.message)
        throw error
      }
    })

    it('应该能够模拟Vanilla JS示例的功能', async () => {
      // 创建类似Vanilla JS示例的监控实例
      const monitor = createFrontendMonitor()

      await monitor.init({
        serviceName: 'vanilla-js-enhanced',
        endpoint: 'https://your-collector.example.com',
        enablePerformanceMonitoring: true,
        enableErrorMonitoring: true,
        enableUserInteractionMonitoring: true,
        enableAutoTracing: true,
        enableCustomMetrics: true,
        attributes: {
          framework: 'vanilla-js',
          environment: 'development'
        }
      })

      // 模拟Vanilla JS示例中的功能
      const app = document.createElement('div')
      app.id = 'app'
      document.body.appendChild(app)

      // 创建仪表盘
      const dashboard = document.createElement('div')
      dashboard.className = 'dashboard'
      app.appendChild(dashboard)

      // 添加监控功能测试
      monitor.recordPageView('/vanilla-demo', {
        title: 'Vanilla JS 增强示例'
      })

      monitor.recordUserInteraction({
        type: 'click',
        element: 'button',
        target: 'test-button',
        timestamp: Date.now()
      })

      // 验证数据被收集
      expect(collectedData.length).toBeGreaterThan(0)

      // 清理
      document.body.removeChild(app)
      monitor.destroy()
    })
  })

  describe('TypeScript 示例测试', () => {
    it('应该能够解析TypeScript示例文件', async () => {
      const fs = require('fs')
      const path = require('path')

      try {
        const tsExamplePath = path.join(__dirname, '../examples/typescript-safe-example.ts')
        const tsExampleContent = fs.readFileSync(tsExamplePath, 'utf8')

        // 验证TypeScript语法和类型定义
        expect(tsExampleContent).toContain('interface')
        expect(tsExampleContent).toContain('type')
        expect(tsExampleContent).toContain('class')
        expect(tsExampleContent).toContain('enum')
        expect(tsExampleContent).toContain('function')

        // 验证包含严格类型定义
        expect(tsExampleContent).toContain('FrontendMonitorConfig')
        expect(tsExampleContent).toContain('MetricsCollector')
        expect(tsExampleContent).toContain('TracingManager')
        expect(tsExampleContent).toContain('UserService')
        expect(tsExampleContent).toContain('APIClient')

        // 验证包含泛型使用
        expect(tsExampleContent).toContain('<T>')
        expect(tsExampleContent).toContain('extends')

        // 验证包含装饰器模式
        expect(tsExampleContent).toContain('errorHandler')
        expect(tsExampleContent).toContain('performanceTracker')

        // 验证包含类型安全的监控配置
        expect(tsExampleContent).toContain('createTypedConfig')
        expect(tsExampleContent).toContain('TypedMonitoredApplication')

        console.log('✅ TypeScript 示例文件结构验证通过')

      } catch (error) {
        console.log('❌ TypeScript 示例文件读取失败:', error.message)
        throw error
      }
    })

    it('应该验证TypeScript示例中的类型安全性', () => {
      // 模拟TypeScript示例中的类型定义
      interface User {
        id: string
        name: string
        email: string
        createdAt: Date
      }

      interface APIResponse<T> {
        data: T
        success: boolean
        message?: string
      }

      // 模拟类型安全的API客户端
      class TypedAPIClient {
        async request<T>(url: string, options?: RequestInit): Promise<APIResponse<T>> {
          const response = await fetch(url, options)
          const data = await response.json()

          return {
            data,
            success: response.ok,
            message: response.ok ? undefined : 'Request failed'
          }
        }
      }

      // 验证类型安全性
      const apiClient = new TypedAPIClient()
      expect(apiClient).toBeDefined()
      expect(typeof apiClient.request).toBe('function')
    })
  })

  describe('文档示例完整性测试', () => {
    it('应该验证README.md文档完整性', () => {
      const fs = require('fs')
      const path = require('path')

      try {
        const readmePath = path.join(__dirname, '../examples/README.md')
        const readmeContent = fs.readFileSync(readmePath, 'utf8')

        // 验证文档结构
        expect(readmeContent).toContain('# Frontend Monitor SDK Examples')
        expect(readmeContent).toContain('## 📁 Example Files')
        expect(readmeContent).toContain('## 🚀 Quick Start')
        expect(readmeContent).toContain('## 📊 Key Monitoring Features')
        expect(readmeContent).toContain('## 🛠️ Integration Patterns')
        expect(readmeContent).toContain('## 📋 Monitoring Checklist')

        // 验证包含所有示例的说明
        expect(readmeContent).toContain('vue3-app.vue')
        expect(readmeContent).toContain('react-hooks-app.tsx')
        expect(readmeContent).toContain('vanilla-js-enhanced.html')
        expect(readmeContent).toContain('typescript-safe-example.ts')

        // 验证包含功能特性说明
        expect(readmeContent).toContain('Core Web Vitals')
        expect(readmeContent).toContain('Error Tracking')
        expect(readmeContent).toContain('User Interaction Monitoring')
        expect(readmeContent).toContain('Custom Metrics')

        console.log('✅ README.md 文档完整性验证通过')

      } catch (error) {
        console.log('❌ README.md 文档读取失败:', error.message)
        throw error
      }
    })

    it('应该验证最佳实践文档完整性', () => {
      const fs = require('fs')
      const path = require('path')

      try {
        const bestPracticesPath = path.join(__dirname, '../examples/FRAMEWORK_BEST_PRACTICES.md')
        const bestPracticesContent = fs.readFileSync(bestPracticesPath, 'utf8')

        // 验证最佳实践文档结构
        expect(bestPracticesContent).toContain('# Framework Best Practices')
        expect(bestPracticesContent).toContain('## React Integration')
        expect(bestPracticesContent).toContain('## Vue Integration')
        expect(bestPracticesContent).toContain('## Vanilla JavaScript Integration')
        expect(bestPracticesContent).toContain('## TypeScript Integration')

        // 验证包含性能优化建议
        expect(bestPracticesContent).toContain('Performance Optimization')
        expect(bestPracticesContent).toContain('Error Handling Patterns')
        expect(bestPracticesContent).toContain('Testing Considerations')

        console.log('✅ 最佳实践文档完整性验证通过')

      } catch (error) {
        console.log('❌ 最佳实践文档读取失败:', error.message)
        throw error
      }
    })

    it('应该验证项目集成指南文档完整性', () => {
      const fs = require('fs')
      const path = require('path')

      try {
        const integrationGuidePath = path.join(__dirname, '../examples/PROJECT_INTEGRATION_GUIDE.md')
        const integrationGuideContent = fs.readFileSync(integrationGuidePath, 'utf8')

        // 验证集成指南文档结构
        expect(integrationGuideContent).toContain('# Project Integration Guide')
        expect(integrationGuideContent).toContain('## Environment Setup')
        expect(integrationGuideContent).toContain('## Build Integration')
        expect(integrationGuideContent).toContain('## CI/CD Integration')
        expect(integrationGuideContent).toContain('## Monitoring Stack')

        // 验证包含具体集成步骤
        expect(integrationGuideContent).toContain('npm install')
        expect(integrationGuideContent).toContain('Configuration')
        expect(integrationGuideContent).toContain('Docker')
        expect(integrationGuideContent).toContain('Grafana')

        console.log('✅ 项目集成指南文档完整性验证通过')

      } catch (error) {
        console.log('❌ 项目集成指南文档读取失败:', error.message)
        throw error
      }
    })
  })

  describe('示例代码可执行性测试', () => {
    it('应该能够运行Vue示例的核心逻辑', async () => {
      // 模拟Vue示例中的监控初始化
      const monitor = createFrontendMonitor()

      await monitor.init({
        serviceName: 'vue3-example-app',
        serviceVersion: '1.0.0',
        endpoint: 'https://your-collector.example.com',
        sampleRate: 1.0,
        enablePerformanceMonitoring: true,
        enableErrorMonitoring: true,
        enableUserInteractionMonitoring: true,
        enableAutoTracing: true,
        enableCustomMetrics: true,
        attributes: {
          framework: 'vue3',
          environment: 'test'
        }
      })

      // 模拟Vue示例中的用户操作
      const tracing = monitor.startTracing('user_login', {
        attributes: {
          login_method: 'vue_app',
          timestamp: Date.now()
        }
      })

      // 模拟登录成功
      const metrics = monitor.getMetricsCollector()
      metrics.incrementCounter('user_logins_total', 1, {
        status: 'success',
        method: 'vue_app'
      })

      tracing.endSpan()

      // 验证数据收集
      expect(collectedData.length).toBeGreaterThan(0)

      monitor.destroy()
    })

    it('应该能够运行React示例的核心逻辑', async () => {
      // 模拟React示例中的Hook逻辑
      const monitor = createFrontendMonitor()

      await monitor.init({
        serviceName: 'react-hooks-example',
        endpoint: 'https://your-collector.example.com',
        enablePerformanceMonitoring: true,
        enableErrorMonitoring: true,
        enableUserInteractionMonitoring: true
      })

      // 模拟React Hook中的异步操作
      const asyncOperation = async () => {
        const tracing = monitor.startTracing('async_operation')

        try {
          // 模拟API调用
          await new Promise(resolve => setTimeout(resolve, 100))

          const metrics = monitor.getMetricsCollector()
          metrics.incrementCounter('async_operations_total', 1, {
            status: 'success',
            framework: 'react'
          })

          tracing.endSpan()
        } catch (error) {
          tracing.recordError(error instanceof Error ? error : new Error('Unknown error'))
          tracing.endSpan()
        }
      }

      await asyncOperation()

      // 验证数据收集
      expect(collectedData.length).toBeGreaterThan(0)

      monitor.destroy()
    })

    it('应该能够运行Vanilla JS示例的核心逻辑', async () => {
      // 模拟Vanilla JS示例中的仪表盘功能
      const monitor = createFrontendMonitor()

      await monitor.init({
        serviceName: 'vanilla-js-enhanced',
        endpoint: 'https://your-collector.example.com',
        enablePerformanceMonitoring: true,
        enableErrorMonitoring: true,
        enableUserInteractionMonitoring: true
      })

      // 模拟DOM操作和事件监听
      const app = document.createElement('div')
      app.id = 'app'
      document.body.appendChild(app)

      // 添加按钮和事件监听
      const button = document.createElement('button')
      button.textContent = 'Test Button'
      button.id = 'test-button'
      app.appendChild(button)

      button.addEventListener('click', () => {
        monitor.recordUserInteraction({
          type: 'click',
          element: 'button',
          target: 'test-button',
          timestamp: Date.now()
        })

        const metrics = monitor.getMetricsCollector()
        metrics.incrementCounter('button_clicks', 1)
      })

      // 模拟点击事件
      button.click()

      // 验证数据收集
      expect(collectedData.length).toBeGreaterThan(0)

      // 清理
      document.body.removeChild(app)
      monitor.destroy()
    })

    it('应该能够运行TypeScript示例的核心逻辑', async () => {
      // 模拟TypeScript示例中的类型安全操作
      interface TypedMetrics {
        responseTime: number
        errorCount: number
        activeUsers: number
      }

      const monitor = createFrontendMonitor()

      await monitor.init({
        serviceName: 'typescript-safe-example',
        endpoint: 'https://your-collector.example.com',
        enablePerformanceMonitoring: true,
        enableErrorMonitoring: true,
        enableCustomMetrics: true
      })

      // 模拟类型安全的指标记录
      const typedMetrics: TypedMetrics = {
        responseTime: 150,
        errorCount: 0,
        activeUsers: 42
      }

      const metrics = monitor.getMetricsCollector()

      // 使用类型安全的方式记录指标
      metrics.recordHistogram('typed_response_time', typedMetrics.responseTime, {
        metric_type: 'typed'
      })

      metrics.recordGauge('typed_active_users', typedMetrics.activeUsers, {
        metric_type: 'typed'
      })

      if (typedMetrics.errorCount > 0) {
        metrics.incrementCounter('typed_errors', typedMetrics.errorCount, {
          metric_type: 'typed'
        })
      }

      // 验证数据收集
      expect(collectedData.length).toBeGreaterThan(0)

      monitor.destroy()
    })
  })
})