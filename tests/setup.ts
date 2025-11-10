/**
 * Jest setup file for test environment configuration
 */

// Mock browser APIs that might not be available in jsdom
Object.defineProperty(window, 'performance', {
  value: {
    ...window.performance,
    now: jest.fn(() => Date.now()),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    mark: jest.fn(),
    measure: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
  },
});

// Mock PerformanceObserver
global.PerformanceObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock XMLHttpRequest
const mockXHR = {
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

// Mock OpenTelemetry APIs
const mockSpan = {
  setAttribute: jest.fn(),
  addEvent: jest.fn(),
  recordException: jest.fn(),
  end: jest.fn(),
  setStatus: jest.fn(),
};

const mockTracer = {
  startSpan: jest.fn(() => mockSpan),
  startActiveSpan: jest.fn(),
};

const mockTraceAPI = {
  trace: {
    getTracer: jest.fn(() => mockTracer),
    getSpan: jest.fn(() => mockSpan),
    setActiveSpan: jest.fn(() => mockSpan),
  },
};

// Mock OpenTelemetry API
jest.mock('@opentelemetry/api', () => mockTraceAPI);

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

// Setup global test utilities
(global as any).testUtils = {
  createMockSpan: () => mockSpan,
  createMockTracer: () => mockTracer,
  waitForMicrotasks: () => new Promise(resolve => setTimeout(resolve, 0)),
};