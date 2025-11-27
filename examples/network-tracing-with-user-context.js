/**
 * 网络请求链路追踪中的用户信息注入演示
 *
 * 演示用户信息如何自动注入到所有的网络请求链路中
 */

// 假设已经安装了前端监控SDK
// import { FrontendMonitorSDK } from 'frontend-monitor-sdk';

const monitorSDK = new FrontendMonitorSDK();

// 初始化SDK
async function initializeSDK() {
  await monitorSDK.init({
    serviceName: 'web-app-with-user-tracking',
    serviceVersion: '1.0.0',
    endpoint: 'http://localhost:4318',
    sampleRate: 1.0,
    enableAutoTracing: true,
    enableErrorMonitoring: true,
  });

  console.log('SDK initialized with network tracing');
}

// 设置用户信息
function setupUser() {
  monitorSDK.setUser({
    id: 'user_12345',
    name: 'John Doe',
    email: 'john@example.com',
    plan: 'premium',
    role: 'developer'
  });

  console.log('User context set:', monitorSDK.getCurrentUser());
}

// 演示不同类型的网络请求都会包含用户信息
async function demonstrateNetworkTracing() {
  console.log('\n=== 网络请求链路追踪演示 ===\n');

  // 1. Fetch API 请求
  console.log('1. Fetch API 请求...');
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/users/1', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    const data = await response.json();
    console.log('Fetch response:', data.name);
  } catch (error) {
    console.log('Fetch error:', error.message);
  }

  // 2. XMLHttpRequest 请求
  console.log('2. XMLHttpRequest 请求...');
  const xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://jsonplaceholder.typicode.com/posts', true);
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      const response = JSON.parse(xhr.responseText);
      console.log('XHR response:', response.id);
    } else {
      console.log('XHR error:', xhr.statusText);
    }
  };

  xhr.onerror = function() {
    console.log('XHR network error');
  };

  xhr.send(JSON.stringify({
    title: 'Test Post',
    body: 'This is a test post',
    userId: 1
  }));

  // 3. API 调用追踪
  console.log('3. 手动API调用追踪...');
  const tracer = monitorSDK.startTracing('api_call_user_profile', {
    attributes: {
      'api.endpoint': '/api/user/profile',
      'api.method': 'GET',
      'custom.tag': 'user_data_request'
    }
  });

  // 模拟API调用
  setTimeout(() => {
    try {
      // 模拟成功响应
      tracer.endSpan();
      console.log('API call completed successfully');
    } catch (error) {
      tracer.recordError(error);
      tracer.endSpan();
      console.log('API call failed:', error.message);
    }
  }, 200);

  // 4. 第三方库的请求（如axios等库内部使用fetch/XHR）
  console.log('4. 第三方库请求（会被自动追踪）...');
  setTimeout(() => {
    // 模拟使用axios或fetch的第三方库调用
    fetch('https://jsonplaceholder.typicode.com/comments?postId=1')
      .then(response => response.json())
      .then(comments => {
        console.log('Third-party request completed:', comments.length, 'comments');
      })
      .catch(error => {
        console.log('Third-party request error:', error.message);
      });
  }, 400);
}

// 演示错误请求中的用户信息
function demonstrateErrorTracing() {
  console.log('\n=== 错误请求演示 ===\n');

  // 故意发送一个会失败的请求
  fetch('https://non-existent-domain-12345.com/api/data', {
    method: 'GET',
    timeout: 5000
  }).catch(error => {
    console.log('Network error captured with user context');
  });

  // 请求一个404页面
  fetch('https://jsonplaceholder.typicode.com/nonexistent/999')
    .then(response => {
      if (!response.ok) {
        console.log('HTTP error captured with user context:', response.status);
      }
    })
    .catch(error => {
      console.log('Request failed:', error.message);
    });
}

// 演示用户信息更新对后续请求的影响
function demonstrateUserUpdate() {
  console.log('\n=== 用户信息更新演示 ===\n');

  console.log('5. 更新用户信息...');
  monitorSDK.updateUser({
    plan: 'enterprise',
    lastLogin: new Date().toISOString(),
    sessionToken: 'abc123xyz'
  });

  // 更新后的用户信息会自动应用到后续请求
  setTimeout(() => {
    console.log('6. 用户信息更新后的请求...');
    fetch('https://jsonplaceholder.typicode.com/todos/1')
      .then(response => response.json())
      .then(todo => {
        console.log('Request with updated user context:', todo.title);
      });
  }, 600);
}

// 演示清除用户信息后的请求
function demonstrateUserClear() {
  console.log('\n=== 清除用户信息演示 ===\n');

  setTimeout(() => {
    console.log('7. 清除用户信息...');
    monitorSDK.clearUser();

    // 清除后的请求不会包含用户信息
    setTimeout(() => {
      console.log('8. 清除用户信息后的请求...');
      fetch('https://jsonplaceholder.typicode.com/albums/1')
        .then(response => response.json())
        .then(album => {
          console.log('Request without user context:', album.title);
        });
    }, 200);
  }, 800);
}

// 完整演示流程
async function completeNetworkTracingDemo() {
  console.log('=== 网络请求链路追踪与用户信息注入演示 ===\n');

  // 初始化SDK和用户上下文
  await initializeSDK();
  setupUser();

  // 演示网络请求
  demonstrateNetworkTracing();
  demonstrateErrorTracing();
  demonstrateUserUpdate();
  demonstrateUserClear();

  console.log('\n=== 演示完成 ===');
  console.log('注意：检查浏览器开发者工具的Network标签，');
  console.log('可以看到所有网络请求的追踪数据中都包含了用户信息！');

  console.log('\n预期的追踪数据格式：');
  console.log({
    attributes: {
      "user.id": "user_12345",
      "user.name": "John Doe",
      "user.email": "john@example.com",
      "user.plan": "premium", // 后续会更新为 "enterprise"
      "user.role": "developer",
      "http.method": "GET",
      "http.url": "https://jsonplaceholder.typicode.com/users/1",
      "http.status_code": 200,
      "http.duration_ms": 245
    }
  });
}

// 运行演示
completeNetworkTracingDemo().catch(console.error);

/*
演示输出说明：

1. 设置用户信息后，所有后续的网络请求（fetch、XMLHttpRequest、第三方库）
   都会自动包含用户属性：
   - user.id: "user_12345"
   - user.name: "John Doe"
   - user.email: "john@example.com"
   - user.plan: "premium" (后续更新为 "enterprise")
   - user.role: "developer"

2. 网络请求类型包括：
   - Fetch API 调用
   - XMLHttpRequest 调用
   - 第三方库的网络请求（如axios等）
   - 手动创建的追踪span

3. 错误请求也会包含用户信息：
   - 网络连接错误
   - HTTP 4xx/5xx 错误
   - 请求超时等

4. 用户信息更新会实时影响后续请求：
   - updateUser() 调用后，新的请求会包含更新后的用户属性

5. 清除用户信息后，后续请求不再包含用户属性

这样的实现确保了无论通过什么方式发起网络请求，
用户信息都会自动且一致地出现在所有的链路追踪数据中！
*/