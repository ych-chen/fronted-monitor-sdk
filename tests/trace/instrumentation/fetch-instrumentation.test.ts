/**
 * Unit tests for FetchInstrumentation
 */

import { TraceManager } from '../../../src/trace/tracer';
import { FetchInstrumentation } from '../../../src/trace/instrumentation/fetch-instrumentation';

describe('FetchInstrumentation', () => {
  let traceManager: TraceManager;
  let fetchInstrumentation: FetchInstrumentation;
  let originalFetch: any;

  beforeEach(() => {
    traceManager = new TraceManager('test-service');
    fetchInstrumentation = new FetchInstrumentation(traceManager);

    // Store original fetch
    originalFetch = global.fetch;

    // Mock fetch response
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue(''),
      blob: jest.fn().mockResolvedValue(new Blob()),
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    };

    global.fetch = jest.fn().mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    fetchInstrumentation.disable();
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with trace manager', () => {
      expect(fetchInstrumentation).toBeInstanceOf(FetchInstrumentation);
    });

    it('should accept default options', () => {
      const instrumentation = new FetchInstrumentation(traceManager);
      expect(instrumentation).toBeInstanceOf(FetchInstrumentation);
    });

    it('should accept custom options', () => {
      const options = {
        excludedUrls: ['https://api.test.com/exclude'],
        propagateTraceHeaderCorsUrls: ['https://api.test.com']
      };

      const instrumentation = new FetchInstrumentation(traceManager, options);
      expect(instrumentation).toBeInstanceOf(FetchInstrumentation);
    });
  });

  describe('enable', () => {
    it('should enable fetch instrumentation', () => {
      fetchInstrumentation.enable();

      expect(global.fetch).not.toBe(originalFetch);
    });
  });

  describe('disable', () => {
    it('should disable fetch instrumentation', () => {
      fetchInstrumentation.enable();
      fetchInstrumentation.disable();

      expect(global.fetch).toBe(originalFetch);
    });
  });

  describe('URL pattern matching', () => {
    beforeEach(() => {
      fetchInstrumentation.enable();
    });

    it('should track normal URLs', async () => {
      await fetch('https://api.test.com/data');

      expect(global.fetch).toHaveBeenCalledWith('https://api.test.com/data');
    });

    it('should exclude URLs matching exclude patterns', async () => {
      const instrumentation = new FetchInstrumentation(traceManager, {
        excludedUrls: ['*.test.com/exclude']
      });
      instrumentation.enable();

      await fetch('https://api.test.com/exclude');

      // Should call original fetch without instrumentation
      expect(global.fetch).toHaveBeenCalledWith('https://api.test.com/exclude');
    });
  });

  describe('request processing', () => {
    beforeEach(() => {
      fetchInstrumentation.enable();
    });

    it('should handle simple GET requests', async () => {
      await fetch('https://api.test.com/data');

      expect(global.testUtils.createMockTracer().startSpan).toHaveBeenCalledWith(
        'HTTP GET',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'http.method': 'GET',
            'http.url': 'https://api.test.com/data'
          })
        })
      );
    });

    it('should handle POST requests with body', async () => {
      const postData = { name: 'test', value: 123 };

      await fetch('https://api.test.com/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });

      expect(global.testUtils.createMockTracer().startSpan).toHaveBeenCalledWith(
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

    it('should handle Request objects', async () => {
      const request = new Request('https://api.test.com/data', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer token'
        }
      });

      await fetch(request);

      expect(global.testUtils.createMockTracer().startSpan).toHaveBeenCalledWith(
        'HTTP PUT',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'http.method': 'PUT',
            'http.url': 'https://api.test.com/data',
            'http.request.header.authorization': 'Bearer token'
          })
        })
      );
    });

    it('should extract and handle different request body types', async () => {
      // Test with FormData
      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.txt');

      await fetch('https://api.test.com/upload', {
        method: 'POST',
        body: formData
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle null body', async () => {
      await fetch('https://api.test.com/data', {
        method: 'GET',
        body: null
      });

      expect(global.fetch).toHaveBeenCalledWith('https://api.test.com/data', {
        method: 'GET',
        body: null
      });
    });
  });

  describe('response handling', () => {
    beforeEach(() => {
      fetchInstrumentation.enable();
    });

    it('should handle successful responses', async () => {
      const response = await fetch('https://api.test.com/data');

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      // Verify span was ended with success status
      const mockSpan = global.testUtils.createMockSpan();
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('http.status_code', 200);
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should handle error responses', async () => {
      const errorResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        json: jest.fn().mockResolvedValue({ error: 'Not found' }),
        text: jest.fn().mockResolvedValue('Not found'),
        blob: jest.fn().mockResolvedValue(new Blob()),
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
      };

      global.fetch = jest.fn().mockResolvedValue(errorResponse);

      const response = await fetch('https://api.test.com/not-found');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);

      // Verify span was ended with error status
      const mockSpan = global.testUtils.createMockSpan();
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('http.status_code', 404);
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      fetchInstrumentation.enable();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      global.fetch = jest.fn().mockRejectedValue(networkError);

      await expect(fetch('https://api.test.com/data')).rejects.toThrow('Network error');

      // Verify error was recorded on span
      const mockSpan = global.testUtils.createMockSpan();
      expect(mockSpan.recordException).toHaveBeenCalledWith(networkError);
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';
      global.fetch = jest.fn().mockRejectedValue(timeoutError);

      await expect(fetch('https://api.test.com/slow')).rejects.toThrow('Request timeout');

      const mockSpan = global.testUtils.createMockSpan();
      expect(mockSpan.recordException).toHaveBeenCalledWith(timeoutError);
    });
  });

  describe('trace header injection', () => {
    beforeEach(() => {
      fetchInstrumentation.enable();
    });

    it('should inject trace headers for CORS URLs', async () => {
      const instrumentation = new FetchInstrumentation(traceManager, {
        propagateTraceHeaderCorsUrls: ['https://api.test.com']
      });
      instrumentation.enable();

      await fetch('https://api.test.com/data');

      // Verify fetch was called with modified headers
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/data',
        expect.objectContaining({
          headers: expect.any(Object)
        })
      );
    });
  });

  describe('content type detection', () => {
    beforeEach(() => {
      fetchInstrumentation.enable();
    });

    it('should detect JSON content type', async () => {
      await fetch('https://api.test.com/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name": "test"}'
      });

      expect(global.testUtils.createMockTracer().startSpan).toHaveBeenCalledWith(
        'HTTP POST',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'http.request.header.content_type': 'application/json'
          })
        })
      );
    });

    it('should detect form data content type', async () => {
      const formData = new FormData();
      formData.append('key', 'value');

      await fetch('https://api.test.com/submit', {
        method: 'POST',
        body: formData
      });

      // Should handle FormData without throwing
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});