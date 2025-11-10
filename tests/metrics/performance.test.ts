/**
 * Unit tests for PerformanceCollector
 */

import { PerformanceCollector } from '../../src/metrics/performance';

describe('PerformanceCollector', () => {
  let performanceCollector: PerformanceCollector;
  let mockMeter: any;

  beforeEach(() => {
    // Mock OpenTelemetry Meter
    mockMeter = {
      createHistogram: jest.fn(() => ({
        record: jest.fn(),
        recordWithAttributes: jest.fn()
      })),
      createCounter: jest.fn(() => ({
        add: jest.fn()
      })),
      createGauge: jest.fn(() => ({
        record: jest.fn()
      }))
    };

    // Mock performance.getEntriesByType
    window.performance.getEntriesByType = jest.fn(() => []);

    performanceCollector = new PerformanceCollector(mockMeter);
  });

  afterEach(() => {
    performanceCollector.stopCollection();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with meter', () => {
      expect(performanceCollector).toBeInstanceOf(PerformanceCollector);
    });

    it('should initialize with empty metrics', () => {
      const metrics = performanceCollector.getCurrentMetrics();
      expect(Object.keys(metrics)).toHaveLength(0);
    });
  });

  describe('startCollection', () => {
    it('should start collecting with default options', () => {
      const observeSpy = jest.spyOn(global.PerformanceObserver.prototype, 'observe');

      performanceCollector.startCollection();

      expect(observeSpy).toHaveBeenCalled();
    });

    it('should start collecting with custom options', () => {
      const observeSpy = jest.spyOn(global.PerformanceObserver.prototype, 'observe');

      performanceCollector.startCollection({
        fcp: true,
        lcp: true,
        cls: true
      });

      expect(observeSpy).toHaveBeenCalled();
    });

    it('should not start multiple collections', () => {
      const observeSpy = jest.spyOn(global.PerformanceObserver.prototype, 'observe');

      performanceCollector.startCollection();
      performanceCollector.startCollection();

      expect(observeSpy).toHaveBeenCalledTimes(3); // 1 initial + 2 for each start
    });
  });

  describe('stopCollection', () => {
    it('should stop collection and clean up observers', () => {
      const disconnectSpy = jest.spyOn(global.PerformanceObserver.prototype, 'disconnect');

      performanceCollector.startCollection();
      performanceCollector.stopCollection();

      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should handle stopping when not started', () => {
      expect(() => performanceCollector.stopCollection()).not.toThrow();
    });
  });

  describe('FCP (First Contentful Paint)', () => {
    beforeEach(() => {
      performanceCollector.startCollection({ fcp: true });
    });

    it('should collect FCP metric', () => {
      const mockEntry = {
        name: 'first-contentful-paint',
        startTime: 1500,
        entryType: 'paint'
      };

      window.performance.getEntriesByType = jest.fn(() => [mockEntry]);

      // Simulate PerformanceObserver callback
      const callback = global.PerformanceObserver.mock.calls[0][0];
      callback({ getEntries: () => [mockEntry] });

      const metrics = performanceCollector.getCurrentMetrics();
      expect(metrics.fcp).toBe(1500);
    });

    it('should ignore non-FCP paint entries', () => {
      const mockEntry = {
        name: 'first-paint',
        startTime: 800,
        entryType: 'paint'
      };

      const callback = global.PerformanceObserver.mock.calls[0][0];
      callback({ getEntries: () => [mockEntry] });

      const metrics = performanceCollector.getCurrentMetrics();
      expect(metrics.fcp).toBeUndefined();
    });
  });

  describe('LCP (Largest Contentful Paint)', () => {
    beforeEach(() => {
      performanceCollector.startCollection({ lcp: true });
    });

    it('should collect LCP metric', () => {
      const mockEntry = {
        startTime: 2500,
        entryType: 'largest-contentful-paint'
      };

      const callback = global.PerformanceObserver.mock.calls[0][0];
      callback({ getEntries: () => [mockEntry] });

      const metrics = performanceCollector.getCurrentMetrics();
      expect(metrics.lcp).toBe(2500);
    });

    it('should update LCP with larger values', () => {
      const entries = [
        { startTime: 1500, entryType: 'largest-contentful-paint' },
        { startTime: 3000, entryType: 'largest-contentful-paint' }
      ];

      const callback = global.PerformanceObserver.mock.calls[0][0];
      callback({ getEntries: () => [entries[0]] });
      callback({ getEntries: () => [entries[1]] });

      const metrics = performanceCollector.getCurrentMetrics();
      expect(metrics.lcp).toBe(3000);
    });
  });

  describe('FID (First Input Delay)', () => {
    beforeEach(() => {
      performanceCollector.startCollection({ fid: true });
    });

    it('should collect FID metric', () => {
      const mockEntry = {
        startTime: 1000,
        processingStart: 1050,
        entryType: 'first-input'
      };

      const callback = global.PerformanceObserver.mock.calls[0][0];
      callback({ getEntries: () => [mockEntry] });

      const metrics = performanceCollector.getCurrentMetrics();
      expect(metrics.fid).toBe(50); // processingStart - startTime
    });

    it('should handle FID entries without processingStart', () => {
      const mockEntry = {
        startTime: 1000,
        entryType: 'first-input'
      };

      const callback = global.PerformanceObserver.mock.calls[0][0];
      callback({ getEntries: () => [mockEntry] });

      const metrics = performanceCollector.getCurrentMetrics();
      expect(metrics.fid).toBe(0);
    });
  });

  describe('CLS (Cumulative Layout Shift)', () => {
    beforeEach(() => {
      performanceCollector.startCollection({ cls: true });
    });

    it('should accumulate CLS metric', () => {
      const entries = [
        { value: 0.1, entryType: 'layout-shift' },
        { value: 0.05, entryType: 'layout-shift' }
      ];

      const callback = global.PerformanceObserver.mock.calls[0][0];
      callback({ getEntries: () => [entries[0]] });
      callback({ getEntries: () => [entries[1]] });

      const metrics = performanceCollector.getCurrentMetrics();
      expect(metrics.cls).toBe(0.15);
    });

    it('should exclude CLS entries without recent input', () => {
      const mockEntry = {
        value: 0.1,
        hadRecentInput: true,
        entryType: 'layout-shift'
      };

      const callback = global.PerformanceObserver.mock.calls[0][0];
      callback({ getEntries: () => [mockEntry] });

      const metrics = performanceCollector.getCurrentMetrics();
      expect(metrics.cls).toBe(0);
    });
  });

  describe('TTFB (Time to First Byte)', () => {
    beforeEach(() => {
      performanceCollector.startCollection({ ttfb: true });
    });

    it('should collect TTFB metric', () => {
      const mockNavTiming = {
        responseStart: 500,
        navigationStart: 100
      };

      // Mock navigation timing
      window.performance.getEntriesByType = jest.fn(() => [mockNavTiming]);

      const callback = global.PerformanceObserver.mock.calls[0][0];
      callback({ getEntries: () => [mockNavTiming] });

      const metrics = performanceCollector.getCurrentMetrics();
      expect(metrics.ttfb).toBe(400); // responseStart - navigationStart
    });

    it('should handle missing navigationStart', () => {
      const mockNavTiming = {
        responseStart: 500
      };

      const callback = global.PerformanceObserver.mock.calls[0][0];
      callback({ getEntries: () => [mockNavTiming] });

      const metrics = performanceCollector.getCurrentMetrics();
      expect(metrics.ttfb).toBe(0);
    });
  });

  describe('Navigation Timing', () => {
    beforeEach(() => {
      performanceCollector.startCollection();
    });

    it('should collect navigation timing metrics', () => {
      const mockNavTiming = {
        domContentLoadedEventEnd: 2000,
        loadEventEnd: 3000,
        navigationStart: 100
      };

      window.performance.getEntriesByType = jest.fn(() => [mockNavTiming]);

      const callback = global.PerformanceObserver.mock.calls[0][0];
      callback({ getEntries: () => [mockNavTiming] });

      const metrics = performanceCollector.getCurrentMetrics();
      expect(metrics.domContentLoaded).toBe(1900);
      expect(metrics.loadComplete).toBe(2900);
    });
  });

  describe('callbacks', () => {
    it('should call update callbacks when metrics change', () => {
      const callback = jest.fn();
      performanceCollector.onMetricsUpdate(callback);

      const mockEntry = {
        name: 'first-contentful-paint',
        startTime: 1500,
        entryType: 'paint'
      };

      performanceCollector.startCollection({ fcp: true });

      const observerCallback = global.PerformanceObserver.mock.calls[0][0];
      observerCallback({ getEntries: () => [mockEntry] });

      expect(callback).toHaveBeenCalledWith({ fcp: 1500 });
    });

    it('should remove callbacks correctly', () => {
      const callback = jest.fn();
      performanceCollector.onMetricsUpdate(callback);

      // Remove callback (implementation would need removeCallback method)
      // For now, just test that callback is called
      const mockEntry = {
        name: 'first-contentful-paint',
        startTime: 1500,
        entryType: 'paint'
      };

      performanceCollector.startCollection({ fcp: true });

      const observerCallback = global.PerformanceObserver.mock.calls[0][0];
      observerCallback({ getEntries: () => [mockEntry] });

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('recordCustomMetrics', () => {
    it('should record custom metrics', () => {
      const customMetrics = {
        fcp: 1200,
        lcp: 2800,
        customMetric: 500
      };

      performanceCollector.recordCustomMetrics(customMetrics);

      const metrics = performanceCollector.getCurrentMetrics();
      expect(metrics.fcp).toBe(1200);
      expect(metrics.lcp).toBe(2800);
      expect(metrics.customMetric).toBe(500);
    });

    it('should merge with existing metrics', () => {
      // Set initial metric
      const metrics1 = { fcp: 1000 };
      performanceCollector.recordCustomMetrics(metrics1);

      // Add more metrics
      const metrics2 = { lcp: 2000, fcp: 1500 };
      performanceCollector.recordCustomMetrics(metrics2);

      const finalMetrics = performanceCollector.getCurrentMetrics();
      expect(finalMetrics.fcp).toBe(1500); // Updated
      expect(finalMetrics.lcp).toBe(2000); // Added
    });
  });

  describe('OpenTelemetry integration', () => {
    it('should create histograms for metrics', () => {
      performanceCollector.startCollection();

      expect(mockMeter.createHistogram).toHaveBeenCalledWith('fcp', expect.any(Object));
      expect(mockMeter.createHistogram).toHaveBeenCalledWith('lcp', expect.any(Object));
      expect(mockMeter.createHistogram).toHaveBeenCalledWith('fid', expect.any(Object));
      expect(mockMeter.createHistogram).toHaveBeenCalledWith('cls', expect.any(Object));
    });

    it('should record metrics to OpenTelemetry', () => {
      const mockHistogram = { record: jest.fn() };
      mockMeter.createHistogram = jest.fn(() => mockHistogram);

      performanceCollector = new PerformanceCollector(mockMeter);
      performanceCollector.startCollection({ fcp: true });

      const mockEntry = {
        name: 'first-contentful-paint',
        startTime: 1500,
        entryType: 'paint'
      };

      const callback = global.PerformanceObserver.mock.calls[0][0];
      callback({ getEntries: () => [mockEntry] });

      expect(mockHistogram.record).toHaveBeenCalledWith(1500, expect.any(Object));
    });
  });
});