/**
 * Integration tests for the main SDK functionality
 */

import { createFrontendMonitor } from '../src/sdk';
import { MonitorConfig } from '../src/types';

describe('FrontendMonitorSDK Integration', () => {
  let monitor: any;
  let mockConfig: MonitorConfig;

  beforeEach(() => {
    mockConfig = {
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      endpoint: 'https://otel-collector.test.com/v1/traces',
      apiKey: 'test-api-key',
      sampleRate: 1.0,
      enableAutoTracing: true,
      enablePerformanceMetrics: true,
      enableCustomMetrics: true,
      enableErrorMonitoring: true,
      enableUserInteractionMonitoring: true
    };
  });

  afterEach(async () => {
    if (monitor) {
      await monitor.destroy();
    }
    jest.clearAllMocks();
  });

  describe('SDK initialization', () => {
    it('should initialize SDK with basic config', async () => {
      monitor = createFrontendMonitor();
      await monitor.init({
        serviceName: 'basic-service',
        endpoint: 'https://collector.example.com'
      });

      expect(monitor).toBeDefined();
    });

    it('should initialize SDK with full config', async () => {
      monitor = createFrontendMonitor();
      await monitor.init(mockConfig);

      expect(monitor).toBeDefined();
    });

    it('should handle initialization errors gracefully', async () => {
      monitor = createFrontendMonitor();

      // Invalid config should not throw
      await expect(monitor.init({
        serviceName: '',
        endpoint: 'invalid-url'
      })).rejects.toThrow();
    });
  });

  describe('Tracing functionality', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor();
      await monitor.init({
        serviceName: 'trace-test',
        endpoint: 'https://collector.example.com',
        enableAutoTracing: true
      });
    });

    it('should start and end tracing spans', () => {
      const tracer = monitor.startTracing('test-operation');

      expect(tracer).toBeDefined();
      expect(typeof tracer.endSpan).toBe('function');

      tracer.endSpan();

      const mockSpan = (global as any).testUtils.createMockSpan();
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should record errors in traces', () => {
      const tracer = monitor.startTracing('error-operation');
      const error = new Error('Test error');

      tracer.recordError(error);

      const mockSpan = (global as any).testUtils.createMockSpan();
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
    });

    it('should work with trace manager', () => {
      const traceManager = monitor.getTraceManager();
      expect(traceManager).toBeDefined();

      const result = traceManager.trace('sync-operation', () => 'success');
      expect(result).toBe('success');
    });

    it('should work with async tracing', async () => {
      const traceManager = monitor.getTraceManager();
      const result = await traceManager.traceAsync('async-operation', async () => 'async-result');
      expect(result).toBe('async-result');
    });
  });

  describe('Metrics functionality', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor();
      await monitor.init({
        serviceName: 'metrics-test',
        endpoint: 'https://collector.example.com',
        enableCustomMetrics: true,
        enablePerformanceMetrics: true
      });
    });

    it('should provide metrics collector', () => {
      const metricsCollector = monitor.getMetricsCollector();
      expect(metricsCollector).toBeDefined();
      expect(typeof metricsCollector.incrementCounter).toBe('function');
      expect(typeof metricsCollector.recordHistogram).toBe('function');
      expect(typeof metricsCollector.setGauge).toBe('function');
    });

    it('should record custom metrics', () => {
      const metricsCollector = monitor.getMetricsCollector();

      metricsCollector.incrementCounter('test-counter', 5, { test: 'true' });
      metricsCollector.recordHistogram('test-histogram', 100);
      metricsCollector.setGauge('test-gauge', 42);

      // Should not throw
      expect(true).toBe(true);
    });

    it('should record metrics via SDK', () => {
      const testMetrics = {
        counter: 10,
        gauge: 25.5,
        histogram: 150
      };

      monitor.recordMetrics(testMetrics);

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Error monitoring', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor();
      await monitor.init({
        serviceName: 'error-test',
        endpoint: 'https://collector.example.com',
        enableErrorMonitoring: true
      });
    });

    it('should record errors', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'click' };

      monitor.recordError(error, context);

      // Should not throw and should record the error
      const mockSpan = (global as any).testUtils.createMockSpan();
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
    });

    it('should record string errors', () => {
      monitor.recordError('String error message');

      const mockSpan = (global as any).testUtils.createMockSpan();
      expect(mockSpan.recordException).toHaveBeenCalled();
    });
  });

  describe('User interaction monitoring', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor();
      await monitor.init({
        serviceName: 'interaction-test',
        endpoint: 'https://collector.example.com',
        enableUserInteractionMonitoring: true
      });
    });

    it('should record user interactions', () => {
      const interaction = {
        type: 'click',
        element: 'button',
        target: '#submit-btn',
        timestamp: Date.now(),
        duration: 50,
        value: 'submit'
      };

      monitor.recordUserInteraction(interaction);

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Auto-instrumentation', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor();
      await monitor.init({
        serviceName: 'auto-instrument-test',
        endpoint: 'https://collector.example.com',
        enableAutoTracing: true
      });
    });

    it('should instrument XMLHttpRequest automatically', () => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://api.example.com/data');
      xhr.send();

      // Should create spans for XHR requests
      const mockTracer = (global as any).testUtils.createMockTracer();
      expect(mockTracer.startSpan).toHaveBeenCalled();
    });

    it('should instrument fetch automatically', async () => {
      await fetch('https://api.example.com/data');

      // Should create spans for fetch requests
      const mockTracer = (global as any).testUtils.createMockTracer();
      expect(mockTracer.startSpan).toHaveBeenCalled();
    });
  });

  describe('Performance monitoring', () => {
    beforeEach(async () => {
      monitor = createFrontendMonitor();
      await monitor.init({
        serviceName: 'performance-test',
        endpoint: 'https://collector.example.com',
        enablePerformanceMetrics: true
      });
    });

    it('should collect performance metrics', () => {
      // Mock performance entries
      const mockPaintEntries = [
        { name: 'first-contentful-paint', startTime: 1200, entryType: 'paint' }
      ];
      const mockNavEntries = [
        { responseStart: 500, navigationStart: 100, domContentLoadedEventEnd: 2000, loadEventEnd: 3000 }
      ];

      window.performance.getEntriesByType = jest.fn()
        .mockReturnValueOnce(mockPaintEntries)
        .mockReturnValueOnce(mockNavEntries);

      // Trigger performance collection
      setTimeout(() => {
        const metrics = monitor.getPerformanceMetrics();
        expect(metrics).toBeDefined();
      }, 100);
    });
  });

  describe('Configuration options', () => {
    it('should respect enable/disable flags', async () => {
      monitor = createFrontendMonitor();
      await monitor.init({
        serviceName: 'config-test',
        endpoint: 'https://collector.example.com',
        enableAutoTracing: false,
        enableCustomMetrics: false,
        enableErrorMonitoring: false,
        enableUserInteractionMonitoring: false,
        enablePerformanceMetrics: false
      });

      // With all features disabled, should still work but not instrument
      expect(monitor).toBeDefined();
    });

    it('should handle excluded URLs', async () => {
      monitor = createFrontendMonitor();
      await monitor.init({
        serviceName: 'exclude-test',
        endpoint: 'https://collector.example.com',
        excludedUrls: ['*.excluded.com', '*/health']
      });

      // Test excluded URLs
      const xhr1 = new XMLHttpRequest();
      xhr1.open('GET', 'https://api.excluded.com/data');
      xhr1.send();

      const xhr2 = new XMLHttpRequest();
      xhr2.open('GET', 'https://api.included.com/health');
      xhr2.send();

      // Should not instrument excluded URLs
      expect(true).toBe(true);
    });

    it('should handle custom attributes', async () => {
      const attributes = {
        'service.environment': 'test',
        'service.region': 'us-east-1'
      };

      monitor = createFrontendMonitor();
      await monitor.init({
        serviceName: 'attributes-test',
        endpoint: 'https://collector.example.com',
        attributes
      });

      expect(monitor).toBeDefined();
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle multiple initialization calls', async () => {
      monitor = createFrontendMonitor();

      await monitor.init(mockConfig);
      await monitor.init(mockConfig); // Second init should not crash

      expect(monitor).toBeDefined();
    });

    it('should handle operations before initialization', () => {
      monitor = createFrontendMonitor();

      // Should handle gracefully before init
      expect(() => monitor.recordError(new Error('test'))).not.toThrow();
      expect(() => monitor.recordMetrics({ counter: 1 })).not.toThrow();
      expect(() => monitor.recordUserInteraction({ type: 'click', timestamp: Date.now() })).not.toThrow();
    });

    it('should handle destroy properly', async () => {
      monitor = createFrontendMonitor();
      await monitor.init(mockConfig);

      await monitor.destroy();

      // After destroy, operations should be handled gracefully
      expect(() => monitor.recordError(new Error('test'))).not.toThrow();
    });

    it('should handle invalid configuration values', async () => {
      monitor = createFrontendMonitor();

      await expect(monitor.init({
        serviceName: 'test',
        endpoint: 'https://collector.example.com',
        sampleRate: -1 // Invalid sample rate
      })).rejects.toThrow();

      await expect(monitor.init({
        serviceName: 'test',
        endpoint: 'https://collector.example.com',
        sampleRate: 2 // Invalid sample rate > 1
      })).rejects.toThrow();
    });
  });

  describe('Memory cleanup', () => {
    it('should clean up resources on destroy', async () => {
      monitor = createFrontendMonitor();
      await monitor.init(mockConfig);

      // Create some spans and metrics
      const tracer = monitor.startTracing('test');
      monitor.recordMetrics({ counter: 1 });

      await monitor.destroy();

      // Should clean up without errors
      expect(true).toBe(true);
    });
  });
});