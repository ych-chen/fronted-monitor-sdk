/**
 * React Hooks + Frontend Monitor SDK 示例
 * 展示如何在React应用中使用Hooks来集成监控SDK
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createFrontendMonitor, type FrontendMonitorSDK } from '../src/index';

// Types
interface User {
  id: string;
  name: string;
  email: string;
}

interface MetricData {
  id: string;
  label: string;
  value: number;
  timestamp: number;
  type: 'counter' | 'histogram' | 'gauge';
}

interface PerformanceMetrics {
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
  domContentLoaded?: number;
  loadComplete?: number;
}

type StatusType = 'idle' | 'loading' | 'success' | 'error';

// Custom hook for monitor management
export const useFrontendMonitor = (config: any) => {
  const monitorRef = useRef<FrontendMonitorSDK | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeMonitor = async () => {
      try {
        const monitor = createFrontendMonitor();

        await monitor.init({
          serviceName: 'react-hooks-app',
          serviceVersion: '2.0.0',
          endpoint: 'https://your-collector.example.com',
          apiKey: 'your-api-key',
          sampleRate: 1.0,
          enablePerformanceMonitoring: true,
          enableErrorMonitoring: true,
          enableUserInteractionMonitoring: true,
          enableAutoTracing: true,
          enableCustomMetrics: true,
          attributes: {
            framework: 'react',
            hooks_version: '2.0.0',
            environment: process.env.NODE_ENV || 'development',
            ...config.attributes
          },
          ...config
        });

        if (mounted) {
          monitorRef.current = monitor;
          setIsInitialized(true);
          setError(null);
        }

      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage);
          console.error('Failed to initialize monitor:', err);
        }
      }
    };

    initializeMonitor();

    return () => {
      mounted = false;
      if (monitorRef.current) {
        monitorRef.current.destroy();
        monitorRef.current = null;
      }
    };
  }, [config]);

  const monitor = useMemo(() => monitorRef.current, [isInitialized]);

  const startTracing = useCallback((name: string, options?: any) => {
    if (!monitor) {
      console.warn('Monitor not initialized');
      return null;
    }
    return monitor.startTracing(name, options);
  }, [monitor]);

  const recordError = useCallback((error: Error | string, context?: any) => {
    if (!monitor) return;
    monitor.recordError(error, context);
  }, [monitor]);

  const recordUserInteraction = useCallback((event: any) => {
    if (!monitor) return;
    monitor.recordUserInteraction(event);
  }, [monitor]);

  const getMetricsCollector = useCallback(() => {
    if (!monitor) {
      throw new Error('Monitor not initialized');
    }
    return monitor.getMetricsCollector();
  }, [monitor]);

  return {
    monitor,
    isInitialized,
    error,
    startTracing,
    recordError,
    recordUserInteraction,
    getMetricsCollector
  };
};

// Custom hook for user management with monitoring
export const useUserManagement = (monitorHooks: ReturnType<typeof useFrontendMonitor>) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<StatusType>('idle');
  const { startTracing, recordError, recordUserInteraction, getMetricsCollector } = monitorHooks;

  const login = useCallback(async () => {
    if (status === 'loading') return;

    const tracing = startTracing('user_login', {
      attributes: {
        login_method: 'react_hooks',
        timestamp: Date.now()
      }
    });

    if (!tracing) return;

    setStatus('loading');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (Math.random() > 0.2) { // 80% success rate
        const newUser: User = {
          id: 'user_' + Math.random().toString(36).substr(2, 9),
          name: 'React Hooks User',
          email: 'hooks@example.com'
        };

        setUser(newUser);
        setStatus('success');

        // Record success metrics
        const metrics = getMetricsCollector();
        metrics.incrementCounter('user_logins_total', 1, {
          status: 'success',
          method: 'react_hooks'
        });

        tracing.endSpan();

      } else {
        throw new Error('Invalid credentials');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      recordError(error instanceof Error ? error : new Error(errorMessage));
      tracing.endSpan();

      // Record failure metrics
      const metrics = getMetricsCollector();
      metrics.incrementCounter('user_logins_total', 1, {
        status: 'error',
        error_type: errorMessage,
        method: 'react_hooks'
      });

      setStatus('error');
    }
  }, [status, startTracing, recordError, getMetricsCollector]);

  const logout = useCallback(() => {
    const tracing = startTracing('user_logout');

    setUser(null);
    setStatus('idle');

    // Record logout metrics
    const metrics = getMetricsCollector();
    metrics.incrementCounter('user_logouts_total', 1, {
      user_id: user?.id || 'unknown'
    });

    tracing?.endSpan();
  }, [startTracing, getMetricsCollector, user?.id]);

  const updateProfile = useCallback(async (newName: string) => {
    if (!user || status === 'loading') return;

    const tracing = startTracing('profile_update', {
      attributes: {
        user_id: user.id,
        update_field: 'name'
      }
    });

    if (!tracing) return;

    setStatus('loading');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      if (newName.length < 2) {
        throw new Error('Name too short');
      }

      setUser(prev => prev ? { ...prev, name: newName } : null);

      // Record success metrics
      const metrics = getMetricsCollector();
      metrics.incrementCounter('profile_updates_total', 1, {
        status: 'success',
        field: 'name'
      });

      tracing.endSpan();
      setStatus('success');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Update failed';
      recordError(error instanceof Error ? error : new Error(errorMessage));
      tracing.endSpan();

      setStatus('error');
    }
  }, [user, status, startTracing, recordError, getMetricsCollector]);

  return {
    user,
    status,
    login,
    logout,
    updateProfile
  };
};

// Custom hook for metrics management
export const useMetrics = (monitorHooks: ReturnType<typeof useFrontendMonitor>) => {
  const [customMetrics, setCustomMetrics] = useState<MetricData[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({});
  const { getMetricsCollector } = monitorHooks;

  // Start performance monitoring
  useEffect(() => {
    const timer = setTimeout(() => {
      const mockMetrics: PerformanceMetrics = {
        fcp: Math.random() * 1500 + 300,
        lcp: Math.random() * 3000 + 800,
        fid: Math.random() * 100,
        cls: Math.random() * 0.3,
        ttfb: Math.random() * 500 + 100,
        domContentLoaded: Math.random() * 1000 + 200,
        loadComplete: Math.random() * 2000 + 500
      };

      setPerformanceMetrics(mockMetrics);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const recordCustomMetric = useCallback((type: MetricData['type'], label: string, value: number) => {
    const metrics = getMetricsCollector();

    const newMetric: MetricData = {
      id: Date.now().toString(),
      label,
      value,
      type,
      timestamp: Date.now()
    };

    setCustomMetrics(prev => [...prev.slice(-9), newMetric]); // Keep last 10

    switch (type) {
      case 'counter':
        metrics.incrementCounter(`react_counter_${label}`, value);
        break;
      case 'histogram':
        metrics.recordHistogram(`react_histogram_${label}`, value);
        break;
      case 'gauge':
        metrics.recordGauge(`react_gauge_${label}`, value);
        break;
    }
  }, [getMetricsCollector]);

  const incrementCounter = useCallback((label: string, value = 1, tags?: Record<string, string>) => {
    const metrics = getMetricsCollector();
    metrics.incrementCounter(`react_counter_${label}`, value, tags);
  }, [getMetricsCollector]);

  const recordHistogram = useCallback((label: string, value: number, tags?: Record<string, string>) => {
    const metrics = getMetricsCollector();
    metrics.recordHistogram(`react_histogram_${label}`, value, tags);
  }, [getMetricsCollector]);

  const recordGauge = useCallback((label: string, value: number, tags?: Record<string, string>) => {
    const metrics = getMetricsCollector();
    metrics.recordGauge(`react_gauge_${label}`, value, tags);
  }, [getMetricsCollector]);

  return {
    customMetrics,
    performanceMetrics,
    recordCustomMetric,
    incrementCounter,
    recordHistogram,
    recordGauge
  };
};

// Custom hook for async operations with monitoring
export const useAsyncOperation = (monitorHooks: ReturnType<typeof useFrontendMonitor>) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { startTracing, recordError, getMetricsCollector } = monitorHooks;

  const execute = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      metrics?: Record<string, string>;
    }
  ): Promise<T | null> => {
    if (loading) return null;

    const tracing = startTracing(operationName, {
      attributes: options?.metrics
    });

    if (!tracing) return null;

    setLoading(true);
    setError(null);

    try {
      const result = await operation();

      // Record success metrics
      const metrics = getMetricsCollector();
      metrics.incrementCounter(`${operationName}_total`, 1, {
        status: 'success',
        ...options?.metrics
      });

      tracing.endSpan();
      options?.onSuccess?.(result);

      return result;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Operation failed');
      setError(error.message);
      recordError(error);

      tracing.recordError(error);
      tracing.endSpan();

      // Record error metrics
      const metrics = getMetricsCollector();
      metrics.incrementCounter(`${operationName}_total`, 1, {
        status: 'error',
        error_type: error.message,
        ...options?.metrics
      });

      options?.onError?.(error);
      return null;

    } finally {
      setLoading(false);
    }
  }, [loading, startTracing, recordError, getMetricsCollector]);

  return {
    execute,
    loading,
    error,
    clearError: () => setError(null)
  };
};

// Main component
export const ReactHooksExample: React.FC = () => {
  const monitorConfig = {
    attributes: {
      component: 'ReactHooksExample',
      version: '1.0.0'
    }
  };

  const monitorHooks = useFrontendMonitor(monitorConfig);
  const userHooks = useUserManagement(monitorHooks);
  const metricsHooks = useMetrics(monitorHooks);
  const asyncOperation = useAsyncOperation(monitorHooks);

  const { isInitialized, error: monitorError, recordUserInteraction } = monitorHooks;
  const { user, status: userStatus, login, logout, updateProfile } = userHooks;
  const { customMetrics, performanceMetrics, incrementCounter, recordHistogram } = metricsHooks;

  const [newName, setNewName] = useState('');
  const [metricValue, setMetricValue] = useState(100);
  const [metricLabel, setMetricLabel] = useState('test');

  // Handle user interactions
  const handleInteraction = useCallback((action: string, element?: string) => {
    recordUserInteraction({
      type: 'click',
      element: element || 'button',
      target: action,
      timestamp: Date.now()
    });
  }, [recordUserInteraction]);

  // Test operations
  const handleSuccessOperation = () => {
    handleInteraction('success_operation');
    incrementCounter('successful_operations', 1, { framework: 'react' });
    recordHistogram('operation_duration', 250, { operation: 'test' });
  };

  const handleErrorOperation = async () => {
    handleInteraction('error_operation');

    await asyncOperation.execute('test_error', async () => {
      throw new Error('React Hooks test error');
    });
  };

  const handleAsyncOperation = async () => {
    handleInteraction('async_operation');

    await asyncOperation.execute('complex_async', async () => {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.3) {
            resolve('success');
          } else {
            reject(new Error('Random failure'));
          }
        }, 1500);
      });
      return { data: 'Operation completed' };
    }, {
      metrics: { framework: 'react', complexity: 'high' }
    });
  };

  const handleAddMetric = () => {
    handleInteraction('add_custom_metric');
    metricsHooks.recordCustomMetric('histogram', metricLabel, metricValue);
    setMetricValue(100);
    setMetricLabel('test');
  };

  const handleProfileUpdate = () => {
    handleInteraction('update_profile');
    if (newName) {
      updateProfile(newName);
      setNewName('');
    }
  };

  const formatMetricName = (key: string): string => {
    const names: Record<string, string> = {
      fcp: 'First Contentful Paint',
      lcp: 'Largest Contentful Paint',
      fid: 'First Input Delay',
      cls: 'Cumulative Layout Shift',
      ttfb: 'Time to First Byte',
      domContentLoaded: 'DOM Content Loaded',
      loadComplete: 'Load Complete'
    };
    return names[key] || key;
  };

  const formatMetricValue = (key: string, value: number): string => {
    if (key === 'cls') {
      return value.toFixed(3);
    }
    return `${Math.round(value)}ms`;
  };

  if (!isInitialized) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          display: 'inline-block',
          padding: '20px',
          borderRadius: '8px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#0369a1' }}>
            Initializing Frontend Monitor SDK...
          </h3>
          {monitorError && (
            <p style={{ color: '#dc2626', margin: '0' }}>
              Error: {monitorError}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#2c3e50',
          color: 'white',
          padding: '30px',
          textAlign: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: '2rem' }}>
            React Hooks + Frontend Monitor SDK
          </h1>
          <p style={{ margin: '10px 0 0 0', opacity: 0.9 }}>
            Modern React with comprehensive monitoring integration
          </p>
        </div>

        {/* User Section */}
        <div style={{ padding: '30px' }}>
          {user ? (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: '0 0 15px 0', color: '#166534' }}>
                Welcome, {user.name}!
              </h2>
              <p style={{ margin: '5px 0', color: '#374151' }}>
                Email: {user.email}
              </p>
              <p style={{ margin: '5px 0', color: '#374151' }}>
                User ID: {user.id}
              </p>

              <div style={{ marginTop: '20px' }}>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New name"
                  style={{
                    padding: '10px',
                    marginRight: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={handleProfileUpdate}
                  disabled={!newName || userStatus === 'loading'}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    opacity: (!newName || userStatus === 'loading') ? 0.6 : 1,
                    marginRight: '10px'
                  }}
                >
                  {userStatus === 'loading' ? 'Updating...' : 'Update'}
                </button>
                <button
                  onClick={logout}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Logout
                </button>
              </div>

              {userStatus === 'error' && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#dc2626'
                }}>
                  Profile update failed
                </div>
              )}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              marginBottom: '20px',
              padding: '40px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px'
            }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#374151' }}>
                Please log in to continue
              </h3>
              <button
                onClick={login}
                disabled={userStatus === 'loading'}
                style={{
                  padding: '12px 30px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  opacity: userStatus === 'loading' ? 0.6 : 1
                }}
              >
                {userStatus === 'loading' ? 'Logging in...' : 'Login'}
              </button>

              {userStatus === 'error' && (
                <div style={{
                  marginTop: '15px',
                  padding: '10px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#dc2626'
                }}>
                  Login failed
                </div>
              )}
            </div>
          )}

          {/* Test Actions */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>
              Test Actions
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px'
            }}>
              <button
                onClick={handleSuccessOperation}
                style={{
                  padding: '12px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Success Operation
              </button>
              <button
                onClick={handleErrorOperation}
                style={{
                  padding: '12px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Trigger Error
              </button>
              <button
                onClick={handleAsyncOperation}
                disabled={asyncOperation.loading}
                style={{
                  padding: '12px',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  opacity: asyncOperation.loading ? 0.6 : 1
                }}
              >
                {asyncOperation.loading ? 'Processing...' : 'Async Operation'}
              </button>
              <button
                onClick={handleAddMetric}
                style={{
                  padding: '12px',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Add Metric
              </button>
            </div>

            {asyncOperation.error && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626'
              }}>
                Error: {asyncOperation.error}
              </div>
            )}
          </div>

          {/* Custom Metrics */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>
              Custom Metrics
            </h3>
            <div style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '15px',
              flexWrap: 'wrap'
            }}>
              <input
                type="number"
                value={metricValue}
                onChange={(e) => setMetricValue(Number(e.target.value))}
                style={{
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  width: '100px'
                }}
              />
              <input
                type="text"
                value={metricLabel}
                onChange={(e) => setMetricLabel(e.target.value)}
                placeholder="Label"
                style={{
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  width: '150px'
                }}
              />
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              padding: '15px',
              borderRadius: '6px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {customMetrics.length === 0 ? (
                <p style={{ margin: 0, color: '#6b7280' }}>
                  No custom metrics recorded yet
                </p>
              ) : (
                customMetrics.map(metric => (
                  <div
                    key={metric.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid #e5e7eb'
                    }}
                  >
                    <span>
                      {metric.label} ({metric.type}): {metric.value}
                    </span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {new Date(metric.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>
              Performance Metrics
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px'
            }}>
              {Object.entries(performanceMetrics).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{
                    fontSize: '12px',
                    color: '#0369a1',
                    marginBottom: '5px'
                  }}>
                    {formatMetricName(key)}
                  </div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#0c4a6e'
                  }}>
                    {formatMetricValue(key, value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info Section */}
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#166534' }}>
              Monitor Information
            </h3>
            <p style={{ margin: '5px 0', color: '#374151' }}>
              ✅ Open browser developer tools to see monitoring data
            </p>
            <p style={{ margin: '5px 0', color: '#374151' }}>
              ✅ Check your collector endpoint for traces and metrics
            </p>
            <p style={{ margin: '5px 0', color: '#374151' }}>
              ✅ All user interactions are automatically tracked
            </p>
            <p style={{ margin: '5px 0', color: '#374151' }}>
              ✅ Custom hooks provide clean separation of concerns
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReactHooksExample;