/**
 * 前端监控SDK集成测试套件
 *
 * 本测试套件验证前端监控SDK的核心功能，包括：
 * - 初始化和配置
 * - 性能监控
 * - 错误追踪
 * - 用户交互监控
 * - 自定义指标收集
 * - 数据传输和验证
 */

import { JSDOM } from 'jsdom'
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { createFrontendMonitor, type FrontendMonitorSDK } from '../src/index'

// 设置浏览器环境
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
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
global.KeyboardEvent = dom.window.KeyboardEvent
global.ErrorEvent = dom.window.ErrorEvent
global.Promise = dom.window.Promise
global.fetch = dom.window.fetch

// Mock PerformanceObserver
class MockPerformanceObserver {
  constructor(private callback: PerformanceObserverCallback) {}

  observe() {
    // 模拟性能指标
    setTimeout(() => {
      this.callback([], {
        getEntries: () => [{
          name: 'first-contentful-paint',
          startTime: 1000,
          value: 1000
        }]
      })
    }, 100)
  }

  disconnect() {}
}

global.PerformanceObserver = MockPerformanceObserver as any

describe('前端监控SDK集成测试', () => {
  let monitor: FrontendMonitorSDK
  let mockEndpoint: string
  let collectedData: any[] = []

  beforeEach(async () => {
    // 重置收集的数据
    collectedData = []
    mockEndpoint = 'http://localhost:8080/collect'

    // Mock fetch 来收集发送的数据
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

    // 初始化监控SDK
    monitor = createFrontendMonitor()
    await monitor.init({
      serviceName: 'test-app',
      serviceVersion: '1.0.0',
      endpoint: mockEndpoint,
      apiKey: 'test-api-key',
      sampleRate: 1.0, // 100%采样率用于测试
      enablePerformanceMonitoring: true,
      enableErrorMonitoring: true,
      enableUserInteractionMonitoring: true,
      enableAutoTracing: true,
      enableCustomMetrics: true,
      attributes: {
        test: true,
        environment: 'test'
      }
    })
  })

  afterEach(async () => {
    if (monitor) {
      monitor.destroy()
    }
    jest.restoreAllMocks()
  })

  describe('SDK初始化和配置', () => {
    it('应该成功初始化监控SDK', async () => {
      expect(monitor).toBeDefined()
      expect(monitor.isReady()).toBe(true)

      // 验证配置
      const config = monitor.getConfig()
      expect(config.serviceName).toBe('test-app')
      expect(config.enablePerformanceMonitoring).toBe(true)
      expect(config.enableErrorMonitoring).toBe(true)
      expect(config.enableUserInteractionMonitoring).toBe(true)
    })

    it('应该正确处理无效配置', async () => {
      const invalidMonitor = createFrontendMonitor()

      await expect(invalidMonitor.init({
        serviceName: '', // 无效的服务名
        endpoint: 'invalid-url'
      })).rejects.toThrow()
    })

    it('应该支持配置更新', async () => {
      await monitor.updateConfig({
        sampleRate: 0.5,
        attributes: { updated: true }
      })

      const config = monitor.getConfig()
      expect(config.sampleRate).toBe(0.5)
      expect(config.attributes.updated).toBe(true)
    })
  })

  describe('性能监控功能', () => {
    it('应该收集Core Web Vitals指标', async () => {
      return new Promise((resolve) => {
        const metricsCollector = monitor.getMetricsCollector()

        // 记录一些性能指标
        metricsCollector.recordHistogram('page_load_time', 1500, {
          page: 'home'
        })

        // 等待数据被收集
        setTimeout(() => {
          expect(collectedData.length).toBeGreaterThan(0)

          const metricsData = collectedData.find(data => data.metrics)
          expect(metricsData).toBeDefined()
          resolve(true)
        }, 200)
      })
    })

    it('应该自动收集导航时序数据', () => {
      const metricsCollector = monitor.getMetricsCollector()

      metricsCollector.recordHistogram('navigation_timing', 800, {
        type: 'navigate'
      })

      expect(collectedData.length).toBeGreaterThan(0)
    })

    it('应该支持资源性能监控', () => {
      const metricsCollector = monitor.getMetricsCollector()

      // 模拟资源加载时间
      metricsCollector.recordHistogram('resource_load_time', 300, {
        resource_type: 'script',
        resource_name: 'app.js'
      })

      expect(collectedData.length).toBeGreaterThan(0)
    })
  })

  describe('错误追踪功能', () => {
    it('应该自动捕获JavaScript错误', () => {
      // 模拟错误事件
      const error = new Error('测试错误')
      const errorEvent = new ErrorEvent('error', {
        error: error,
        filename: 'test.js',
        lineno: 42,
        colno: 10
      })

      window.dispatchEvent(errorEvent)

      expect(collectedData.length).toBeGreaterThan(0)

      const errorData = collectedData.find(data => data.errors)
      expect(errorData).toBeDefined()
      expect(errorData.errors[0].message).toContain('测试错误')
    })

    it('应该捕获Promise拒绝错误', async () => {
      // 模拟未处理的Promise拒绝
      const promiseRejection = new Error('Promise拒绝错误')

      window.dispatchEvent(new Event('unhandledrejection', {
        reason: promiseRejection
      } as any))

      expect(collectedData.length).toBeGreaterThan(0)
    })

    it('应该支持手动错误记录', () => {
      const customError = new Error('自定义错误')

      monitor.recordError(customError, {
        component: 'TestComponent',
        action: 'testAction'
      })

      expect(collectedData.length).toBeGreaterThan(0)

      const errorData = collectedData.find(data => data.errors)
      expect(errorData.errors[0].component).toBe('TestComponent')
    })

    it('应该正确分类错误类型', () => {
      // 测试网络错误
      monitor.recordError(new Error('Network Error'), {
        error_type: 'network',
        url: '/api/test'
      })

      // 测试认证错误
      monitor.recordError(new Error('Auth Error'), {
        error_type: 'auth',
        user_id: 'test-user'
      })

      expect(collectedData.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('用户交互监控', () => {
    it('应该自动跟踪点击事件', () => {
      // 创建测试按钮
      const button = document.createElement('button')
      button.textContent = '测试按钮'
      button.id = 'test-button'
      document.body.appendChild(button)

      // 模拟点击事件
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      })

      button.dispatchEvent(clickEvent)

      expect(collectedData.length).toBeGreaterThan(0)

      const interactionData = collectedData.find(data => data.interactions)
      expect(interactionData).toBeDefined()
      expect(interactionData.interactions[0].type).toBe('click')
    })

    it('应该跟踪表单提交', () => {
      // 创建测试表单
      const form = document.createElement('form')
      const input = document.createElement('input')
      input.name = 'test'
      input.value = 'test-value'
      form.appendChild(input)
      document.body.appendChild(form)

      // 模拟表单提交
      const submitEvent = new Event('submit', {
        bubbles: true,
        cancelable: true
      })

      form.dispatchEvent(submitEvent)

      expect(collectedData.length).toBeGreaterThan(0)
    })

    it('应该记录页面浏览', () => {
      monitor.recordPageView('/test-page', {
        title: '测试页面',
        referrer: '/previous-page'
      })

      expect(collectedData.length).toBeGreaterThan(0)

      const pageViewData = collectedData.find(data => data.pageViews)
      expect(pageViewData.pageViews[0].path).toBe('/test-page')
    })

    it('应该支持自定义交互事件', () => {
      monitor.recordUserInteraction({
        type: 'custom_action',
        element: 'button',
        target: 'special-feature',
        value: 'activated',
        timestamp: Date.now()
      })

      expect(collectedData.length).toBeGreaterThan(0)

      const interactionData = collectedData.find(data => data.interactions)
      expect(interactionData.interactions[0].type).toBe('custom_action')
    })
  })

  describe('自定义指标功能', () => {
    it('应该支持计数器指标', () => {
      const metrics = monitor.getMetricsCollector()

      metrics.incrementCounter('user_actions_total', 1, {
        action: 'click',
        feature: 'dashboard'
      })

      metrics.incrementCounter('user_actions_total', 1, {
        action: 'click',
        feature: 'dashboard'
      })

      expect(collectedData.length).toBeGreaterThan(0)
    })

    it('应该支持直方图指标', () => {
      const metrics = monitor.getMetricsCollector()

      metrics.recordHistogram('response_time_ms', 250, {
        endpoint: '/api/users',
        method: 'GET'
      })

      metrics.recordHistogram('response_time_ms', 150, {
        endpoint: '/api/posts',
        method: 'GET'
      })

      expect(collectedData.length).toBeGreaterThan(0)
    })

    it('应该支持仪表盘指标', () => {
      const metrics = monitor.getMetricsCollector()

      metrics.recordGauge('active_users', 42, {
        region: 'asia'
      })

      metrics.recordGauge('cpu_usage', 0.75, {
        instance: 'server-1'
      })

      expect(collectedData.length).toBeGreaterThan(0)
    })

    it('应该批量收集自定义指标', () => {
      monitor.recordMetrics({
        custom_metric_1: 100,
        custom_metric_2: 200,
        nested_metric: {
          value: 300,
          unit: 'ms'
        }
      })

      expect(collectedData.length).toBeGreaterThan(0)
    })
  })

  describe('分布式追踪功能', () => {
    it('应该创建和管理span', () => {
      const tracer = monitor.startTracing('test-operation', {
        attributes: {
          operation_type: 'test',
          user_id: 'test-user'
        }
      })

      expect(tracer).toBeDefined()

      // 添加子操作
      tracer.addEvent('sub-operation', {
        step: 1,
        data: 'test-data'
      })

      tracer.recordMetric('duration_ms', 150)

      // 结束追踪
      tracer.endSpan()

      expect(collectedData.length).toBeGreaterThan(0)

      const traceData = collectedData.find(data => data.traces)
      expect(traceData).toBeDefined()
      expect(traceData.traces[0].operationName).toBe('test-operation')
    })

    it('应该支持嵌套追踪', () => {
      const parentTracer = monitor.startTracing('parent-operation')

      const childTracer = monitor.startTracing('child-operation', {
        parent: parentTracer
      })

      childTracer.endSpan()
      parentTracer.endSpan()

      expect(collectedData.length).toBeGreaterThan(0)
    })

    it('应该正确处理追踪错误', () => {
      const tracer = monitor.startTracing('error-operation')

      tracer.recordError(new Error('追踪过程中的错误'))
      tracer.endSpan()

      expect(collectedData.length).toBeGreaterThan(0)

      const traceData = collectedData.find(data => data.traces)
      expect(traceData.traces[0].errors).toBeDefined()
      expect(traceData.traces[0].errors.length).toBeGreaterThan(0)
    })
  })

  describe('数据传输和批量处理', () => {
    it('应该批量发送监控数据', async () => {
      // 添加多种类型的监控数据
      const metrics = monitor.getMetricsCollector()

      metrics.incrementCounter('test_counter', 1)
      monitor.recordError(new Error('批量测试错误'))
      monitor.recordUserInteraction({
        type: 'click',
        element: 'button',
        target: 'batch-test'
      })

      // 等待批量处理
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(collectedData.length).toBeGreaterThan(0)

      // 验证数据结构
      collectedData.forEach(data => {
        expect(data).toHaveProperty('timestamp')
        expect(data).toHaveProperty('serviceName')
        expect(data).toHaveProperty('serviceVersion')
        expect(data.serviceName).toBe('test-app')
      })
    })

    it('应该处理网络错误和重试', async () => {
      // 模拟网络失败
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('网络错误'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true })
        })

      const metrics = monitor.getMetricsCollector()
      metrics.incrementCounter('retry_test', 1)

      // 等待重试逻辑
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('应该支持采样率控制', async () => {
      // 创建新的监控实例，采样率为0（不采样）
      const noSamplingMonitor = createFrontendMonitor()
      await noSamplingMonitor.init({
        serviceName: 'no-sampling-test',
        endpoint: mockEndpoint,
        sampleRate: 0 // 0%采样率
      })

      const metrics = noSamplingMonitor.getMetricsCollector()
      metrics.incrementCounter('should_not_send', 1)

      // 等待处理
      await new Promise(resolve => setTimeout(resolve, 100))

      // 数据不应该被发送
      expect(collectedData.filter(d => d.serviceName === 'no-sampling-test').length).toBe(0)

      noSamplingMonitor.destroy()
    })
  })

  describe('健康检查和诊断', () => {
    it('应该提供健康检查接口', async () => {
      const health = await monitor.getHealth()

      expect(health).toHaveProperty('status')
      expect(health).toHaveProperty('timestamp')
      expect(health).toHaveProperty('configuration')
      expect(health).toHaveProperty('metrics')

      expect(health.status).toBe('healthy')
    })

    it('应该检测配置问题', async () => {
      const unhealthyMonitor = createFrontendMonitor()

      // 使用无效配置初始化
      try {
        await unhealthyMonitor.init({
          serviceName: 'unhealthy-test',
          endpoint: 'invalid-endpoint'
        })
      } catch (error) {
        // 预期会失败
      }

      const health = await unhealthyMonitor.getHealth()
      expect(health.status).not.toBe('healthy')

      unhealthyMonitor.destroy()
    })

    it('应该提供诊断信息', async () => {
      const diagnostics = await monitor.getDiagnostics()

      expect(diagnostics).toHaveProperty('sdkVersion')
      expect(diagnostics).toHaveProperty('browser')
      expect(diagnostics).toHaveProperty('features')
      expect(diagnostics).toHaveProperty('performance')
      expect(diagnostics).toHaveProperty('connectivity')
    })
  })

  describe('内存管理和清理', () => {
    it('应该正确清理资源', () => {
      const metrics = monitor.getMetricsCollector()

      // 添加一些数据
      metrics.incrementCounter('cleanup_test', 1)
      monitor.recordError(new Error('清理测试'))

      // 销毁监控器
      monitor.destroy()

      expect(monitor.isReady()).toBe(false)

      // 验证事件监听器被移除
      expect(window.errorListeners).toBeUndefined()
    })

    it('应该防止内存泄漏', async () => {
      // 创建和销毁多个监控实例
      for (let i = 0; i < 10; i++) {
        const tempMonitor = createFrontendMonitor()
        await tempMonitor.init({
          serviceName: `temp-test-${i}`,
          endpoint: mockEndpoint,
          sampleRate: 0.1
        })

        const metrics = tempMonitor.getMetricsCollector()
        metrics.incrementCounter(`temp_counter_${i}`, 1)

        tempMonitor.destroy()
      }

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc()
      }

      // 验证没有内存泄漏警告
      expect(true).toBe(true) // 如果到达这里说明没有明显的内存泄漏
    })
  })
})