/**
 * Unit tests for CustomMetricsCollector
 */

import { CustomMetricsCollector } from '../../src/metrics/custom';

describe('CustomMetricsCollector', () => {
  let customMetricsCollector: CustomMetricsCollector;
  let mockMeter: any;

  beforeEach(() => {
    // Mock OpenTelemetry Meter
    mockMeter = {
      createCounter: jest.fn(() => ({
        add: jest.fn()
      })),
      createHistogram: jest.fn(() => ({
        record: jest.fn()
      })),
      createGauge: jest.fn(() => ({
        record: jest.fn()
      }))
    };

    customMetricsCollector = new CustomMetricsCollector(mockMeter);
  });

  afterEach(() => {
    customMetricsCollector.clear();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with meter', () => {
      expect(customMetricsCollector).toBeInstanceOf(CustomMetricsCollector);
    });

    it('should initialize empty metric collections', () => {
      const names = customMetricsCollector.getMetricNames();
      expect(names.counters).toHaveLength(0);
      expect(names.histograms).toHaveLength(0);
      expect(names.gauges).toHaveLength(0);
    });
  });

  describe('counters', () => {
    describe('getCounter', () => {
      it('should create a new counter', () => {
        const counter = customMetricsCollector.getCounter('test-counter');

        expect(counter).toBeDefined();
        expect(mockMeter.createCounter).toHaveBeenCalledWith('test-counter', expect.any(Object));
      });

      it('should reuse existing counter', () => {
        const counter1 = customMetricsCollector.getCounter('reuse-counter');
        const counter2 = customMetricsCollector.getCounter('reuse-counter');

        expect(counter1).toBe(counter2);
        expect(mockMeter.createCounter).toHaveBeenCalledTimes(1);
      });

      it('should create counter with options', () => {
        const options = {
          name: 'Test Counter',
          description: 'A test counter',
          unit: 'requests'
        };

        customMetricsCollector.getCounter('counter-with-options', options);

        expect(mockMeter.createCounter).toHaveBeenCalledWith('counter-with-options', {
          description: 'A test counter',
          unit: 'requests'
        });
      });
    });

    describe('incrementCounter', () => {
      it('should increment counter by 1', () => {
        customMetricsCollector.incrementCounter('increment-test');

        const mockCounter = mockMeter.createCounter.mock.results[0].value;
        expect(mockCounter.add).toHaveBeenCalledWith(1, {});
      });

      it('should increment counter by custom value', () => {
        customMetricsCollector.incrementCounter('increment-custom', 5);

        const mockCounter = mockMeter.createCounter.mock.results[0].value;
        expect(mockCounter.add).toHaveBeenCalledWith(5, {});
      });

      it('should increment counter with labels', () => {
        const labels = { method: 'GET', status: '200' };
        customMetricsCollector.incrementCounter('increment-labeled', 1, labels);

        const mockCounter = mockMeter.createCounter.mock.results[0].value;
        expect(mockCounter.add).toHaveBeenCalledWith(1, labels);
      });

      it('should increment counter with options', () => {
        const options = {
          name: 'Test Counter',
          unit: 'requests'
        };

        customMetricsCollector.incrementCounter('increment-with-options', 2, {}, options);

        expect(mockMeter.createCounter).toHaveBeenCalledWith('increment-with-options', {
          name: 'Test Counter',
          unit: 'requests'
        });
      });
    });
  });

  describe('histograms', () => {
    describe('getHistogram', () => {
      it('should create a new histogram', () => {
        const histogram = customMetricsCollector.getHistogram('test-histogram');

        expect(histogram).toBeDefined();
        expect(mockMeter.createHistogram).toHaveBeenCalledWith('test-histogram', expect.any(Object));
      });

      it('should reuse existing histogram', () => {
        const histogram1 = customMetricsCollector.getHistogram('reuse-histogram');
        const histogram2 = customMetricsCollector.getHistogram('reuse-histogram');

        expect(histogram1).toBe(histogram2);
        expect(mockMeter.createHistogram).toHaveBeenCalledTimes(1);
      });
    });

    describe('recordHistogram', () => {
      it('should record histogram value', () => {
        customMetricsCollector.recordHistogram('histogram-test', 150);

        const mockHistogram = mockMeter.createHistogram.mock.results[0].value;
        expect(mockHistogram.record).toHaveBeenCalledWith(150, {});
      });

      it('should record histogram with labels', () => {
        const labels = { operation: 'database', table: 'users' };
        customMetricsCollector.recordHistogram('histogram-labeled', 50, labels);

        const mockHistogram = mockMeter.createHistogram.mock.results[0].value;
        expect(mockHistogram.record).toHaveBeenCalledWith(50, labels);
      });

      it('should record histogram with options', () => {
        const options = {
          name: 'Response Time',
          unit: 'ms'
        };

        customMetricsCollector.recordHistogram('histogram-with-options', 200, {}, options);

        expect(mockMeter.createHistogram).toHaveBeenCalledWith('histogram-with-options', {
          name: 'Response Time',
          unit: 'ms'
        });
      });
    });
  });

  describe('gauges', () => {
    describe('getGauge', () => {
      it('should create a new gauge', () => {
        const gauge = customMetricsCollector.getGauge('test-gauge');

        expect(gauge).toBeDefined();
        expect(mockMeter.createGauge).toHaveBeenCalledWith('test-gauge', expect.any(Object));
      });

      it('should reuse existing gauge', () => {
        const gauge1 = customMetricsCollector.getGauge('reuse-gauge');
        const gauge2 = customMetricsCollector.getGauge('reuse-gauge');

        expect(gauge1).toBe(gauge2);
        expect(mockMeter.createGauge).toHaveBeenCalledTimes(1);
      });
    });

    describe('setGauge', () => {
      it('should set gauge value', () => {
        customMetricsCollector.setGauge('gauge-test', 75);

        const mockGauge = mockMeter.createGauge.mock.results[0].value;
        expect(mockGauge.record).toHaveBeenCalledWith(75, {});
      });

      it('should set gauge with labels', () => {
        const labels = { server: 'prod-1', metric: 'cpu' };
        customMetricsCollector.setGauge('gauge-labeled', 60.5, labels);

        const mockGauge = mockMeter.createGauge.mock.results[0].value;
        expect(mockGauge.record).toHaveBeenCalledWith(60.5, labels);
      });
    });

    describe('incrementGauge', () => {
      it('should increment gauge by 1', () => {
        customMetricsCollector.setGauge('gauge-inc-test', 10);
        customMetricsCollector.incrementGauge('gauge-inc-test');

        const mockGauge = mockMeter.createGauge.mock.results[0].value;
        expect(mockGauge.record).toHaveBeenCalledWith(11, {});
      });

      it('should increment gauge by custom value', () => {
        customMetricsCollector.setGauge('gauge-inc-custom', 20);
        customMetricsCollector.incrementGauge('gauge-inc-custom', 5);

        const mockGauge = mockMeter.createGauge.mock.results[0].value;
        expect(mockGauge.record).toHaveBeenCalledWith(25, {});
      });
    });

    describe('decrementGauge', () => {
      it('should decrement gauge by 1', () => {
        customMetricsCollector.setGauge('gauge-dec-test', 15);
        customMetricsCollector.decrementGauge('gauge-dec-test');

        const mockGauge = mockMeter.createGauge.mock.results[0].value;
        expect(mockGauge.record).toHaveBeenCalledWith(14, {});
      });

      it('should decrement gauge by custom value', () => {
        customMetricsCollector.setGauge('gauge-dec-custom', 30);
        customMetricsCollector.decrementGauge('gauge-dec-custom', 8);

        const mockGauge = mockMeter.createGauge.mock.results[0].value;
        expect(mockGauge.record).toHaveBeenCalledWith(22, {});
      });
    });
  });

  describe('business metrics', () => {
    describe('recordEvent', () => {
      it('should record event using counter', () => {
        customMetricsCollector.recordEvent('user-login', 3, { user_type: 'premium' });

        expect(mockMeter.createCounter).toHaveBeenCalledWith('user-login', expect.any(Object));
        const mockCounter = mockMeter.createCounter.mock.results[0].value;
        expect(mockCounter.add).toHaveBeenCalledWith(3, { user_type: 'premium' });
      });

      it('should default to count 1', () => {
        customMetricsCollector.recordEvent('page-view');

        const mockCounter = mockMeter.createCounter.mock.results[0].value;
        expect(mockCounter.add).toHaveBeenCalledWith(1, {});
      });
    });

    describe('recordDuration', () => {
      it('should record duration using histogram', () => {
        customMetricsCollector.recordDuration('api-call', 250, { endpoint: '/api/users' });

        expect(mockMeter.createHistogram).toHaveBeenCalledWith('api-call', expect.any(Object));
        const mockHistogram = mockMeter.createHistogram.mock.results[0].value;
        expect(mockHistogram.record).toHaveBeenCalledWith(250, { endpoint: '/api/users' });
      });
    });

    describe('recordState', () => {
      it('should record state using gauge', () => {
        customMetricsCollector.recordState('active-users', 42, { region: 'us-east' });

        expect(mockMeter.createGauge).toHaveBeenCalledWith('active-users', expect.any(Object));
        const mockGauge = mockMeter.createGauge.mock.results[0].value;
        expect(mockGauge.record).toHaveBeenCalledWith(42, { region: 'us-east' });
      });
    });

    describe('recordHTTPRequest', () => {
      it('should record HTTP request metrics', () => {
        customMetricsCollector.recordHTTPRequest('GET', 'https://api.test.com/users', 200, 150);

        expect(mockMeter.createCounter).toHaveBeenCalledWith('http_requests', expect.any(Object));
        expect(mockMeter.createHistogram).toHaveBeenCalledWith('http_request_duration', expect.any(Object));

        const mockCounter = mockMeter.createCounter.mock.results[0].value;
        const mockHistogram = mockMeter.createHistogram.mock.results[0].value;

        expect(mockCounter.add).toHaveBeenCalledWith(1, {
          method: 'GET',
          status_code: '200'
        });
        expect(mockHistogram.record).toHaveBeenCalledWith(150, {
          method: 'GET',
          status_code: '200'
        });
      });

      it('should handle error status codes', () => {
        customMetricsCollector.recordHTTPRequest('POST', 'https://api.test.com/users', 500, 2000);

        const mockCounter = mockMeter.createCounter.mock.results[0].value;
        const mockHistogram = mockMeter.createHistogram.mock.results[0].value;

        expect(mockCounter.add).toHaveBeenCalledWith(1, {
          method: 'POST',
          status_code: '500'
        });
        expect(mockHistogram.record).toHaveBeenCalledWith(2000, {
          method: 'POST',
          status_code: '500'
        });
      });
    });

    describe('recordUserAction', () => {
      it('should record user action metrics', () => {
        customMetricsCollector.recordUserAction('click', 'button', 150);

        expect(mockMeter.createCounter).toHaveBeenCalledWith('user_actions', expect.any(Object));
        if (mockMeter.createHistogram) {
          expect(mockMeter.createHistogram).toHaveBeenCalledWith('user_action_duration', expect.any(Object));
        }

        const mockCounter = mockMeter.createCounter.mock.results[0].value;
        expect(mockCounter.add).toHaveBeenCalledWith(1, {
          action_type: 'click',
          element_type: 'button'
        });
      });

      it('should handle actions without duration', () => {
        customMetricsCollector.recordUserAction('scroll', 'page');

        const mockCounter = mockMeter.createCounter.mock.results[0].value;
        expect(mockCounter.add).toHaveBeenCalledWith(1, {
          action_type: 'scroll',
          element_type: 'page'
        });
      });
    });

    describe('recordBusinessMetric', () => {
      it('should record generic business metric', () => {
        customMetricsCollector.recordBusinessMetric('revenue', 1250.50, { currency: 'USD', period: 'daily' });

        expect(mockMeter.createHistogram).toHaveBeenCalledWith('revenue', expect.any(Object));
        const mockHistogram = mockMeter.createHistogram.mock.results[0].value;
        expect(mockHistogram.record).toHaveBeenCalledWith(1250.50, { currency: 'USD', period: 'daily' });
      });
    });
  });

  describe('batch operations', () => {
    it('should record batch metrics', () => {
      const batch = [
        { type: 'counter', name: 'batch-counter', value: 5 },
        { type: 'histogram', name: 'batch-histogram', value: 100 },
        { type: 'gauge', name: 'batch-gauge', value: 42 }
      ];

      customMetricsCollector.recordBatch(batch);

      expect(mockMeter.createCounter).toHaveBeenCalledWith('batch-counter', expect.any(Object));
      expect(mockMeter.createHistogram).toHaveBeenCalledWith('batch-histogram', expect.any(Object));
      expect(mockMeter.createGauge).toHaveBeenCalledWith('batch-gauge', expect.any(Object));

      const mockCounter = mockMeter.createCounter.mock.results[0].value;
      const mockHistogram = mockMeter.createHistogram.mock.results[0].value;
      const mockGauge = mockMeter.createGauge.mock.results[0].value;

      expect(mockCounter.add).toHaveBeenCalledWith(5, {});
      expect(mockHistogram.record).toHaveBeenCalledWith(100, {});
      expect(mockGauge.record).toHaveBeenCalledWith(42, {});
    });

    it('should handle empty batch', () => {
      expect(() => customMetricsCollector.recordBatch([])).not.toThrow();
    });

    it('should handle invalid metric types in batch', () => {
      const batch = [
        { type: 'counter', name: 'valid-counter', value: 1 },
        { type: 'invalid', name: 'invalid-metric', value: 2 } as any
      ];

      expect(() => customMetricsCollector.recordBatch(batch)).not.toThrow();
      expect(mockMeter.createCounter).toHaveBeenCalledTimes(1);
    });
  });

  describe('metric management', () => {
    describe('getMetricNames', () => {
      it('should return all metric names', () => {
        customMetricsCollector.incrementCounter('counter-1');
        customMetricsCollector.recordHistogram('histogram-1', 100);
        customMetricsCollector.setGauge('gauge-1', 50);

        const names = customMetricsCollector.getMetricNames();
        expect(names.counters).toContain('counter-1');
        expect(names.histograms).toContain('histogram-1');
        expect(names.gauges).toContain('gauge-1');
      });
    });

    describe('clear', () => {
      it('should clear all metrics', () => {
        customMetricsCollector.incrementCounter('counter-1');
        customMetricsCollector.recordHistogram('histogram-1', 100);
        customMetricsCollector.setGauge('gauge-1', 50);

        customMetricsCollector.clear();

        const names = customMetricsCollector.getMetricNames();
        expect(names.counters).toHaveLength(0);
        expect(names.histograms).toHaveLength(0);
        expect(names.gauges).toHaveLength(0);
      });
    });
  });
});