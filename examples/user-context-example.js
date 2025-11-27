/**
 * 用户信息注入功能使用示例
 *
 * 演示如何在前端监控SDK中设置和管理用户信息，
 * 以及用户信息如何自动添加到监控链路中
 */

// 假设已经安装了前端监控SDK
// import { FrontendMonitorSDK } from 'frontend-monitor-sdk';

const monitorSDK = new FrontendMonitorSDK();

// 初始化SDK
async function initializeSDK() {
  await monitorSDK.init({
    serviceName: 'my-web-app',
    serviceVersion: '1.0.0',
    endpoint: 'http://localhost:4318',
    sampleRate: 1.0,
    enableUserInteractionMonitoring: true,
    enableErrorMonitoring: true,
    enableRouteMonitoring: true,
  });

  console.log('SDK initialized successfully');
}

// 用户登录成功后设置用户信息
function handleUserLogin(userData) {
  // 设置用户信息
  monitorSDK.setUser({
    id: userData.id,
    name: userData.name,
    email: userData.email,
    plan: userData.plan || 'free',
    role: userData.role || 'user'
  });

  console.log('User context set:', monitorSDK.getCurrentUser());
}

// 用户信息更新时使用updateUser
function handleUserUpdate(updates) {
  // 更新用户信息（合并更新）
  monitorSDK.updateUser(updates);

  console.log('User context updated:', monitorSDK.getCurrentUser());
}

// 用户退出登录时清除用户信息
function handleUserLogout() {
  // 清除用户信息
  monitorSDK.clearUser();

  console.log('User context cleared:', monitorSDK.getCurrentUser()); // null
}

// 模拟用户操作
function simulateUserActions() {
  // 模拟用户点击事件
  monitorSDK.recordUserInteraction({
    type: 'click',
    element: 'button',
    target: 'submit-button',
    timestamp: Date.now(),
  });

  // 模拟API调用追踪
  const tracer = monitorSDK.startTracing('api_call', {
    attributes: {
      'api.url': '/api/user/profile',
      'api.method': 'GET'
    }
  });

  // 模拟一些操作...
  setTimeout(() => {
    tracer.endSpan();
  }, 100);

  // 模拟错误
  setTimeout(() => {
    try {
      throw new Error('Simulated error with user context');
    } catch (error) {
      monitorSDK.recordError(error, {
        component: 'UserProfile',
        action: 'loadProfile'
      });
    }
  }, 200);
}

// 完整的使用流程示例
async function completeWorkflow() {
  console.log('=== 用户信息注入功能演示 ===\n');

  // 1. 初始化SDK
  await initializeSDK();

  // 2. 模拟用户登录
  console.log('1. 用户登录...');
  handleUserLogin({
    id: 'user_12345',
    name: '张三',
    email: 'zhangsan@example.com',
    plan: 'premium',
    role: 'admin'
  });

  // 3. 模拟用户操作（这些操作会自动包含用户信息）
  console.log('2. 执行用户操作...');
  simulateUserActions();

  // 4. 模拟用户信息更新
  console.log('3. 更新用户信息...');
  setTimeout(() => {
    handleUserUpdate({
      plan: 'enterprise',
      lastLogin: new Date().toISOString()
    });
  }, 300);

  // 5. 模拟用户退出
  console.log('4. 用户退出...');
  setTimeout(() => {
    handleUserLogout();
  }, 600);

  // 6. 演示退出后的操作（不会包含用户信息）
  console.log('5. 退出后的操作...');
  setTimeout(() => {
    monitorSDK.recordUserInteraction({
      type: 'navigation',
      element: 'route',
      target: '/login',
      timestamp: Date.now(),
    });

    console.log('\n=== 演示完成 ===');
    console.log('注意：检查浏览器开发者工具的Network标签，');
    console.log('可以看到发送到监控后端的追踪数据中包含了用户信息！');
  }, 800);
}

// 运行演示
completeWorkflow().catch(console.error);

// 输出示例：
// === 用户信息注入功能演示 ===
//
// SDK initialized successfully
// 1. 用户登录...
// User context set: {
//   id: 'user_12345',
//   name: '张三',
//   email: 'zhangsan@example.com',
//   plan: 'premium',
//   role: 'admin'
// }
// 2. 执行用户操作...
// 3. 更新用户信息...
// User context updated: {
//   id: 'user_12345',
//   name: '张三',
//   email: 'zhangsan@example.com',
//   plan: 'enterprise',
//   role: 'admin',
//   lastLogin: '2024-01-15T08:30:00.000Z'
// }
// 4. 用户退出...
// User context cleared: null
// 5. 退出后的操作...
//
// === 演示完成 ===
// 注意：检查浏览器开发者工具的Network标签，
// 可以看到发送到监控后端的追踪数据中包含了用户信息！

/*
监控数据中的用户信息示例：

1. 用户交互事件：
{
  "attributes": {
    "user.id": "user_12345",
    "user.name": "张三",
    "user.email": "zhangsan@example.com",
    "user.plan": "premium",
    "user.role": "admin",
    "interaction.type": "click",
    "interaction.element": "button",
    "interaction.target": "submit-button"
  }
}

2. 错误事件：
{
  "attributes": {
    "user.id": "user_12345",
    "user.name": "张三",
    "user.email": "zhangsan@example.com",
    "user.plan": "premium",
    "user.role": "admin",
    "error_type": "Error",
    "error_message": "Simulated error with user context",
    "component": "UserProfile",
    "action": "loadProfile"
  }
}

3. API调用追踪：
{
  "attributes": {
    "user.id": "user_12345",
    "user.name": "张三",
    "user.email": "zhangsan@example.com",
    "user.plan": "premium",
    "user.role": "admin",
    "api.url": "/api/user/profile",
    "api.method": "GET"
  }
}

4. 用户退出后的操作：
{
  "attributes": {
    "interaction.type": "navigation",
    "interaction.element": "route",
    "interaction.target": "/login"
  }
}
*/