/**
 * Unit tests for TraceManager
 */

import { TraceManager } from '../../src/trace/tracer';

describe('TraceManager', () => {
  let traceManager: TraceManager;

  beforeEach(() => {
    traceManager = new TraceManager('test-service');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with service name', () => {
      expect(traceManager).toBeInstanceOf(TraceManager);
    });
  });

  describe('startSpan', () => {
    it('should create a new span with given name', () => {
      const span = traceManager.startSpan('test-span');

      expect(span).toBeDefined();
      expect(global.testUtils.createMockTracer().startSpan).toHaveBeenCalledWith('test-span', undefined);
    });

    it('should create a span with options', () => {
      const options = {
        kind: 1, // SPAN_KIND_CLIENT
        attributes: { 'key': 'value' }
      };

      traceManager.startSpan('test-span', options);

      expect(global.testUtils.createMockTracer().startSpan).toHaveBeenCalledWith('test-span', options);
    });
  });

  describe('traceAsync', () => {
    it('should execute async function with tracing context', async () => {
      const mockFn = jest.fn().mockResolvedValue('test-result');
      const options = { attributes: { 'test': 'true' } };

      const result = await traceManager.traceAsync('async-operation', mockFn, options);

      expect(result).toBe('test-result');
      expect(mockFn).toHaveBeenCalledWith(expect.any(Object));
      expect(global.testUtils.createMockTracer().startSpan).toHaveBeenCalledWith('async-operation', options);
    });

    it('should handle async function errors', async () => {
      const error = new Error('Test error');
      const mockFn = jest.fn().mockRejectedValue(error);

      await expect(traceManager.traceAsync('failing-operation', mockFn)).rejects.toThrow('Test error');

      const mockSpan = global.testUtils.createMockSpan();
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
    });
  });

  describe('trace', () => {
    it('should execute sync function with tracing context', () => {
      const mockFn = jest.fn().mockReturnValue('sync-result');
      const options = { attributes: { 'sync': 'true' } };

      const result = traceManager.trace('sync-operation', mockFn, options);

      expect(result).toBe('sync-result');
      expect(mockFn).toHaveBeenCalledWith(expect.any(Object));
      expect(global.testUtils.createMockTracer().startSpan).toHaveBeenCalledWith('sync-operation', options);
    });

    it('should handle sync function errors', () => {
      const error = new Error('Sync error');
      const mockFn = jest.fn().mockImplementation(() => {
        throw error;
      });

      expect(() => traceManager.trace('failing-sync', mockFn)).toThrow('Sync error');

      const mockSpan = global.testUtils.createMockSpan();
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
    });
  });

  describe('recordError', () => {
    it('should record error to active span', () => {
      const error = new Error('Test error');
      const attributes = { 'error.code': '500' };

      traceManager.recordError(error, attributes);

      const mockSpan = global.testUtils.createMockSpan();
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.code', '500');
    });
  });

  describe('runInContext', () => {
    it('should execute function in span context', () => {
      const mockFn = jest.fn().mockReturnValue('context-result');
      const mockSpan = global.testUtils.createMockSpan();

      const result = traceManager.runInContext(mockSpan, mockFn);

      expect(result).toBe('context-result');
      expect(mockFn).toHaveBeenCalled();
    });
  });

  describe('getActiveSpan', () => {
    it('should return active span', () => {
      const span = traceManager.getActiveSpan();
      expect(span).toBeDefined();
    });
  });

  describe('setAttributes', () => {
    it('should set attributes on active span', () => {
      const attributes = { 'user.id': '123', 'request.id': 'abc' };

      traceManager.setAttributes(attributes);

      const mockSpan = global.testUtils.createMockSpan();
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('user.id', '123');
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('request.id', 'abc');
    });
  });

  describe('addEvent', () => {
    it('should add event to active span', () => {
      const eventName = 'user.action';
      const attributes = { 'action.type': 'click' };

      traceManager.addEvent(eventName, attributes);

      const mockSpan = global.testUtils.createMockSpan();
      expect(mockSpan.addEvent).toHaveBeenCalledWith(eventName, attributes);
    });
  });

  describe('createRootSpan', () => {
    it('should create root span with attributes', () => {
      const attributes = { 'service.name': 'test-service' };

      traceManager.createRootSpan('page-load', attributes);

      expect(global.testUtils.createMockTracer().startSpan).toHaveBeenCalledWith('page-load', {
        kind: 1, // SPAN_KIND_CLIENT
        attributes
      });
    });
  });
});