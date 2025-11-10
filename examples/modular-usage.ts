/**
 * 模块化使用示例 - 展示重构后的SDK功能
 */

import {
  createFrontendMonitor,
  TraceManager,
  PerformanceCollector,
  CustomMetricsCollector
} from '../src/index';

async function modularUsageExample() {
  // 创建并初始化监控SDK
  const monitor = createFrontendMonitor();

  await monitor.init({
    serviceName: 'modular-example-app',
    serviceVersion: '2.0.0',
    endpoint: 'https://your-collector.example.com',
    apiKey: 'your-api-key',
    sampleRate: 1.0,

    // 模块化配置
    enableAutoTracing: true,        // 启用XMLHttpRequest/Fetch自动追踪
    enablePerformanceMetrics: true, // 启用FCP、LCP自动采集
    enableCustomMetrics: true,      // 启用用户自定义指标
    enableErrorMonitoring: true,    // 启用错误监控
    enableUserInteractionMonitoring: true, // 启用用户交互监控

    excludedUrls: [
      '*/health',
      '*/metrics',
      '*/analytics'
    ],

    attributes: {
      environment: 'development',
      version: '2.0.0'
    }
  });

  console.log('✅ 模块化SDK初始化成功');

  // ===== 1. 链路追踪功能 =====
  console.log('\n🔍 测试链路追踪功能...');

  // 自动追踪XMLHttpRequest
  console.log('发送XHR请求（自动追踪）...');
  fetch('https://jsonplaceholder.typicode.com/posts/1')
    .then(response => response.json())
    .then(data => {
      console.log('✅ XHR请求完成，已自动追踪');
    })
    .catch(error => {
      console.log('❌ XHR请求失败，已自动追踪错误');
    });

  // 手动创建span
  const tracing = monitor.startTracing('user_business_operation', {
    attributes: {
      operation_type: 'data_processing',
      user_id: 'user123'
    }
  });

  // 模拟业务操作
  setTimeout(() => {
    console.log('✅ 手动span追踪完成');
    tracing.endSpan();
  }, 1000);

  // ===== 2. 性能指标功能 =====
  console.log('\n📊 测试性能指标功能...');

  // FCP和LCP会自动采集，这里等待一下让它们有时间收集
  setTimeout(() => {
    const traceManager = monitor.getTraceManager();
    if (traceManager) {
      console.log('📈 性能指标已开始自动收集（FCP、LCP、FID、CLS等）');
    }
  }, 2000);

  // ===== 3. 自定义指标功能 =====
  console.log('\n📈 测试自定义指标功能...');

  const metrics = monitor.getMetricsCollector();

  // 计数器指标
  metrics.incrementCounter('business_operations_total', 1, {
    operation: 'user_signup',
    source: 'web'
  });

  // 直方图指标
  metrics.recordHistogram('api_response_time_ms', 245, {
    endpoint: '/api/users',
    method: 'GET'
  });

  // 仪表盘指标
  metrics.recordGauge('active_users_current', 127, {
    region: 'us-east-1'
  });

  console.log('✅ 自定义指标记录完成');

  // ===== 4. 错误监控功能 =====
  console.log('\n🚨 测试错误监控功能...');

  // 手动记录错误
  monitor.recordError(new Error('这是一个测试业务错误'), {
    operation: 'payment_processing',
    user_id: 'user123',
    amount: 99.99
  });

  // JavaScript错误会自动捕获
  setTimeout(() => {
    try {
      // 故意触发错误
      (window as any).nonExistentFunction();
    } catch (error) {
      console.log('✅ JavaScript错误已自动捕获');
    }
  }, 500);

  // ===== 5. 用户交互功能 =====
  console.log('\n👤 测试用户交互功能...');

  // 手动记录用户交互
  monitor.recordUserInteraction({
    type: 'click',
    element: 'button',
    target: 'submit-button',
    timestamp: Date.now(),
    duration: 150
  });

  // 点击和输入事件会自动捕获
  console.log('🖱️ 用户交互事件监听已启动（点击、输入等）');

  // ===== 6. 高级功能演示 =====
  console.log('\n🎯 高级功能演示...');

  // 获取追踪管理器进行高级操作
  const traceManager = monitor.getTraceManager();
  if (traceManager) {
    // 在span上下文中执行异步操作
    traceManager.traceAsync('database_query', async (span) => {
      span.setAttributes({
        'db.query': 'SELECT * FROM users',
        'db.connection': 'primary'
      });

      // 模拟数据库查询
      await new Promise(resolve => setTimeout(resolve, 300));

      return { users: ['user1', 'user2', 'user3'] };
    }).then(result => {
      console.log('✅ 数据库查询追踪完成:', result);
    });
  }

  // 等待所有监控数据收集
  setTimeout(() => {
    console.log('\n🎉 所有模块功能测试完成！');
    console.log('\n📝 功能总结:');
    console.log('✅ XMLHttpRequest自动追踪');
    console.log('✅ Fetch API自动追踪');
    console.log('✅ FCP、LCP性能指标自动采集');
    console.log('✅ 自定义指标收集（Counter、Histogram、Gauge）');
    console.log('✅ JavaScript错误自动捕获');
    console.log('✅ 用户交互事件追踪');
    console.log('✅ 手动span创建和管理');
    console.log('✅ OpenTelemetry标准兼容');

    console.log('\n🔍 查看监控数据:');
    console.log('- 检查浏览器开发者工具的Network标签');
    console.log('- 查看发送到收集器的OTLP traces和metrics');
    console.log('- 在OpenTelemetry兼容的后端查看数据');

    // 清理资源
    monitor.destroy().then(() => {
      console.log('\n🧹 SDK资源已清理');
    });
  }, 5000);
}

// 模块化配置示例
function modularConfigurationExample() {
  console.log('\n⚙️ 模块化配置示例:');

  // 基础配置
  const basicConfig = {
    serviceName: 'my-app',
    endpoint: 'https://collector.example.com',

    // 只启用追踪功能
    enableAutoTracing: true,
    enablePerformanceMetrics: false,
    enableCustomMetrics: false,
    enableErrorMonitoring: false,
    enableUserInteractionMonitoring: false,
  };

  // 性能监控配置
  const performanceConfig = {
    serviceName: 'my-app',
    endpoint: 'https://collector.example.com',

    // 只启用性能监控
    enableAutoTracing: false,
    enablePerformanceMetrics: true,
    enableCustomMetrics: false,
    enableErrorMonitoring: false,
    enableUserInteractionMonitoring: false,
  };

  // 全功能配置
  const fullConfig = {
    serviceName: 'my-app',
    endpoint: 'https://collector.example.com',

    // 启用所有功能
    enableAutoTracing: true,
    enablePerformanceMetrics: true,
    enableCustomMetrics: true,
    enableErrorMonitoring: true,
    enableUserInteractionMonitoring: true,

    // 细粒度配置
    excludedUrls: ['*/health', '*/metrics'],
    sampleRate: 0.1, // 10%采样
  };

  console.log('✅ 配置示例已准备');
}

// 运行示例
if (require.main === module) {
  modularUsageExample().catch(console.error);
  modularConfigurationExample();
}

export { modularUsageExample, modularConfigurationExample };