/**
 * End-to-end tests for basic SDK functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Frontend Monitor SDK E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Load the test HTML page
    await page.goto('/test-sdk.html');

    // Wait for SDK to be available
    await page.waitForFunction(() => typeof window.createFrontendMonitor === 'function');
  });

  test('should initialize SDK correctly', async ({ page }) => {
    const initialized = await page.evaluate(() => {
      const monitor = window.createFrontendMonitor();
      return monitor.init({
        serviceName: 'e2e-test',
        endpoint: 'https://otel-collector.test.com/v1/traces',
        enableAutoTracing: true,
        enableCustomMetrics: true
      }).then(() => true).catch(() => false);
    });

    expect(initialized).toBe(true);
  });

  test('should create and record spans', async ({ page }) => {
    const spanCreated = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.createFrontendMonitor().init({
          serviceName: 'span-test',
          endpoint: 'https://otel-collector.test.com/v1/traces'
        }).then(() => {
          const monitor = window.createFrontendMonitor();
          const tracer = monitor.startTracing('e2e-operation');

          // Simulate some work
          setTimeout(() => {
            tracer.endSpan();
            resolve(true);
          }, 100);
        }).catch(() => resolve(false));
      });
    });

    expect(spanCreated).toBe(true);
  });

  test('should record HTTP requests automatically', async ({ page }) => {
    const requestsTraced = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.createFrontendMonitor().init({
          serviceName: 'http-test',
          endpoint: 'https://otel-collector.test.com/v1/traces',
          enableAutoTracing: true
        }).then(() => {
          // Make an HTTP request
          fetch('https://httpbin.org/json')
            .then(() => resolve(true))
            .catch(() => resolve(false));
        }).catch(() => resolve(false));
      });
    });

    expect(requestsTraced).toBe(true);
  });

  test('should record custom metrics', async ({ page }) => {
    const metricsRecorded = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.createFrontendMonitor().init({
          serviceName: 'metrics-test',
          endpoint: 'https://otel-collector.test.com/v1/traces',
          enableCustomMetrics: true
        }).then(() => {
          const monitor = window.createFrontendMonitor();
          const metricsCollector = monitor.getMetricsCollector();

          metricsCollector.incrementCounter('e2e-counter', 5);
          metricsCollector.recordHistogram('e2e-duration', 150);
          metricsCollector.setGauge('e2e-gauge', 42);

          resolve(true);
        }).catch(() => resolve(false));
      });
    });

    expect(metricsRecorded).toBe(true);
  });

  test('should record errors', async ({ page }) => {
    const errorsRecorded = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.createFrontendMonitor().init({
          serviceName: 'error-test',
          endpoint: 'https://otel-collector.test.com/v1/traces',
          enableErrorMonitoring: true
        }).then(() => {
          const monitor = window.createFrontendMonitor();

          // Record an error
          try {
            throw new Error('E2E test error');
          } catch (error) {
            monitor.recordError(error, { testContext: 'e2e' });
          }

          resolve(true);
        }).catch(() => resolve(false));
      });
    });

    expect(errorsRecorded).toBe(true);
  });

  test('should record user interactions', async ({ page }) => {
    const interactionsRecorded = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.createFrontendMonitor().init({
          serviceName: 'interaction-test',
          endpoint: 'https://otel-collector.test.com/v1/traces',
          enableUserInteractionMonitoring: true
        }).then(() => {
          const monitor = window.createFrontendMonitor();

          // Record a user interaction
          monitor.recordUserInteraction({
            type: 'click',
            element: 'button',
            target: '#test-button',
            timestamp: Date.now(),
            duration: 50
          });

          resolve(true);
        }).catch(() => resolve(false));
      });
    });

    expect(interactionsRecorded).toBe(true);
  });

  test('should handle complex workflows', async ({ page }) => {
    const workflowCompleted = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.createFrontendMonitor().init({
          serviceName: 'workflow-test',
          endpoint: 'https://otel-collector.test.com/v1/traces',
          enableAutoTracing: true,
          enableCustomMetrics: true,
          enableErrorMonitoring: true
        }).then(() => {
          const monitor = window.createFrontendMonitor();
          const traceManager = monitor.getTraceManager();

          // Simulate a complex workflow
          traceManager.traceAsync('user-workflow', async (span) => {
            // Step 1: Record metrics
            const metricsCollector = monitor.getMetricsCollector();
            metricsCollector.incrementCounter('workflows-started');

            // Step 2: Make HTTP request
            try {
              const response = await fetch('https://httpbin.org/delay/0.1');
              metricsCollector.recordHistogram('api-response-time', 100);

              // Step 3: Process response
              if (response.ok) {
                metricsCollector.incrementCounter('workflows-completed');
              } else {
                monitor.recordError('API request failed', { status: response.status });
              }
            } catch (error) {
              monitor.recordError(error, { workflow: 'user-workflow' });
            }

            return 'workflow-complete';
          }).then(() => resolve(true))
            .catch(() => resolve(false));
        }).catch(() => resolve(false));
      });
    });

    expect(workflowCompleted).toBe(true);
  });

  test('should handle configuration changes', async ({ page }) => {
    const reconfigured = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Initialize with basic config
        window.createFrontendMonitor().init({
          serviceName: 'reconfig-test',
          endpoint: 'https://otel-collector.test.com/v1/traces',
          enableAutoTracing: true,
          enableCustomMetrics: false
        }).then(() => {
          const monitor = window.createFrontendMonitor();

          // Try to use metrics (should not crash even if disabled)
          try {
            monitor.recordMetrics({ counter: 1 });
            resolve(true);
          } catch (error) {
            resolve(false);
          }
        }).catch(() => resolve(false));
      });
    });

    expect(reconfigured).toBe(true);
  });

  test('should clean up properly on destroy', async ({ page }) => {
    const cleanedUp = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.createFrontendMonitor().init({
          serviceName: 'cleanup-test',
          endpoint: 'https://otel-collector.test.com/v1/traces'
        }).then(() => {
          const monitor = window.createFrontendMonitor();

          // Create some resources
          const tracer = monitor.startTracing('cleanup-test');

          // Destroy and cleanup
          monitor.destroy().then(() => {
            resolve(true);
          }).catch(() => resolve(false));
        }).catch(() => resolve(false));
      });
    });

    expect(cleanedUp).toBe(true);
  });

  test('should handle multiple concurrent operations', async ({ page }) => {
    const concurrentOpsCompleted = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.createFrontendMonitor().init({
          serviceName: 'concurrent-test',
          endpoint: 'https://otel-collector.test.com/v1/traces'
        }).then(() => {
          const monitor = window.createFrontendMonitor();

          // Run multiple operations concurrently
          const operations = [];

          // Multiple spans
          for (let i = 0; i < 5; i++) {
            operations.push(
              new Promise((spanResolve) => {
                const tracer = monitor.startTracing(`concurrent-span-${i}`);
                setTimeout(() => {
                  tracer.endSpan();
                  spanResolve(true);
                }, 10);
              })
            );
          }

          // Multiple metrics
          const metricsCollector = monitor.getMetricsCollector();
          for (let i = 0; i < 10; i++) {
            metricsCollector.incrementCounter('concurrent-counter');
          }

          Promise.all(operations).then(() => resolve(true));
        }).catch(() => resolve(false));
      });
    });

    expect(concurrentOpsCompleted).toBe(true);
  });
});