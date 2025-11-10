/**
 * API综合测试套件
 *
 * 本测试套件全面验证前端监控SDK的所有API和配置选项：
 * - 配置接口测试
 * - 指标收集API测试
 * - 错误监控API测试
 * - 用户交互API测试
 * - 追踪API测试
 * - 健康检查API测试
 * - 管理API测试
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { createFrontendMonitor, type FrontendMonitorSDK } from '../src/index'

// 设置基础浏览器环境
const mockWindow = {
  performance: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    navigation: {
      fetchStart: Date.now(),
      domContentLoadedEventEnd: Date.now() + 1000,
      loadEventEnd: Date.now() + 1500
    }
  },
  navigator: {
    userAgent: 'API Test Browser'
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn()
}

const mockDocument = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  createElement: jest.fn(() => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    appendChild: jest.fn()
  }))
}

global.window = mockWindow as any
global.document = mockDocument as any
global.navigator = mockWindow.navigator
global.performance = mockWindow.performance

describe('API综合测试', () => {
  let monitor: FrontendMonitorSDK
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
    if (monitor) {
      monitor.destroy()
    }
    jest.restoreAllMocks()
  })

  describe('配置API测试', () => {
    it('应该接受完整的配置选项', async () => {
      const fullConfig = {
        serviceName: 'api-test-full',
        serviceVersion: '2.1.0',
        endpoint: 'https://test-collector.example.com/collect',
        apiKey: 'test-api-key-12345',
        sampleRate: 0.8,
        enablePerformanceMonitoring: true,
        enableErrorMonitoring: true,
        enableUserInteractionMonitoring: true,
        enableAutoTracing: true,
        enableCustomMetrics: true,
        batchSettings: {
          maxBatchSize: 100,
          flushInterval: 5000,
          maxWaitTime: 10000
        },
        attributes: {
          environment: 'test',
          version: '2.1.0',
          region: 'asia-east1',
          custom_attribute: 'test_value'
        }
      }

      monitor = createFrontendMonitor()
      await monitor.init(fullConfig)

      expect(monitor.isReady()).toBe(true)

      const currentConfig = monitor.getConfig()
      expect(currentConfig.serviceName).toBe(fullConfig.serviceName)
      expect(currentConfig.serviceVersion).toBe(fullConfig.serviceVersion)
      expect(currentConfig.sampleRate).toBe(fullConfig.sampleRate)
    })

    it('应该处理最小配置', async () => {
      const minimalConfig = {
        serviceName: 'api-test-minimal',
        endpoint: 'https://test-collector.example.com/collect'
      }

      monitor = createFrontendMonitor()
      await monitor.init(minimalConfig)

      expect(monitor.isReady()).toBe(true)

      const config = monitor.getConfig()
      expect(config.serviceName).toBe(minimalConfig.serviceName)
      expect(config.endpoint).toBe(minimalConfig.endpoint)
    })

    it('应该拒绝无效配置', async () => {
      const invalidConfigs = [
        { serviceName: '', endpoint: 'https://test.com' }, // 空服务名
        { serviceName: 'test', endpoint: '' }, // 空端点
        { serviceName: 'test', endpoint: 'invalid-url' }, // 无效URL
        { serviceName: 'test', endpoint: 'https://test.com', sampleRate: -1 }, // 无效采样率
        { serviceName: 'test', endpoint: 'https://test.com', sampleRate: 2 } // 无效采样率
      ]

      for (const invalidConfig of invalidConfigs) {
        const testMonitor = createFrontendMonitor()

        await expect(testMonitor.init(invalidConfig)).rejects.toThrow()

        testMonitor.destroy()
      }
    })

    it('应该支持配置更新', async () => {
      const initialConfig = {
        serviceName: 'api-test-update',
        endpoint: 'https://test-collector.example.com/collect',
        sampleRate: 0.5,
        attributes: { initial: true }
      }

      monitor = createFrontendMonitor()
      await monitor.init(initialConfig)

      // 更新配置
      await monitor.updateConfig({
        sampleRate: 0.8,
        attributes: {
          initial: true,
          updated: true,
          newAttribute: 'test'
        }
      })

      const updatedConfig = monitor.getConfig()
      expect(updatedConfig.sampleRate).toBe(0.8)
      expect(updatedConfig.attributes.updated).toBe(true)
      expect(updatedConfig.attributes.newAttribute).toBe('test')
    })
  })

  describe('指标收集API测试', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'api-test-metrics',
        endpoint: 'https://test-collector.example.com/collect'
      })
    })

    it('应该支持计数器指标', () => {
      const metrics = monitor.getMetricsCollector()

      metrics.incrementCounter('test_counter', 1, {
        tag1: 'value1',
        tag2: 'value2'
      })

      metrics.incrementCounter('test_counter', 2)

      // 等待数据处理
      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const metricsData = collectedData.find(data => data.metrics)
        expect(metricsData).toBeDefined()
      }, 100)
    })

    it('应该支持直方图指标', () => {
      const metrics = monitor.getMetricsCollector()

      metrics.recordHistogram('response_time_ms', 150, {
        endpoint: '/api/test',
        method: 'GET',
        status_code: '200'
      })

      metrics.recordHistogram('response_time_ms', 300, {
        endpoint: '/api/test',
        method: 'POST',
        status_code: '201'
      })

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const metricsData = collectedData.find(data => data.metrics)
        expect(metricsData).toBeDefined()
      }, 100)
    })

    it('应该支持仪表盘指标', () => {
      const metrics = monitor.getMetricsCollector()

      metrics.recordGauge('active_connections', 42, {
        server: 'web-1',
        region: 'asia-east1'
      })

      metrics.recordGauge('cpu_usage', 0.75, {
        server: 'web-1',
        region: 'asia-east1'
      })

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const metricsData = collectedData.find(data => data.metrics)
        expect(metricsData).toBeDefined()
      }, 100)
    })

    it('应该支持批量指标记录', () => {
      const metrics = monitor.getMetricsCollector()

      const batchMetrics = {
        counter_metric: 100,
        histogram_metric: [100, 200, 300],
        gauge_metric: 42.5,
        nested_metric: {
          value: 200,
          unit: 'ms'
        }
      }

      monitor.recordMetrics(batchMetrics)

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const metricsData = collectedData.find(data => data.metrics)
        expect(metricsData).toBeDefined()
      }, 100)
    })
  })

  describe('错误监控API测试', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'api-test-errors',
        endpoint: 'https://test-collector.example.com/collect',
        enableErrorMonitoring: true
      })
    })

    it('应该支持错误对象记录', () => {
      const error = new Error('测试错误消息')
      error.stack = 'Error: 测试错误消息\n    at test.js:10:5'

      monitor.recordError(error, {
        component: 'TestComponent',
        action: 'testAction',
        user_id: 'test_user_123'
      })

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.find(data => data.errors)
        expect(errorData).toBeDefined()
        expect(errorData.errors[0].message).toBe('测试错误消息')
        expect(errorData.errors[0].component).toBe('TestComponent')
      }, 100)
    })

    it('应该支持字符串错误记录', () => {
      monitor.recordError('字符串错误消息', {
        type: 'string_error',
        context: 'test_context'
      })

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.find(data => data.errors)
        expect(errorData).toBeDefined()
        expect(errorData.errors[0].message).toBe('字符串错误消息')
      }, 100)
    })

    it('应该支持复杂错误对象', () => {
      const complexError = {
        name: 'CustomError',
        message: '自定义错误',
        code: 'CUSTOM_ERROR_CODE',
        details: {
          field: 'test_field',
          value: 'invalid_value'
        }
      }

      monitor.recordError(complexError as any, {
        error_type: 'custom',
        severity: 'high'
      })

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.find(data => data.errors)
        expect(errorData).toBeDefined()
        expect(errorData.errors[0].code).toBe('CUSTOM_ERROR_CODE')
      }, 100)
    })

    it('应该支持错误分类', () => {
      // 网络错误
      monitor.recordError(new Error('Network Error'), {
        error_type: 'network',
        url: '/api/test',
        method: 'GET',
        status_code: 500
      })

      // 认证错误
      monitor.recordError(new Error('Authentication Failed'), {
        error_type: 'auth',
        user_id: 'user_123',
        auth_method: 'jwt'
      })

      // 权限错误
      monitor.recordError(new Error('Access Denied'), {
        error_type: 'permission',
        resource: '/admin/users',
        required_role: 'admin'
      })

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.filter(data => data.errors)
        expect(errorData.length).toBe(3)
      }, 100)
    })
  })

  describe('用户交互API测试', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'api-test-interactions',
        endpoint: 'https://test-collector.example.com/collect',
        enableUserInteractionMonitoring: true
      })
    })

    it('应该支持点击交互记录', () => {
      monitor.recordUserInteraction({
        type: 'click',
        element: 'button',
        target: 'submit-button',
        text: 'Submit Form',
        attributes: {
          'data-test-id': 'submit-btn',
          class: 'btn btn-primary'
        },
        timestamp: Date.now()
      })

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const interactionData = collectedData.find(data => data.interactions)
        expect(interactionData).toBeDefined()
        expect(interactionData.interactions[0].type).toBe('click')
        expect(interactionData.interactions[0].element).toBe('button')
      }, 100)
    })

    it('应该支持表单交互记录', () => {
      monitor.recordUserInteraction({
        type: 'form_submit',
        element: 'form',
        target: 'contact-form',
        form_data: {
          name: 'Test User',
          email: 'test@example.com',
          message: 'Test message'
        },
        validation_errors: [
          { field: 'email', message: 'Invalid email format' }
        ],
        timestamp: Date.now()
      })

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const interactionData = collectedData.find(data => data.interactions)
        expect(interactionData).toBeDefined()
        expect(interactionData.interactions[0].type).toBe('form_submit')
      }, 100)
    })

    it('应该支持导航交互记录', () => {
      monitor.recordUserInteraction({
        type: 'navigation',
        element: 'link',
        target: '/products/123',
        from: '/products',
        to: '/products/123',
        method: 'push',
        timestamp: Date.now()
      })

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const interactionData = collectedData.find(data => data.interactions)
        expect(interactionData).toBeDefined()
        expect(interactionData.interactions[0].type).toBe('navigation')
      }, 100)
    })

    it('应该支持自定义交互类型', () => {
      monitor.recordUserInteraction({
        type: 'feature_toggle',
        element: 'switch',
        target: 'dark-mode-toggle',
        feature_name: 'dark_mode',
        previous_value: false,
        new_value: true,
        timestamp: Date.now()
      })

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const interactionData = collectedData.find(data => data.interactions)
        expect(interactionData).toBeDefined()
        expect(interactionData.interactions[0].type).toBe('feature_toggle')
      }, 100)
    })
  })

  describe('追踪API测试', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'api-test-tracing',
        endpoint: 'https://test-collector.example.com/collect',
        enableAutoTracing: true
      })
    })

    it('应该支持基本追踪操作', () => {
      const tracer = monitor.startTracing('test_operation', {
        attributes: {
          operation_type: 'test',
          user_id: 'test_user_123'
        }
      })

      expect(tracer).toBeDefined()
      expect(typeof tracer.addEvent).toBe('function')
      expect(typeof tracer.recordMetric).toBe('function')
      expect(typeof tracer.recordError).toBe('function')
      expect(typeof tracer.endSpan).toBe('function')

      tracer.addEvent('operation_started', { step: 1 })
      tracer.recordMetric('processing_time', 150)

      tracer.endSpan()

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const traceData = collectedData.find(data => data.traces)
        expect(traceData).toBeDefined()
        expect(traceData.traces[0].operationName).toBe('test_operation')
      }, 100)
    })

    it('应该支持嵌套追踪', () => {
      const parentTracer = monitor.startTracing('parent_operation')

      const childTracer1 = monitor.startTracing('child_operation_1', {
        parent: parentTracer
      })

      const childTracer2 = monitor.startTracing('child_operation_2', {
        parent: parentTracer
      })

      childTracer1.endSpan()
      childTracer2.endSpan()
      parentTracer.endSpan()

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const traceData = collectedData.find(data => data.traces)
        expect(traceData).toBeDefined()
        expect(traceData.traces.length).toBe(3) // 父操作 + 2个子操作
      }, 100)
    })

    it('应该支持追踪错误处理', () => {
      const tracer = monitor.startTracing('error_operation')

      tracer.addEvent('operation_started')

      tracer.recordError(new Error('操作过程中发生错误'), {
        step: 'processing',
        input_data: 'test_data'
      })

      tracer.addEvent('operation_failed')
      tracer.endSpan()

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const traceData = collectedData.find(data => data.traces)
        expect(traceData).toBeDefined()
        expect(traceData.traces[0].errors).toBeDefined()
        expect(traceData.traces[0].errors.length).toBeGreaterThan(0)
      }, 100)
    })

    it('应该支持追踪指标记录', () => {
      const tracer = monitor.startTracing('metrics_operation')

      tracer.recordMetric('input_size', 1024)
      tracer.recordMetric('processing_time_ms', 250)
      tracer.recordMetric('output_size', 512)
      tracer.recordMetric('memory_usage_mb', 64)

      tracer.endSpan()

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const traceData = collectedData.find(data => data.traces)
        expect(traceData).toBeDefined()
        expect(traceData.traces[0].metrics).toBeDefined()
      }, 100)
    })
  })

  describe('健康检查API测试', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'api-test-health',
        endpoint: 'https://test-collector.example.com/collect'
      })
    })

    it('应该提供健康状态检查', async () => {
      const health = await monitor.getHealth()

      expect(health).toHaveProperty('status')
      expect(health).toHaveProperty('timestamp')
      expect(health).toHaveProperty('configuration')
      expect(health).toHaveProperty('metrics')
      expect(health).toHaveProperty('uptime')

      expect(typeof health.status).toBe('string')
      expect(typeof health.timestamp).toBe('number')
      expect(typeof health.uptime).toBe('number')
    })

    it('应该提供详细诊断信息', async () => {
      const diagnostics = await monitor.getDiagnostics()

      expect(diagnostics).toHaveProperty('sdkVersion')
      expect(diagnostics).toHaveProperty('browser')
      expect(diagnostics).toHaveProperty('features')
      expect(diagnostics).toHaveProperty('performance')
      expect(diagnostics).toHaveProperty('connectivity')

      expect(diagnostics.features).toHaveProperty('performanceObserver')
      expect(diagnostics.features).toHaveProperty('intersectionObserver')
      expect(diagnostics.features).toHaveProperty('mutationObserver')
      expect(diagnostics.features).toHaveProperty('fetch')
    })

    it('应该检测连接状态', async () => {
      const connectivity = await monitor.checkConnectivity()

      expect(connectivity).toHaveProperty('status')
      expect(connectivity).toHaveProperty('latency')
      expect(connectivity).toHaveProperty('endpointReachable')
      expect(connectivity).toHaveProperty('lastCheck')

      expect(typeof connectivity.status).toBe('string')
      expect(typeof connectivity.latency).toBe('number')
      expect(typeof connectivity.endpointReachable).toBe('boolean')
    })
  })

  describe('管理API测试', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'api-test-management',
        endpoint: 'https://test-collector.example.com/collect'
      })
    })

    it('应该支持手动刷新数据', async () => {
      const metrics = monitor.getMetricsCollector()
      metrics.incrementCounter('flush_test', 1)

      // 手动刷新
      await monitor.flush()

      // 验证数据被发送
      expect(collectedData.length).toBeGreaterThan(0)
    })

    it('应该支持暂停和恢复监控', async () => {
      // 暂停监控
      monitor.pause()

      // 添加数据（不应该被发送）
      const metrics = monitor.getMetricsCollector()
      metrics.incrementCounter('paused_test', 1)

      await new Promise(resolve => setTimeout(resolve, 200))

      // 数据不应该被发送
      expect(collectedData.length).toBe(0)

      // 恢复监控
      monitor.resume()

      // 添加数据（应该被发送）
      metrics.incrementCounter('resumed_test', 1)

      await new Promise(resolve => setTimeout(resolve, 200))

      // 数据应该被发送
      expect(collectedData.length).toBeGreaterThan(0)
    })

    it('应该支持配置验证', () => {
      const validConfig = {
        serviceName: 'validation-test',
        endpoint: 'https://test-collector.example.com/collect',
        sampleRate: 0.8
      }

      const validation = monitor.validateConfig(validConfig)

      expect(validation).toHaveProperty('valid')
      expect(validation).toHaveProperty('errors')
      expect(validation.valid).toBe(true)
      expect(validation.errors).toEqual([])
    })

    it('应该检测配置错误', () => {
      const invalidConfig = {
        serviceName: '',
        endpoint: 'invalid-url',
        sampleRate: -1
      }

      const validation = monitor.validateConfig(invalidConfig)

      expect(validation).toHaveProperty('valid')
      expect(validation).toHaveProperty('errors')
      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('应该支持获取统计信息', () => {
      const metrics = monitor.getMetricsCollector()

      // 添加一些数据
      metrics.incrementCounter('stats_counter', 1)
      metrics.recordHistogram('stats_histogram', 100)
      monitor.recordError(new Error('统计测试错误'))
      monitor.recordUserInteraction({
        type: 'click',
        element: 'button',
        target: 'stats-button'
      })

      const stats = monitor.getStatistics()

      expect(stats).toHaveProperty('metricsCount')
      expect(stats).toHaveProperty('errorsCount')
      expect(stats).toHaveProperty('interactionsCount')
      expect(stats).toHaveProperty('tracesCount')
      expect(stats).toHaveProperty('dataSent')
      expect(stats).toHaveProperty('uptime')

      expect(typeof stats.metricsCount).toBe('number')
      expect(typeof stats.errorsCount).toBe('number')
      expect(typeof stats.interactionsCount).toBe('number')
    })
  })

  describe('批量操作API测试', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'api-test-batch',
        endpoint: 'https://test-collector.example.com/collect',
        batchSettings: {
          maxBatchSize: 10,
          flushInterval: 1000,
          maxWaitTime: 5000
        }
      })
    })

    it('应该支持批量记录操作', () => {
      const batchOperations = [
        () => {
          const metrics = monitor.getMetricsCollector()
          metrics.incrementCounter('batch_counter_1', 1)
        },
        () => {
          monitor.recordError(new Error('批量测试错误1'))
        },
        () => {
          monitor.recordUserInteraction({
            type: 'click',
            element: 'button',
            target: 'batch-button-1'
          })
        },
        () => {
          const tracer = monitor.startTracing('batch_operation_1')
          tracer.endSpan()
        }
      ]

      // 执行批量操作
      batchOperations.forEach(operation => operation())

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
      }, 200)
    })

    it('应该支持大型数据集处理', () => {
      const dataSize = 1000

      for (let i = 0; i < dataSize; i++) {
        const metrics = monitor.getMetricsCollector()
        metrics.incrementCounter('large_dataset_counter', 1, { index: i })
      }

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        // 验证数据被正确批量处理
        const totalMetrics = collectedData.reduce((sum, data) => {
          return sum + (data.metrics ? Object.keys(data.metrics).length : 0)
        }, 0)

        expect(totalMetrics).toBeGreaterThan(0)
      }, 500)
    })
  })

  describe('边缘情况API测试', () => {
    it('应该处理空值和null参数', async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'api-test-edge-cases',
        endpoint: 'https://test-collector.example.com/collect'
      })

      // 测试空值参数
      expect(() => {
        monitor.recordError(null as any)
      }).not.toThrow()

      expect(() => {
        monitor.recordError(undefined as any)
      }).not.toThrow()

      expect(() => {
        monitor.recordUserInteraction(null as any)
      }).not.toThrow()

      expect(() => {
        monitor.recordMetrics(null as any)
      }).not.toThrow()
    })

    it('应该处理极值参数', async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'api-test-extreme-values',
        endpoint: 'https://test-collector.example.com/collect'
      })

      const metrics = monitor.getMetricsCollector()

      // 测试极大值
      expect(() => {
        metrics.recordHistogram('extreme_large', Number.MAX_SAFE_INTEGER)
      }).not.toThrow()

      // 测试极小值
      expect(() => {
        metrics.recordHistogram('extreme_small', Number.MIN_VALUE)
      }).not.toThrow()

      // 测试负值
      expect(() => {
        metrics.recordHistogram('negative', -100)
      }).not.toThrow()

      // 测试零值
      expect(() => {
        metrics.recordHistogram('zero', 0)
      }).not.toThrow()
    })

    it('应该处理特殊字符', async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'api-test-special-chars',
        endpoint: 'https://test-collector.example.com/collect'
      })

      const specialStrings = [
        '特殊字符测试！@#￥%……&*（）',
        '🚀 Rocket emoji test',
        'Multi\nLine\nString',
        'String with "quotes" and \'apostrophes\'',
        'URL: https://example.com/path?param=value&other=test',
        'JSON: {"key": "value", "number": 123}',
        '<script>alert("XSS test")</script>'
      ]

      specialStrings.forEach(str => {
        expect(() => {
          monitor.recordError(new Error(str))
        }).not.toThrow()

        expect(() => {
          monitor.recordUserInteraction({
            type: 'click',
            element: 'button',
            target: str
          })
        }).not.toThrow()
      })

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
      }, 200)
    })
  })
})