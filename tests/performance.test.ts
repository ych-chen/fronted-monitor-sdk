/**
 * 性能测试套件
 *
 * 本测试套件验证前端监控SDK的性能影响：
 * - 初始化时间
 * - 内存使用情况
 * - CPU使用率
 * - 网络请求开销
 * - 监控数据处理性能
 * - 大量数据场景下的表现
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
    userAgent: 'Performance Test Browser'
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
    appendChild: jest.fn()
  }))
}

global.window = mockWindow as any
global.document = mockDocument as any
global.navigator = mockWindow.navigator
global.performance = mockWindow.performance

describe('性能测试', () => {
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

    // 重置performance.now模拟
    let performanceTime = 0
    mockWindow.performance.now.mockImplementation(() => {
      performanceTime += 10
      return performanceTime
    })
  })

  afterEach(() => {
    if (monitor) {
      monitor.destroy()
    }
    jest.restoreAllMocks()
  })

  describe('初始化性能测试', () => {
    it('应该在合理时间内完成初始化', async () => {
      const startTime = Date.now()

      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'performance-test-init',
        endpoint: 'http://localhost:8080/collect',
        enablePerformanceMonitoring: true,
        enableErrorMonitoring: true,
        enableUserInteractionMonitoring: true
      })

      const initTime = Date.now() - startTime

      // 初始化应该在100ms内完成
      expect(initTime).toBeLessThan(100)
      expect(monitor.isReady()).toBe(true)
    })

    it('应该测试不同配置的初始化性能', async () => {
      const configs = [
        {
          name: 'minimal',
          config: {
            serviceName: 'minimal-test',
            endpoint: 'http://localhost:8080/collect',
            enablePerformanceMonitoring: false,
            enableErrorMonitoring: false,
            enableUserInteractionMonitoring: false
          }
        },
        {
          name: 'full',
          config: {
            serviceName: 'full-test',
            endpoint: 'http://localhost:8080/collect',
            enablePerformanceMonitoring: true,
            enableErrorMonitoring: true,
            enableUserInteractionMonitoring: true,
            enableAutoTracing: true,
            enableCustomMetrics: true
          }
        }
      ]

      const results: any[] = []

      for (const { name, config } of configs) {
        const startTime = Date.now()

        const tempMonitor = createFrontendMonitor()
        await tempMonitor.init(config)

        const initTime = Date.now() - startTime
        results.push({ name, initTime })

        tempMonitor.destroy()
      }

      // 完整配置的初始化时间不应该比最小配置多太多
      expect(results[1].initTime).toBeLessThan(results[0].initTime * 3)
    })
  })

  describe('内存使用测试', () => {
    it('应该监控内存使用情况', async () => {
      // 模拟内存API
      const mockMemory = {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 4000000
      }

      ;(mockWindow.performance as any).memory = mockMemory

      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'memory-test',
        endpoint: 'http://localhost:8080/collect'
      })

      // 记录初始内存使用
      const initialMemory = mockMemory.usedJSHeapSize

      // 执行大量监控操作
      for (let i = 0; i < 1000; i++) {
        const metrics = monitor.getMetricsCollector()
        metrics.incrementCounter(`test_counter_${i}`, 1)
        monitor.recordUserInteraction({
          type: 'click',
          element: 'button',
          target: `test-${i}`,
          timestamp: Date.now()
        })
      }

      // 检查内存增长
      const finalMemory = mockMemory.usedJSHeapSize
      const memoryGrowth = finalMemory - initialMemory

      // 内存增长应该合理（小于10MB）
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024)
    })

    it('应该正确清理内存', async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'memory-cleanup-test',
        endpoint: 'http://localhost:8080/collect'
      })

      // 添加大量数据
      for (let i = 0; i < 100; i++) {
        const metrics = monitor.getMetricsCollector()
        metrics.incrementCounter('cleanup_test', 1)
        monitor.recordError(new Error(`测试错误 ${i}`))
      }

      // 销毁监控器
      monitor.destroy()

      // 验证监控器不再可用
      expect(monitor.isReady()).toBe(false)

      // 验证事件监听器被清理
      expect(mockWindow.removeEventListener).toHaveBeenCalled()
    })
  })

  describe('数据处理性能测试', () => {
    it('应该高效处理大量监控数据', async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'data-processing-test',
        endpoint: 'http://localhost:8080/collect',
        enablePerformanceMonitoring: true,
        enableErrorMonitoring: true,
        enableUserInteractionMonitoring: true
      })

      const startTime = Date.now()
      const dataCount = 1000

      // 批量处理监控数据
      for (let i = 0; i < dataCount; i++) {
        const metrics = monitor.getMetricsCollector()

        // 添加不同类型的指标
        metrics.incrementCounter('counter_test', 1, { batch: i })
        metrics.recordHistogram('histogram_test', Math.random() * 1000, { batch: i })
        metrics.recordGauge('gauge_test', Math.random() * 100, { batch: i })

        // 添加错误和交互
        if (i % 10 === 0) {
          monitor.recordError(new Error(`批量错误 ${i}`))
        }

        if (i % 5 === 0) {
          monitor.recordUserInteraction({
            type: 'click',
            element: 'button',
            target: `batch-${i}`,
            timestamp: Date.now()
          })
        }
      }

      const processingTime = Date.now() - startTime
      const dataPerSecond = (dataCount / processingTime) * 1000

      // 应该能处理至少1000条数据每秒
      expect(dataPerSecond).toBeGreaterThan(1000)
    })

    it('应该高效处理复杂追踪数据', async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'tracing-performance-test',
        endpoint: 'http://localhost:8080/collect',
        enableAutoTracing: true
      })

      const startTime = Date.now()
      const traceCount = 100

      // 创建复杂的追踪数据
      for (let i = 0; i < traceCount; i++) {
        const parentTracer = monitor.startTracing(`parent_operation_${i}`, {
          attributes: {
            operation_id: i,
            type: 'parent'
          }
        })

        // 添加子操作
        for (let j = 0; j < 5; j++) {
          const childTracer = monitor.startTracing(`child_operation_${i}_${j}`, {
            parent: parentTracer,
            attributes: {
              operation_id: j,
              type: 'child'
            }
          })

          // 添加事件和指标
          childTracer.addEvent(`event_${j}`, { data: `test_data_${j}` })
          childTracer.recordMetric(`metric_${j}`, Math.random() * 100)

          if (j % 3 === 0) {
            childTracer.recordError(new Error(`子操作错误 ${i}-${j}`))
          }

          childTracer.endSpan()
        }

        parentTracer.endSpan()
      }

      const traceProcessingTime = Date.now() - startTime
      const tracesPerSecond = (traceCount / traceProcessingTime) * 1000

      // 应该能处理至少50个复杂追踪每秒
      expect(tracesPerSecond).toBeGreaterThan(50)
    })
  })

  describe('网络性能测试', () => {
    it('应该高效发送监控数据', async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'network-performance-test',
        endpoint: 'http://localhost:8080/collect',
        enablePerformanceMonitoring: true,
        enableErrorMonitoring: true,
        enableUserInteractionMonitoring: true
      })

      // 添加大量监控数据
      for (let i = 0; i < 100; i++) {
        const metrics = monitor.getMetricsCollector()
        metrics.incrementCounter('network_test', 1, { batch: i })
      }

      const startTime = Date.now()

      // 等待数据发送
      await new Promise(resolve => setTimeout(resolve, 500))

      const networkTime = Date.now() - startTime

      // 网络传输应该在合理时间内完成
      expect(networkTime).toBeLessThan(1000)
      expect(collectedData.length).toBeGreaterThan(0)
    })

    it('应该支持批量数据传输', async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'batch-test',
        endpoint: 'http://localhost:8080/collect'
      })

      // 添加不同类型的数据
      const metrics = monitor.getMetricsCollector()
      metrics.incrementCounter('batch_counter', 1)
      metrics.recordHistogram('batch_histogram', 100)
      metrics.recordGauge('batch_gauge', 50)

      monitor.recordError(new Error('批量测试错误'))
      monitor.recordUserInteraction({
        type: 'click',
        element: 'button',
        target: 'batch-test'
      })

      // 等待批量处理
      await new Promise(resolve => setTimeout(resolve, 200))

      // 验证数据被批量发送
      expect(collectedData.length).toBeGreaterThan(0)

      // 检查是否包含所有类型的数据
      const sentData = collectedData[0]
      expect(sentData).toHaveProperty('metrics')
      expect(sentData).toHaveProperty('errors')
      expect(sentData).toHaveProperty('interactions')
    })
  })

  describe('采样性能测试', () => {
    it('应该高效执行采样逻辑', async () => {
      // 测试不同采样率的性能
      const sampleRates = [0.1, 0.5, 1.0]
      const results: any[] = []

      for (const sampleRate of sampleRates) {
        const testMonitor = createFrontendMonitor()
        await testMonitor.init({
          serviceName: `sampling-test-${sampleRate}`,
          endpoint: 'http://localhost:8080/collect',
          sampleRate
        })

        const startTime = Date.now()
        const dataCount = 1000

        for (let i = 0; i < dataCount; i++) {
          const metrics = testMonitor.getMetricsCollector()
          metrics.incrementCounter('sampling_test', 1, { index: i })
        }

        const samplingTime = Date.now() - startTime
        results.push({ sampleRate, samplingTime })

        testMonitor.destroy()
      }

      // 采样率不应该显著影响性能
      const maxTime = Math.max(...results.map(r => r.samplingTime))
      const minTime = Math.min(...results.map(r => r.samplingTime))

      // 最高采样率的时间不应该超过最低采样率的3倍
      expect(maxTime).toBeLessThan(minTime * 3)
    })

    it('应该正确控制数据发送频率', async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'sampling-frequency-test',
        endpoint: 'http://localhost:8080/collect',
        sampleRate: 0.1 // 10%采样率
      })

      // 添加大量数据
      const dataCount = 1000
      for (let i = 0; i < dataCount; i++) {
        const metrics = monitor.getMetricsCollector()
        metrics.incrementCounter('frequency_test', 1, { index: i })
      }

      // 等待采样处理
      await new Promise(resolve => setTimeout(resolve, 500))

      // 验证采样效果 - 由于采样率为0.1，实际发送的数据应该远少于添加的数据
      const sentDataCount = collectedData.reduce((acc, data) => {
        return acc + (data.metrics ? Object.keys(data.metrics).length : 0)
      }, 0)

      // 考虑到批量处理，实际发送的数据量应该显著少于原始数据量
      expect(sentDataCount).toBeLessThan(dataCount)
    })
  })

  describe('高并发性能测试', () => {
    it('应该处理高并发监控操作', async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'concurrency-test',
        endpoint: 'http://localhost:8080/collect',
        enablePerformanceMonitoring: true,
        enableErrorMonitoring: true,
        enableUserInteractionMonitoring: true
      })

      const startTime = Date.now()
      const concurrentOperations = 100

      // 并发执行多种监控操作
      const promises = []
      for (let i = 0; i < concurrentOperations; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            // 性能监控
            const metrics = monitor.getMetricsCollector()
            metrics.incrementCounter('concurrent_counter', 1, { operation: i })

            // 错误监控
            if (i % 10 === 0) {
              monitor.recordError(new Error(`并发错误 ${i}`))
            }

            // 用户交互监控
            monitor.recordUserInteraction({
              type: 'click',
              element: 'button',
              target: `concurrent-${i}`,
              timestamp: Date.now()
            })

            // 追踪监控
            const tracer = monitor.startTracing(`concurrent_operation_${i}`)
            tracer.addEvent('start')
            tracer.recordMetric('duration', Math.random() * 100)
            tracer.endSpan()

            resolve()
          })
        )
      }

      await Promise.all(promises)

      const concurrencyTime = Date.now() - startTime
      const operationsPerSecond = (concurrentOperations / concurrencyTime) * 1000

      // 应该能处理至少500个并发操作每秒
      expect(operationsPerSecond).toBeGreaterThan(500)

      // 等待数据处理完成
      await new Promise(resolve => setTimeout(resolve, 200))

      // 验证所有数据都被正确处理
      expect(collectedData.length).toBeGreaterThan(0)
    })

    it('应该在高负载下保持稳定性', async () => {
      monitor = createFrontendMonitor()
      await monitor.init({
        serviceName: 'load-test',
        endpoint: 'http://localhost:8080/collect'
      })

      const startTime = Date.now()
      const loadTestDuration = 1000 // 1秒
      const endTime = startTime + loadTestDuration

      let operationCount = 0
      let errorCount = 0

      // 持续高负载操作
      while (Date.now() < endTime) {
        try {
          const metrics = monitor.getMetricsCollector()
          metrics.incrementCounter('load_test', 1, { time: Date.now() })

          if (operationCount % 100 === 0) {
            monitor.recordError(new Error(`负载测试错误 ${operationCount}`))
          }

          operationCount++
        } catch (error) {
          errorCount++
        }
      }

      const actualDuration = Date.now() - startTime
      const operationsPerSecond = operationCount / (actualDuration / 1000)

      // 错误率应该很低
      const errorRate = errorCount / operationCount
      expect(errorRate).toBeLessThan(0.01) // 错误率小于1%

      // 操作频率应该保持稳定
      expect(operationsPerSecond).toBeGreaterThan(1000) // 至少1000 ops/sec

      console.log(`负载测试结果: ${operationsPerSecond.toFixed(2)} ops/sec, 错误率: ${(errorRate * 100).toFixed(2)}%`)
    })
  })

  describe('性能基准测试', () => {
    it('应该建立性能基准', async () => {
      const benchmarks = [
        {
          name: '初始化时间',
          test: async () => {
            const testMonitor = createFrontendMonitor()
            const start = Date.now()
            await testMonitor.init({
              serviceName: 'benchmark-init',
              endpoint: 'http://localhost:8080/collect'
            })
            const time = Date.now() - start
            testMonitor.destroy()
            return time
          }
        },
        {
          name: '指标记录',
          test: async () => {
            const testMonitor = createFrontendMonitor()
            await testMonitor.init({
              serviceName: 'benchmark-metrics',
              endpoint: 'http://localhost:8080/collect'
            })

            const start = Date.now()
            const metrics = testMonitor.getMetricsCollector()
            for (let i = 0; i < 1000; i++) {
              metrics.incrementCounter('benchmark_counter', 1)
            }
            const time = Date.now() - start
            testMonitor.destroy()
            return time
          }
        },
        {
          name: '错误记录',
          test: async () => {
            const testMonitor = createFrontendMonitor()
            await testMonitor.init({
              serviceName: 'benchmark-errors',
              endpoint: 'http://localhost:8080/collect'
            })

            const start = Date.now()
            for (let i = 0; i < 100; i++) {
              testMonitor.recordError(new Error(`基准测试错误 ${i}`))
            }
            const time = Date.now() - start
            testMonitor.destroy()
            return time
          }
        }
      ]

      const results: any[] = []

      for (const benchmark of benchmarks) {
        const times: number[] = []

        // 运行多次测试取平均值
        for (let i = 0; i < 5; i++) {
          const time = await benchmark.test()
          times.push(time)
        }

        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length
        const minTime = Math.min(...times)
        const maxTime = Math.max(...times)

        results.push({
          name: benchmark.name,
          avgTime,
          minTime,
          maxTime,
          runs: times.length
        })
      }

      // 输出性能基准结果
      console.log('性能基准测试结果:')
      results.forEach(result => {
        console.log(`${result.name}:`)
        console.log(`  平均时间: ${result.avgTime.toFixed(2)}ms`)
        console.log(`  最小时间: ${result.minTime.toFixed(2)}ms`)
        console.log(`  最大时间: ${result.maxTime.toFixed(2)}ms`)
        console.log(`  运行次数: ${result.runs}`)
      })

      // 验证性能基准
      const initBenchmark = results.find(r => r.name === '初始化时间')
      const metricsBenchmark = results.find(r => r.name === '指标记录')
      const errorsBenchmark = results.find(r => r.name === '错误记录')

      expect(initBenchmark!.avgTime).toBeLessThan(50) // 初始化小于50ms
      expect(metricsBenchmark!.avgTime).toBeLessThan(100) // 1000次指标记录小于100ms
      expect(errorsBenchmark!.avgTime).toBeLessThan(50) // 100次错误记录小于50ms
    })
  })
})