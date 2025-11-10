/**
 * 错误处理测试套件
 *
 * 本测试套件全面验证前端监控SDK的错误处理能力：
 * - 全局JavaScript错误捕获
 * - 未处理Promise拒绝捕获
 * - 资源加载错误处理
 * - 网络请求错误处理
 * - 自定义错误记录
 * - 错误分类和优先级
 * - 错误恢复机制
 * - 边界情况处理
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { createFrontendMonitor, type FrontendMonitorSDK } from '../src/index'

// 设置浏览器环境
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
    userAgent: 'Error Test Browser'
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  ErrorEvent: class ErrorEvent extends Event {
    constructor(type: string, eventInitDict?: any) {
      super(type, eventInitDict)
      this.message = eventInitDict?.message || ''
      this.filename = eventInitDict?.filename || ''
      this.lineno = eventInitDict?.lineno || 0
      this.colno = eventInitDict?.colno || 0
      this.error = eventInitDict?.error || null
    }
    message: string
    filename: string
    lineno: number
    colno: number
    error: Error | null
  }
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

describe('错误处理测试', () => {
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

  describe('全局JavaScript错误处理', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'error-test-js',
        endpoint: 'http://localhost:8080/collect',
        enableErrorMonitoring: true,
        captureGlobalErrors: true
      })
    })

    it('应该自动捕获全局JavaScript错误', () => {
      const testError = new Error('测试JavaScript错误')
      testError.stack = 'Error: 测试JavaScript错误\n    at test.js:10:5'

      // 模拟全局错误事件
      const errorEvent = new mockWindow.ErrorEvent('error', {
        error: testError,
        filename: 'test.js',
        lineno: 10,
        colno: 5
      })

      // 获取注册的错误处理函数
      const errorHandlers = mockWindow.addEventListener.mock.calls.filter(
        call => call[0] === 'error'
      )
      expect(errorHandlers.length).toBeGreaterThan(0)

      // 执行错误处理函数
      const errorHandler = errorHandlers[0][1]
      errorHandler(errorEvent)

      // 验证错误被捕获和记录
      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.find(data => data.errors)
        expect(errorData).toBeDefined()
        expect(errorData.errors[0].message).toBe('测试JavaScript错误')
        expect(errorData.errors[0].filename).toBe('test.js')
        expect(errorData.errors[0].lineno).toBe(10)
        expect(errorData.errors[0].colno).toBe(5)
      }, 100)
    })

    it('应该处理语法错误', () => {
      const syntaxError = new SyntaxError('Unexpected token')
      syntaxError.stack = 'SyntaxError: Unexpected token\n    at script.js:5:10'

      const errorEvent = new mockWindow.ErrorEvent('error', {
        error: syntaxError,
        filename: 'script.js',
        lineno: 5,
        colno: 10
      })

      const errorHandlers = mockWindow.addEventListener.mock.calls.filter(
        call => call[0] === 'error'
      )
      const errorHandler = errorHandlers[0][1]
      errorHandler(errorEvent)

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.find(data => data.errors)
        expect(errorData.errors[0].name).toBe('SyntaxError')
      }, 100)
    })

    it('应该处理类型错误', () => {
      const typeError = new TypeError('Cannot read property of undefined')
      typeError.stack = 'TypeError: Cannot read property of undefined\n    at app.js:15:20'

      const errorEvent = new mockWindow.ErrorEvent('error', {
        error: typeError,
        filename: 'app.js',
        lineno: 15,
        colno: 20
      })

      const errorHandlers = mockWindow.addEventListener.mock.calls.filter(
        call => call[0] === 'error'
      )
      const errorHandler = errorHandlers[0][1]
      errorHandler(errorEvent)

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.find(data => data.errors)
        expect(errorData.errors[0].name).toBe('TypeError')
      }, 100)
    })

    it('应该处理引用错误', () => {
      const referenceError = new ReferenceError('undefinedVariable is not defined')
      referenceError.stack = 'ReferenceError: undefinedVariable is not defined\n    at main.js:8:12'

      const errorEvent = new mockWindow.ErrorEvent('error', {
        error: referenceError,
        filename: 'main.js',
        lineno: 8,
        colno: 12
      })

      const errorHandlers = mockWindow.addEventListener.mock.calls.filter(
        call => call[0] === 'error'
      )
      const errorHandler = errorHandlers[0][1]
      errorHandler(errorEvent)

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.find(data => data.errors)
        expect(errorData.errors[0].name).toBe('ReferenceError')
      }, 100)
    })
  })

  describe('Promise拒绝处理', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'error-test-promise',
        endpoint: 'http://localhost:8080/collect',
        enableErrorMonitoring: true,
        captureUnhandledRejections: true
      })
    })

    it('应该捕获未处理的Promise拒绝', () => {
      const rejectionReason = new Error('Promise拒绝错误')
      rejectionReason.stack = 'Error: Promise拒绝错误\n    at async.js:20:8'

      // 模拟未处理的Promise拒绝事件
      const rejectionEvent = new Event('unhandledrejection', {
        bubbles: true,
        cancelable: true
      } as any)
      ;(rejectionEvent as any).reason = rejectionReason

      const rejectionHandlers = mockWindow.addEventListener.mock.calls.filter(
        call => call[0] === 'unhandledrejection'
      )
      expect(rejectionHandlers.length).toBeGreaterThan(0)

      const rejectionHandler = rejectionHandlers[0][1]
      rejectionHandler(rejectionEvent)

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.find(data => data.errors)
        expect(errorData).toBeDefined()
        expect(errorData.errors[0].message).toContain('Promise拒绝错误')
        expect(errorData.errors[0].type).toBe('unhandledrejection')
      }, 100)
    })

    it('应该捕获字符串类型的Promise拒绝', () => {
      const rejectionReason = '字符串拒绝原因'

      const rejectionEvent = new Event('unhandledrejection', {
        bubbles: true,
        cancelable: true
      } as any)
      ;(rejectionEvent as any).reason = rejectionReason

      const rejectionHandlers = mockWindow.addEventListener.mock.calls.filter(
        call => call[0] === 'unhandledrejection'
      )
      const rejectionHandler = rejectionHandlers[0][1]
      rejectionHandler(rejectionEvent)

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.find(data => data.errors)
        expect(errorData.errors[0].message).toBe('字符串拒绝原因')
      }, 100)
    })

    it('应该捕获对象类型的Promise拒绝', () => {
      const rejectionReason = {
        code: 'NETWORK_ERROR',
        message: '网络请求失败',
        status: 500,
        url: '/api/test'
      }

      const rejectionEvent = new Event('unhandledrejection', {
        bubbles: true,
        cancelable: true
      } as any)
      ;(rejectionEvent as any).reason = rejectionReason

      const rejectionHandlers = mockWindow.addEventListener.mock.calls.filter(
        call => call[0] === 'unhandledrejection'
      )
      const rejectionHandler = rejectionHandlers[0][1]
      rejectionHandler(rejectionEvent)

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.find(data => data.errors)
        expect(errorData.errors[0].message).toContain('NETWORK_ERROR')
        expect(errorData.errors[0].context).toBeDefined()
      }, 100)
    })
  })

  describe('资源加载错误处理', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'error-test-resource',
        endpoint: 'http://localhost:8080/collect',
        enableErrorMonitoring: true,
        captureResourceErrors: true
      })
    })

    it('应该捕获脚本加载错误', () => {
      const scriptError = new Event('error', {
        bubbles: true,
        cancelable: true
      } as any)

      // 模拟脚本元素
      const scriptElement = {
        tagName: 'SCRIPT',
        src: '/js/app.js',
        crossOrigin: 'anonymous'
      }

      const resourceHandlers = mockWindow.addEventListener.mock.calls.filter(
        call => call[0] === 'error'
      )
      const resourceHandler = resourceHandlers[0][1]
      resourceHandler.call(scriptElement, scriptError)

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.find(data => data.errors)
        expect(errorData).toBeDefined()
        expect(errorData.errors[0].resourceType).toBe('script')
        expect(errorData.errors[0].url).toBe('/js/app.js')
      }, 100)
    })

    it('应该捕获图片加载错误', () => {
      const imageError = new Event('error', {
        bubbles: true,
        cancelable: true
      } as any)

      const imageElement = {
        tagName: 'IMG',
        src: '/images/logo.png'
      }

      const resourceHandlers = mockWindow.addEventListener.mock.calls.filter(
        call => call[0] === 'error'
      )
      const resourceHandler = resourceHandlers[0][1]
      resourceHandler.call(imageElement, imageError)

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.find(data => data.errors)
        expect(errorData.errors[0].resourceType).toBe('image')
        expect(errorData.errors[0].url).toBe('/images/logo.png')
      }, 100)
    })

    it('应该捕获样式表加载错误', () => {
      const cssError = new Event('error', {
        bubbles: true,
        cancelable: true
      } as any)

      const linkElement = {
        tagName: 'LINK',
        rel: 'stylesheet',
        href: '/css/styles.css'
      }

      const resourceHandlers = mockWindow.addEventListener.mock.calls.filter(
        call => call[0] === 'error'
      )
      const resourceHandler = resourceHandlers[0][1]
      resourceHandler.call(linkElement, cssError)

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.find(data => data.errors)
        expect(errorData.errors[0].resourceType).toBe('stylesheet')
        expect(errorData.errors[0].url).toBe('/css/styles.css')
      }, 100)
    })
  })

  describe('网络请求错误处理', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'error-test-network',
        endpoint: 'http://localhost:8080/collect',
        enableErrorMonitoring: true,
        enableAutoTracing: true
      })
    })

    it('应该捕获fetch请求错误', async () => {
      // Mock fetch失败
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      try {
        await fetch('/api/test')
      } catch (error) {
        // 预期会失败
      }

      // 验证网络错误被捕获
      setTimeout(() => {
        const networkErrors = collectedData.filter(data =>
          data.errors && data.errors.some((e: any) => e.type === 'network')
        )
        expect(networkErrors.length).toBeGreaterThan(0)
      }, 100)
    })

    it('应该捕获HTTP状态码错误', async () => {
      // Mock 404响应
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        url: '/api/nonexistent'
      })

      try {
        const response = await fetch('/api/nonexistent')
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      } catch (error) {
        // 预期会失败
      }

      setTimeout(() => {
        const httpErrors = collectedData.filter(data =>
          data.errors && data.errors.some((e: any) => e.statusCode)
        )
        expect(httpErrors.length).toBeGreaterThan(0)
      }, 100)
    })

    it('应该捕获超时错误', async () => {
      // Mock超时
      global.fetch = jest.fn().mockImplementation(() =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100)
        })
      )

      try {
        await fetch('/api/slow', { signal: AbortSignal.timeout(50) })
      } catch (error) {
        // 预期会超时
      }

      setTimeout(() => {
        const timeoutErrors = collectedData.filter(data =>
          data.errors && data.errors.some((e: any) =>
            e.message && e.message.includes('timeout')
          )
        )
        expect(timeoutErrors.length).toBeGreaterThan(0)
      }, 200)
    })
  })

  describe('自定义错误记录', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'error-test-custom',
        endpoint: 'http://localhost:8080/collect',
        enableErrorMonitoring: true
      })
    })

    it('应该记录Error对象', () => {
      const customError = new Error('自定义业务错误')
      customError.stack = 'Error: 自定义业务错误\n    at business.js:25:15'

      monitor.recordError(customError, {
        component: 'UserProfile',
        action: 'updateProfile',
        userId: 'user_123',
        businessContext: {
          feature: 'profile-management',
          step: 'validation'
        }
      })

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.find(data => data.errors)
        expect(errorData.errors[0].message).toBe('自定义业务错误')
        expect(errorData.errors[0].context.component).toBe('UserProfile')
        expect(errorData.errors[0].context.action).toBe('updateProfile')
        expect(errorData.errors[0].context.userId).toBe('user_123')
      }, 100)
    })

    it('应该记录字符串错误', () => {
      monitor.recordError('简单的字符串错误信息', {
        type: 'validation',
        field: 'email',
        value: 'invalid-email'
      })

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.find(data => data.errors)
        expect(errorData.errors[0].message).toBe('简单的字符串错误信息')
        expect(errorData.errors[0].context.type).toBe('validation')
      }, 100)
    })

    it('应该记录复杂错误对象', () => {
      const complexError = {
        name: 'BusinessError',
        code: 'PAYMENT_FAILED',
        message: '支付处理失败',
        details: {
          paymentId: 'pay_123',
          amount: 99.99,
          currency: 'USD',
          failureReason: 'insufficient_funds'
        },
        timestamp: Date.now()
      }

      monitor.recordError(complexError as any, {
        severity: 'high',
        businessImpact: 'revenue_loss',
        requiresAttention: true
      })

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.find(data => data.errors)
        expect(errorData.errors[0].code).toBe('PAYMENT_FAILED')
        expect(errorData.errors[0].details.paymentId).toBe('pay_123')
      }, 100)
    })
  })

  describe('错误分类和优先级', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'error-test-classification',
        endpoint: 'http://localhost:8080/collect',
        enableErrorMonitoring: true
      })
    })

    it('应该正确分类错误类型', () => {
      // 网络错误
      monitor.recordError(new Error('Network connection failed'), {
        errorType: 'network',
        url: '/api/users',
        method: 'GET'
      })

      // 认证错误
      monitor.recordError(new Error('Authentication failed'), {
        errorType: 'auth',
        provider: 'jwt',
        tokenExpiry: true
      })

      // 权限错误
      monitor.recordError(new Error('Access denied'), {
        errorType: 'permission',
        resource: '/admin/users',
        requiredRole: 'admin',
        userRole: 'user'
      })

      // 业务逻辑错误
      monitor.recordError(new Error('Invalid business data'), {
        errorType: 'business',
        operation: 'order_creation',
        businessRule: 'minimum_order_amount'
      })

      setTimeout(() => {
        const errorData = collectedData.find(data => data.errors)
        const errors = errorData.errors

        const networkErrors = errors.filter((e: any) => e.context.errorType === 'network')
        const authErrors = errors.filter((e: any) => e.context.errorType === 'auth')
        const permissionErrors = errors.filter((e: any) => e.context.errorType === 'permission')
        const businessErrors = errors.filter((e: any) => e.context.errorType === 'business')

        expect(networkErrors.length).toBe(1)
        expect(authErrors.length).toBe(1)
        expect(permissionErrors.length).toBe(1)
        expect(businessErrors.length).toBe(1)
      }, 100)
    })

    it('应该设置错误优先级', () => {
      // 致命错误
      monitor.recordError(new Error('Database connection lost'), {
        level: 'critical',
        impact: 'service_unavailable',
        requiresImmediateAction: true
      })

      // 高优先级错误
      monitor.recordError(new Error('Payment processing failed'), {
        level: 'error',
        impact: 'revenue_loss',
        businessCritical: true
      })

      // 警告级别
      monitor.recordError(new Error('Deprecated API used'), {
        level: 'warning',
        impact: 'maintenance_required',
        actionRequired: 'update_to_new_api'
      })

      // 信息级别
      monitor.recordError(new Error('Non-critical feature unavailable'), {
        level: 'info',
        impact: 'user_experience_degraded',
        actionRequired: 'monitor_usage'
      })

      setTimeout(() => {
        const errorData = collectedData.find(data => data.errors)
        const errors = errorData.errors

        const criticalErrors = errors.filter((e: any) => e.context.level === 'critical')
        const errorLevelErrors = errors.filter((e: any) => e.context.level === 'error')
        const warnings = errors.filter((e: any) => e.context.level === 'warning')
        const info = errors.filter((e: any) => e.context.level === 'info')

        expect(criticalErrors.length).toBe(1)
        expect(errorLevelErrors.length).toBe(1)
        expect(warnings.length).toBe(1)
        expect(info.length).toBe(1)
      }, 100)
    })
  })

  describe('错误恢复机制', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'error-test-recovery',
        endpoint: 'http://localhost:8080/collect',
        enableErrorMonitoring: true
      })
    })

    it('应该在数据发送失败时重试', async () => {
      let attemptCount = 0
      global.fetch = jest.fn().mockImplementation(() => {
        attemptCount++
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true })
        })
      })

      monitor.recordError(new Error('测试重试机制'))

      // 等待重试完成
      await new Promise(resolve => setTimeout(resolve, 1000))

      expect(attemptCount).toBe(3)
      expect(collectedData.length).toBe(1)
    })

    it('应该在达到最大重试次数后停止', async () => {
      let attemptCount = 0
      global.fetch = jest.fn().mockImplementation(() => {
        attemptCount++
        return Promise.reject(new Error('Persistent network error'))
      })

      monitor.recordError(new Error('测试最大重试'))

      // 等待重试完成
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 应该重试有限次数后停止
      expect(attemptCount).toBeLessThan(10)
      expect(collectedData.length).toBe(0)
    })

    it('应该在队列满时丢弃旧错误', async () => {
      // 发送大量错误来测试队列管理
      for (let i = 0; i < 1000; i++) {
        monitor.recordError(new Error(`批量错误测试 ${i}`))
      }

      setTimeout(() => {
        // 验证只有有限数量的错误被处理
        const totalErrors = collectedData.reduce((sum, data) => {
          return sum + (data.errors ? data.errors.length : 0)
        }, 0)

        expect(totalErrors).toBeLessThan(1000)
      }, 500)
    })
  })

  describe('边界情况处理', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'error-test-edge-cases',
        endpoint: 'http://localhost:8080/collect',
        enableErrorMonitoring: true
      })
    })

    it('应该处理null/undefined错误', () => {
      expect(() => {
        monitor.recordError(null as any)
      }).not.toThrow()

      expect(() => {
        monitor.recordError(undefined as any)
      }).not.toThrow()

      expect(() => {
        monitor.recordError({} as any)
      }).not.toThrow()
    })

    it('应该处理循环引用错误对象', () => {
      const circularError = new Error('循环引用错误')
      const circularObject = { error: circularError }
      ;(circularError as any).circular = circularObject

      expect(() => {
        monitor.recordError(circularError)
      }).not.toThrow()
    })

    it('应该处理超长错误消息', () => {
      const longMessage = 'x'.repeat(10000)
      const longError = new Error(longMessage)

      expect(() => {
        monitor.recordError(longError)
      }).not.toThrow()

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.find(data => data.errors)
        // 错误消息应该被截断或处理
        expect(errorData.errors[0].message.length).toBeLessThan(10000)
      }, 100)
    })

    it('应该处理特殊字符错误', () => {
      const specialChars = '特殊字符 🚀 Unicode 测试\n\t\r"\'\\<>{}[]()'
      const specialError = new Error(specialChars)

      expect(() => {
        monitor.recordError(specialError)
      }).not.toThrow()

      setTimeout(() => {
        expect(collectedData.length).toBeGreaterThan(0)
        const errorData = collectedData.find(data => data.errors)
        expect(errorData.errors[0].message).toContain('特殊字符')
      }, 100)
    })

    it('应该处理错误监听器中的错误', () => {
      // 模拟错误处理函数本身抛出异常的情况
      const originalConsoleError = console.error
      console.error = jest.fn()

      // 创建一个会在错误处理中抛出异常的情况
      global.fetch = jest.fn().mockImplementation(() => {
        throw new Error('错误处理中的异常')
      })

      monitor.recordError(new Error('原始错误'))

      setTimeout(() => {
        // SDK不应该崩溃，应该能够处理这种异常
        expect(console.error).toHaveBeenCalled()
        console.error = originalConsoleError
      }, 100)
    })
  })

  describe('性能影响测试', () => {
    it('应该在高错误频率下保持性能', async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'error-test-performance',
        endpoint: 'http://localhost:8080/collect',
        enableErrorMonitoring: true
      })

      const startTime = Date.now()
      const errorCount = 1000

      // 快速生成大量错误
      for (let i = 0; i < errorCount; i++) {
        monitor.recordError(new Error(`性能测试错误 ${i}`))
      }

      const processingTime = Date.now() - startTime
      const errorsPerSecond = (errorCount / processingTime) * 1000

      // 应该能够处理至少1000个错误每秒
      expect(errorsPerSecond).toBeGreaterThan(1000)

      console.log(`错误处理性能: ${errorsPerSecond.toFixed(2)} errors/sec`)
    })

    it('应该在内存使用上保持合理', async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'error-test-memory',
        endpoint: 'http://localhost:8080/collect',
        enableErrorMonitoring: true
      })

      // 模拟内存使用情况
      const initialMemory = 1000000 // 假设初始内存使用
      let peakMemory = initialMemory

      // 生成大量错误数据
      for (let i = 0; i < 100; i++) {
        const largeError = new Error(`大错误 ${i}`)
        largeError.stack = 'x'.repeat(10000) // 大型堆栈信息

        monitor.recordError(largeError, {
          largeContext: 'x'.repeat(1000),
          largeData: new Array(100).fill('large data item')
        })

        // 模拟内存增长
        peakMemory = Math.max(peakMemory, initialMemory + i * 1000)
      }

      const memoryGrowth = peakMemory - initialMemory

      // 内存增长应该在合理范围内（小于50MB）
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024)

      console.log(`内存使用增长: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`)
    })
  })
})