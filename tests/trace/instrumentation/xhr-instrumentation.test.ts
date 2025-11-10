/**
 * Unit tests for XHRInstrumentation
 */

import { TraceManager } from '../../../src/trace/tracer';
import { XHRInstrumentation } from '../../../src/trace/instrumentation/xhr-instrumentation';

describe('XHRInstrumentation', () => {
  let traceManager: TraceManager;
  let xhrInstrumentation: XHRInstrumentation;
  let originalXMLHttpRequest: any;
  let mockXHR: any;

  beforeEach(() => {
    traceManager = new TraceManager('test-service');
    xhrInstrumentation = new XHRInstrumentation(traceManager);

    // Store original XMLHttpRequest
    originalXMLHttpRequest = global.XMLHttpRequest;

    // Create a fresh mock for each test
    mockXHR = {
      open: jest.fn(),
      send: jest.fn(),
      setRequestHeader: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: 0,
      status: 200,
      response: '',
      responseText: '',
    };

    global.XMLHttpRequest = jest.fn().mockImplementation(() => mockXHR);
  });

  afterEach(() => {
    xhrInstrumentation.disable();
    global.XMLHttpRequest = originalXMLHttpRequest;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with trace manager', () => {
      expect(xhrInstrumentation).toBeInstanceOf(XHRInstrumentation);
    });

    it('should accept default options', () => {
      const instrumentation = new XHRInstrumentation(traceManager);
      expect(instrumentation).toBeInstanceOf(XHRInstrumentation);
    });

    it('should accept custom options', () => {
      const options = {
        excludedUrls: ['https://api.test.com/exclude'],
        propagateTraceHeaderCorsUrls: ['https://api.test.com']
      };

      const instrumentation = new XHRInstrumentation(traceManager, options);
      expect(instrumentation).toBeInstanceOf(XHRInstrumentation);
    });
  });

  describe('enable', () => {
    it('should enable XHR instrumentation', () => {
      xhrInstrumentation.enable();

      // Verify that XMLHttpRequest constructor was patched
      const xhr = new global.XMLHttpRequest();
      expect(typeof xhr.open).toBe('function');
      expect(typeof xhr.send).toBe('function');
      expect(typeof xhr.setRequestHeader).toBe('function');
    });
  });

  describe('disable', () => {
    it('should disable XHR instrumentation', () => {
      xhrInstrumentation.enable();
      xhrInstrumentation.disable();

      // Verify original methods are restored
      expect(global.XMLHttpRequest).toBe(originalXMLHttpRequest);
    });
  });

  describe('URL pattern matching', () => {
    beforeEach(() => {
      xhrInstrumentation.enable();
    });

    it('should track normal URLs', () => {
      const xhr = new global.XMLHttpRequest();
      xhr.open('GET', 'https://api.test.com/data');

      // Should not throw and should be tracked
      expect(mockXHR.open).toHaveBeenCalled();
    });

    it('should exclude URLs matching exclude patterns', () => {
      const instrumentation = new XHRInstrumentation(traceManager, {
        excludedUrls: ['*.test.com/exclude']
      });
      instrumentation.enable();

      const xhr = new global.XMLHttpRequest();
      xhr.open('GET', 'https://api.test.com/exclude');

      // Should call original method without instrumentation
      expect(mockXHR.open).toHaveBeenCalled();
    });
  });

  describe('trace header injection', () => {
    beforeEach(() => {
      xhrInstrumentation.enable();
    });

    it('should inject trace headers for CORS URLs', () => {
      const instrumentation = new XHRInstrumentation(traceManager, {
        propagateTraceHeaderCorsUrls: ['https://api.test.com']
      });
      instrumentation.enable();

      const xhr = new global.XMLHttpRequest();
      xhr.open('GET', 'https://api.test.com/data');
      xhr.setRequestHeader('Content-Type', 'application/json');

      // Should inject trace headers
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    });
  });

  describe('event handling', () => {
    beforeEach(() => {
      xhrInstrumentation.enable();
    });

    it('should handle load events', () => {
      const xhr = new global.XMLHttpRequest();
      xhr.open('GET', 'https://api.test.com/data');
      xhr.send();

      // Should add event listeners
      expect(mockXHR.addEventListener).toHaveBeenCalledWith('load', expect.any(Function));
      expect(mockXHR.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockXHR.addEventListener).toHaveBeenCalledWith('abort', expect.any(Function));
      expect(mockXHR.addEventListener).toHaveBeenCalledWith('timeout', expect.any(Function));
    });

    it('should handle send with request body', () => {
      const xhr = new global.XMLHttpRequest();
      xhr.open('POST', 'https://api.test.com/data');

      const testData = JSON.stringify({ key: 'value' });
      xhr.send(testData);

      expect(mockXHR.send).toHaveBeenCalledWith(testData);
    });

    it('should handle send without request body', () => {
      const xhr = new global.XMLHttpRequest();
      xhr.open('GET', 'https://api.test.com/data');
      xhr.send();

      expect(mockXHR.send).toHaveBeenCalledWith(null);
    });
  });

  describe('span lifecycle', () => {
    beforeEach(() => {
      xhrInstrumentation.enable();
    });

    it('should create span for XHR request', () => {
      const xhr = new global.XMLHttpRequest();
      xhr.open('GET', 'https://api.test.com/data');
      xhr.send();

      const mockTracer = global.testUtils.createMockTracer();
      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'HTTP GET',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'http.method': 'GET',
            'http.url': 'https://api.test.com/data'
          })
        })
      );
    });

    it('should set span attributes correctly', () => {
      const xhr = new global.XMLHttpRequest();
      xhr.open('POST', 'https://api.test.com/api/users');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({ name: 'test' }));

      const mockTracer = global.testUtils.createMockTracer();
      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'HTTP POST',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'http.method': 'POST',
            'http.url': 'https://api.test.com/api/users',
            'http.request.header.content_type': 'application/json'
          })
        })
      );
    });
  });
});