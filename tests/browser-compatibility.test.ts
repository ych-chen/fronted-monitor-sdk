/**
 * 浏览器兼容性测试套件
 *
 * 本测试套件验证前端监控SDK在不同浏览器环境下的兼容性：
 * - 现代浏览器 (Chrome, Firefox, Safari, Edge)
 * - 移动端浏览器
 * - 旧版浏览器 (IE11+)
 * - 不同API支持程度
 * - 优雅降级处理
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { createFrontendMonitor, type FrontendMonitorSDK } from '../src/index'

// 模拟不同的浏览器环境
const createMockBrowser = (browserFeatures: any) => {
  const mockWindow = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    performance: {
      now: jest.fn(() => Date.now()),
      getEntriesByType: jest.fn(() => []),
      mark: jest.fn(),
      measure: jest.fn(),
      navigation: {
        fetchStart: Date.now(),
        domContentLoadedEventEnd: Date.now() + 1000,
        loadEventEnd: Date.now() + 1500
      },
      ...browserFeatures.performance
    },
    navigator: {
      userAgent: 'Test Browser',
      ...browserFeatures.navigator
    },
    ErrorEvent: browserFeatures.ErrorEvent || class ErrorEvent extends Event {
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
    },
    CustomEvent: browserFeatures.CustomEvent || class CustomEvent extends Event {
      constructor(type: string, eventInitDict?: any) {
        super(type, eventInitDict)
        this.detail = eventInitDict?.detail || null
      }
      detail: any
    },
    MutationObserver: browserFeatures.MutationObserver || class MockMutationObserver {
      constructor() {}
      observe() {}
      disconnect() {}
    },
    IntersectionObserver: browserFeatures.IntersectionObserver || class MockIntersectionObserver {
      constructor() {}
      observe() {}
      disconnect() {}
      unobserve() {}
    },
    fetch: browserFeatures.fetch || jest.fn(),
    ...browserFeatures.window
  }

  const mockDocument = {
    createElement: jest.fn(() => ({
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
      setAttribute: jest.fn(),
      getAttribute: jest.fn(),
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      style: {},
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn()
      }
    })),
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn()
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: 'complete',
    ...browserFeatures.document
  }

  return { window: mockWindow, document: mockDocument }
}

describe('浏览器兼容性测试', () => {
  let originalWindow: any
  let originalDocument: any
  let collectedData: any[]

  beforeEach(() => {
    originalWindow = global.window
    originalDocument = global.document
    collectedData = []

    // Mock fetch
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
    global.window = originalWindow
    global.document = originalDocument
    jest.restoreAllMocks()
  })

  describe('现代浏览器兼容性', () => {
    it('应该在Chrome环境下正常工作', async () => {
      const chromeFeatures = {
        performance: {
          now: jest.fn(() => Date.now()),
          getEntriesByType: jest.fn(() => [
            { name: 'first-contentful-paint', startTime: 1000 },
            { name: 'largest-contentful-paint', startTime: 2000 }
          ]),
          mark: jest.fn(),
          measure: jest.fn(),
          navigation: {
            fetchStart: 1000,
            domContentLoadedEventEnd: 2000,
            loadEventEnd: 2500,
            type: 'navigate'
          },
          observer: jest.fn()
        },
        navigator: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        window: {
          PerformanceObserver: class PerformanceObserver {
            constructor(private callback: Function) {}
            observe(options: any) {}
            disconnect() {}
          }
        }
      }

      const { window: mockWindow, document: mockDocument } = createMockBrowser(chromeFeatures)
      global.window = mockWindow
      global.document = mockDocument

      const monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'chrome-test',
        endpoint: 'http://localhost:8080/collect',
        enablePerformanceMonitoring: true,
        enableErrorMonitoring: true,
        enableUserInteractionMonitoring: true
      })

      expect(monitor.isReady()).toBe(true)

      // 测试性能监控
      const metrics = monitor.getMetricsCollector()
      metrics.recordHistogram('chrome_test', 100)

      expect(collectedData.length).toBeGreaterThan(0)

      monitor.destroy()
    })

    it('应该在Firefox环境下正常工作', async () => {
      const firefoxFeatures = {
        performance: {
          now: jest.fn(() => Date.now()),
          getEntriesByType: jest.fn(() => []),
          mark: jest.fn(),
          measure: jest.fn(),
          navigation: {
            fetchStart: 1000,
            domContentLoadedEventEnd: 2000,
            loadEventEnd: 2500
          }
        },
        navigator: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
        }
      }

      const { window: mockWindow, document: mockDocument } = createMockBrowser(firefoxFeatures)
      global.window = mockWindow
      global.document = mockDocument

      const monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'firefox-test',
        endpoint: 'http://localhost:8080/collect'
      })

      expect(monitor.isReady()).toBe(true)

      // 测试错误监控
      monitor.recordError(new Error('Firefox测试错误'))

      expect(collectedData.length).toBeGreaterThan(0)

      monitor.destroy()
    })

    it('应该在Safari环境下正常工作', async () => {
      const safariFeatures = {
        performance: {
          now: jest.fn(() => Date.now()),
          getEntriesByType: jest.fn(() => []),
          mark: jest.fn(),
          measure: jest.fn(),
          navigation: {
            fetchStart: 1000,
            domContentLoadedEventEnd: 2000,
            loadEventEnd: 2500
          }
        },
        navigator: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
        }
      }

      const { window: mockWindow, document: mockDocument } = createMockBrowser(safariFeatures)
      global.window = mockWindow
      global.document = mockDocument

      const monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'safari-test',
        endpoint: 'http://localhost:8080/collect'
      })

      expect(monitor.isReady()).toBe(true)

      // 测试用户交互监控
      monitor.recordUserInteraction({
        type: 'click',
        element: 'button',
        target: 'safari-test'
      })

      expect(collectedData.length).toBeGreaterThan(0)

      monitor.destroy()
    })
  })

  describe('移动端浏览器兼容性', () => {
    it('应该在移动Safari上工作', async () => {
      const mobileSafariFeatures = {
        performance: {
          now: jest.fn(() => Date.now()),
          getEntriesByType: jest.fn(() => []),
          mark: jest.fn(),
          measure: jest.fn(),
          navigation: {
            fetchStart: 1000,
            domContentLoadedEventEnd: 2000,
            loadEventEnd: 2500
          }
        },
        navigator: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
        }
      }

      const { window: mockWindow, document: mockDocument } = createMockBrowser(mobileSafariFeatures)
      global.window = mockWindow
      global.document = mockDocument

      const monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'mobile-safari-test',
        endpoint: 'http://localhost:8080/collect',
        attributes: {
          platform: 'mobile'
        }
      })

      expect(monitor.isReady()).toBe(true)

      // 测试移动端特定功能
      monitor.recordPageView('/mobile-page', {
        platform: 'mobile'
      })

      expect(collectedData.length).toBeGreaterThan(0)

      monitor.destroy()
    })

    it('应该在Android Chrome上工作', async () => {
      const androidChromeFeatures = {
        performance: {
          now: jest.fn(() => Date.now()),
          getEntriesByType: jest.fn(() => []),
          mark: jest.fn(),
          measure: jest.fn(),
          navigation: {
            fetchStart: 1000,
            domContentLoadedEventEnd: 2000,
            loadEventEnd: 2500
          }
        },
        navigator: {
          userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
        }
      }

      const { window: mockWindow, document: mockDocument } = createMockBrowser(androidChromeFeatures)
      global.window = mockWindow
      global.document = mockDocument

      const monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'android-chrome-test',
        endpoint: 'http://localhost:8080/collect'
      })

      expect(monitor.isReady()).toBe(true)

      // 测试移动端性能指标
      const metrics = monitor.getMetricsCollector()
      metrics.recordHistogram('mobile_performance', 150, {
        device: 'mobile',
        os: 'android'
      })

      expect(collectedData.length).toBeGreaterThan(0)

      monitor.destroy()
    })
  })

  describe('旧版浏览器兼容性', () => {
    it('应该在IE11+环境下优雅降级', async () => {
      const ieFeatures = {
        performance: {
          now: jest.fn(() => Date.now()),
          navigation: {
            fetchStart: Date.now(),
            domContentLoadedEventEnd: Date.now() + 1000,
            loadEventEnd: Date.now() + 1500
          }
        },
        navigator: {
          userAgent: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)'
        },
        // IE不支持的一些API
        IntersectionObserver: undefined,
        MutationObserver: undefined,
        PerformanceObserver: undefined,
        fetch: undefined
      }

      const { window: mockWindow, document: mockDocument } = createMockBrowser(ieFeatures)
      global.window = mockWindow
      global.document = mockDocument

      const monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'ie-test',
        endpoint: 'http://localhost:8080/collect',
        enablePerformanceMonitoring: false, // 在IE中禁用一些高级功能
        enableAutoTracing: false
      })

      expect(monitor.isReady()).toBe(true)

      // 测试基本功能
      monitor.recordError(new Error('IE测试错误'))
      monitor.recordUserInteraction({
        type: 'click',
        element: 'button',
        target: 'ie-test'
      })

      expect(collectedData.length).toBeGreaterThan(0)

      monitor.destroy()
    })

    it('应该处理不支持Promise的情况', async () => {
      const noPromiseFeatures = {
        window: {
          Promise: undefined,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        }
      }

      const { window: mockWindow, document: mockDocument } = createMockBrowser(noPromiseFeatures)
      global.window = mockWindow
      global.document = mockDocument

      // 在这种环境下SDK可能无法完全初始化
      const monitor = createFrontendMonitor()

      try {
        await monitor.init({
          serviceName: 'no-promise-test',
          endpoint: 'http://localhost:8080/collect'
        })
      } catch (error) {
        // 预期会失败，因为没有Promise支持
        expect(error).toBeDefined()
      }
    })
  })

  describe('API支持检测', () => {
    it('应该检测PerformanceObserver支持', async () => {
      const withPerformanceObserver = {
        window: {
          PerformanceObserver: class PerformanceObserver {
            constructor(private callback: Function) {}
            observe(options: any) {}
            disconnect() {}
          }
        }
      }

      const { window: mockWindow, document: mockDocument } = createMockBrowser(withPerformanceObserver)
      global.window = mockWindow
      global.document = mockDocument

      const monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'performance-observer-test',
        endpoint: 'http://localhost:8080/collect',
        enablePerformanceMonitoring: true
      })

      expect(monitor.isReady()).toBe(true)

      // 验证性能监控功能是否可用
      const diagnostics = await monitor.getDiagnostics()
      expect(diagnostics.features.performanceObserver).toBe(true)

      monitor.destroy()
    })

    it('应该检测IntersectionObserver支持', async () => {
      const withIntersectionObserver = {
        window: {
          IntersectionObserver: class IntersectionObserver {
            constructor() {}
            observe() {}
            disconnect() {}
            unobserve() {}
          }
        }
      }

      const { window: mockWindow, document: mockDocument } = createMockBrowser(withIntersectionObserver)
      global.window = mockWindow
      global.document = mockDocument

      const monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'intersection-observer-test',
        endpoint: 'http://localhost:8080/collect'
      })

      expect(monitor.isReady()).toBe(true)

      monitor.destroy()
    })

    it('应该检测MutationObserver支持', async () => {
      const withMutationObserver = {
        window: {
          MutationObserver: class MutationObserver {
            constructor() {}
            observe() {}
            disconnect() {}
          }
        }
      }

      const { window: mockWindow, document: mockDocument } = createMockBrowser(withMutationObserver)
      global.window = mockWindow
      global.document = mockDocument

      const monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'mutation-observer-test',
        endpoint: 'http://localhost:8080/collect'
      })

      expect(monitor.isReady()).toBe(true)

      monitor.destroy()
    })

    it('应该检测Fetch API支持', async () => {
      const withFetch = {
        fetch: jest.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true })
        })
      }

      const { window: mockWindow, document: mockDocument } = createMockBrowser(withFetch)
      global.window = mockWindow
      global.document = mockDocument

      const monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'fetch-api-test',
        endpoint: 'http://localhost:8080/collect'
      })

      expect(monitor.isReady()).toBe(true)

      // 测试数据传输
      const metrics = monitor.getMetricsCollector()
      metrics.incrementCounter('fetch_test', 1)

      // 等待数据传输
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(withFetch.fetch).toHaveBeenCalled()

      monitor.destroy()
    })
  })

  describe('优雅降级处理', () => {
    it('应该在缺少性能API时仍然工作', async () => {
      const noPerformanceAPI = {
        performance: undefined
      }

      const { window: mockWindow, document: mockDocument } = createMockBrowser(noPerformanceAPI)
      global.window = mockWindow
      global.document = mockDocument

      const monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'no-performance-test',
        endpoint: 'http://localhost:8080/collect',
        enablePerformanceMonitoring: false // 禁用性能监控
      })

      expect(monitor.isReady()).toBe(true)

      // 基本功能应该仍然工作
      monitor.recordError(new Error('无性能API测试'))
      monitor.recordUserInteraction({
        type: 'click',
        element: 'button',
        target: 'no-perf-test'
      })

      expect(collectedData.length).toBeGreaterThan(0)

      monitor.destroy()
    })

    it('应该在缺少事件API时仍然工作', async () => {
      const minimalFeatures = {
        window: {
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
          ErrorEvent: class ErrorEvent extends Event {
            constructor(type: string, eventInitDict?: any) {
              super(type, eventInitDict)
              this.message = eventInitDict?.message || ''
              this.error = eventInitDict?.error || null
            }
            message: string
            error: Error | null
          }
        }
      }

      const { window: mockWindow, document: mockDocument } = createMockBrowser(minimalFeatures)
      global.window = mockWindow
      global.document = mockDocument

      const monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'minimal-test',
        endpoint: 'http://localhost:8080/collect',
        enableAutoTracing: false,
        enableUserInteractionMonitoring: false
      })

      expect(monitor.isReady()).toBe(true)

      // 手动记录应该仍然工作
      monitor.recordError(new Error('最小功能测试'))
      monitor.recordPageView('/minimal-page')

      expect(collectedData.length).toBeGreaterThan(0)

      monitor.destroy()
    })
  })

  describe('浏览器检测和功能报告', () => {
    it('应该正确识别浏览器类型', async () => {
      const chromeFeatures = {
        navigator: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }

      const { window: mockWindow, document: mockDocument } = createMockBrowser(chromeFeatures)
      global.window = mockWindow
      global.document = mockDocument

      const monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'browser-detection-test',
        endpoint: 'http://localhost:8080/collect'
      })

      const diagnostics = await monitor.getDiagnostics()
      expect(diagnostics.browser.name).toBe('Chrome')
      expect(diagnostics.features).toBeDefined()

      monitor.destroy()
    })

    it('应该报告功能支持状态', async () => {
      const limitedFeatures = {
        window: {
          PerformanceObserver: undefined,
          IntersectionObserver: undefined,
          MutationObserver: class MutationObserver {
            constructor() {}
            observe() {}
            disconnect() {}
          }
        }
      }

      const { window: mockWindow, document: mockDocument } = createMockBrowser(limitedFeatures)
      global.window = mockWindow
      global.document = mockDocument

      const monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'feature-report-test',
        endpoint: 'http://localhost:8080/collect'
      })

      const diagnostics = await monitor.getDiagnostics()
      expect(diagnostics.features.performanceObserver).toBe(false)
      expect(diagnostics.features.intersectionObserver).toBe(false)
      expect(diagnostics.features.mutationObserver).toBe(true)

      monitor.destroy()
    })
  })
})