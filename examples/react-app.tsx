/**
 * React 应用集成示例
 */

import React, { useEffect, useState } from 'react';
import { createFrontendMonitor } from '../src/index';

const monitor = createFrontendMonitor();

interface UserData {
  id: string;
  name: string;
  email: string;
}

export const ReactAppExample: React.FC = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 初始化监控SDK
    monitor.init({
      serviceName: 'react-example-app',
      serviceVersion: '1.0.0',
      endpoint: 'https://your-collector.example.com',
      apiKey: 'your-api-key',
      sampleRate: 1.0,
      attributes: {
        framework: 'react',
        environment: process.env.NODE_ENV || 'development',
      },
    }).then(() => {
      console.log('Monitor initialized in React app');
    });

    // 清理函数
    return () => {
      monitor.destroy();
    };
  }, []);

  const handleLogin = async () => {
    const tracing = monitor.startTracing('user_login', {
      attributes: {
        login_method: 'email',
      },
    });

    setLoading(true);
    setError(null);

    try {
      // 模拟登录API调用
      const response = await simulateLoginAPI();
      setUser(response);

      // 记录成功指标
      const metrics = monitor.getMetricsCollector();
      metrics.incrementCounter('user_logins_total', 1, {
        status: 'success',
        login_method: 'email',
      });

      tracing.endSpan();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);

      // 记录错误
      tracing.recordError(err instanceof Error ? err : new Error(errorMessage));
      tracing.endSpan();

      // 记录失败指标
      const metrics = monitor.getMetricsCollector();
      metrics.incrementCounter('user_logins_total', 1, {
        status: 'error',
        error_type: errorMessage,
        login_method: 'email',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    const tracing = monitor.startTracing('user_logout');

    setUser(null);

    // 记录登出指标
    const metrics = monitor.getMetricsCollector();
    metrics.incrementCounter('user_logouts_total', 1, {
      user_id: user?.id || 'unknown',
    });

    tracing.endSpan();
  };

  const handleProfileUpdate = async (newName: string) => {
    if (!user) return;

    const tracing = monitor.startTracing('profile_update', {
      attributes: {
        user_id: user.id,
        update_field: 'name',
      },
    });

    try {
      // 模拟更新API调用
      await simulateProfileUpdateAPI(user.id, newName);
      setUser({ ...user, name: newName });

      // 记录成功指标
      const metrics = monitor.getMetricsCollector();
      metrics.incrementCounter('profile_updates_total', 1, {
        status: 'success',
        field: 'name',
      });

      tracing.endSpan();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Update failed';

      tracing.recordError(err instanceof Error ? err : new Error(errorMessage));
      tracing.endSpan();

      // 记录失败指标
      const metrics = monitor.getMetricsCollector();
      metrics.incrementCounter('profile_updates_total', 1, {
        status: 'error',
        field: 'name',
        error_type: errorMessage,
      });
    }
  };

  const handleUserInteraction = (action: string) => {
    monitor.recordUserInteraction({
      type: 'click',
      element: 'button',
      target: action,
      timestamp: Date.now(),
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>React Monitor SDK Example</h1>

      {error && (
        <div style={{
          color: 'red',
          border: '1px solid red',
          padding: '10px',
          marginBottom: '20px'
        }}>
          Error: {error}
        </div>
      )}

      {user ? (
        <div>
          <h2>Welcome, {user.name}!</h2>
          <p>Email: {user.email}</p>

          <div style={{ marginTop: '20px' }}>
            <button
              onClick={() => handleUserInteraction('profile_update')}
              style={{ marginRight: '10px', padding: '8px 16px' }}
            >
              Update Profile
            </button>
            <button
              onClick={() => {
                handleUserInteraction('logout');
                handleLogout();
              }}
              style={{ padding: '8px 16px', backgroundColor: '#f44336', color: 'white' }}
            >
              Logout
            </button>
          </div>

          <div style={{ marginTop: '20px' }}>
            <input
              type="text"
              placeholder="New name"
              onChange={(e) => {
                monitor.recordUserInteraction({
                  type: 'input',
                  element: 'input',
                  target: 'new-name',
                  timestamp: Date.now(),
                  value: e.target.value ? 'has_value' : 'empty',
                });
              }}
              style={{ marginRight: '10px', padding: '8px' }}
            />
            <button
              onClick={() => {
                const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (input.value) {
                  handleUserInteraction('save_profile');
                  handleProfileUpdate(input.value);
                }
              }}
              style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white' }}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p>Please log in to continue</p>
          <button
            onClick={() => {
              handleUserInteraction('login');
              handleLogin();
            }}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: loading ? '#ccc' : '#2196F3',
              color: 'white',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f5f5f5' }}>
        <h3>Monitor Information</h3>
        <p>Open browser developer tools to see monitoring data</p>
        <p>Check your collector endpoint for traces and metrics</p>
      </div>
    </div>
  );
};

// 模拟API函数
async function simulateLoginAPI(): Promise<UserData> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.2) { // 80% 成功率
        resolve({
          id: 'user_' + Math.random().toString(36).substr(2, 9),
          name: 'John Doe',
          email: 'john.doe@example.com',
        });
      } else {
        reject(new Error('Invalid credentials'));
      }
    }, 1000);
  });
}

async function simulateProfileUpdateAPI(userId: string, newName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (newName.length < 2) {
        reject(new Error('Name too short'));
      } else {
        resolve();
      }
    }, 500);
  });
}

export default ReactAppExample;