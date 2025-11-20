#!/usr/bin/env node

/**
 * 快速测试脚本
 *
 * 用于快速测试npm包的基本功能，无需完整的示例项目
 */

const { createFrontendMonitor } = require('../dist/index.js');

// 测试配置
const testConfig = {
  serviceName: 'quick-test-app',
  endpoint: 'http://localhost:8080/collect',
  enablePerformanceMonitoring: true,
  enableErrorMonitoring: true,
  enableUserInteractionMonitoring: true
};

// 模拟浏览器环境
global.window = {
  location: {
    href: 'http://localhost:3000'
  },
  performance: {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    getEntriesByType: () => [],
    navigation: {
      fetchStart: Date.now(),
      domContentLoadedEventEnd: Date.now() + 1000,
      loadEventEnd: Date.now() + 1500
    }
  },
  navigator: {
    userAgent: 'Quick Test Browser'
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {}
};

global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  createElement: () => ({
    addEventListener: () => {},
    removeEventListener: () => {},
    appendChild: () => {}
  })
};

// 模拟XMLHttpRequest
global.XMLHttpRequest = class {
  open() {}
  send() {}
  setRequestHeader() {}
  addEventListener() {}
  getResponseHeader() { return null; }
};

// 模拟fetch
global.fetch = async (url, options) => {
  console.log('📤 发送数据到:', url);
  if (options && options.body) {
    const data = JSON.parse(options.body);
    console.log('📊 数据内容:', JSON.stringify(data, null, 2));
  }

  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true })
  };
};

async function runQuickTest() {
  console.log('🚀 开始快速测试前端监控SDK...\n');

  try {
    // 1. 创建监控实例
    console.log('1️⃣ 创建监控实例...');
    const monitor = createFrontendMonitor();
    console.log('✅ 监控实例创建成功');

    // 2. 初始化SDK
    console.log('\n2️⃣ 初始化SDK...');
    await monitor.init(testConfig);
    console.log('✅ SDK初始化成功');

    // 3. 测试错误监控
    console.log('\n3️⃣ 测试错误监控...');
    monitor.recordError(new Error('这是一个测试错误'), {
      component: 'TestComponent',
      action: 'quickTest'
    });
    console.log('✅ 错误记录成功');

    // 4. 测试用户交互监控
    console.log('\n4️⃣ 测试用户交互监控...');
    monitor.recordUserInteraction({
      type: 'click',
      element: 'button',
      target: 'test-button',
      timestamp: Date.now()
    });
    console.log('✅ 用户交互记录成功');

    // 5. 测试自定义指标
    console.log('\n5️⃣ 测试自定义指标...');
    const metrics = monitor.getMetricsCollector();
    metrics.incrementCounter('test_counter', 1, { test: 'quick' });
    metrics.recordHistogram('test_histogram', 150, { test: 'quick' });
    metrics.recordGauge('test_gauge', 42, { test: 'quick' });
    console.log('✅ 自定义指标记录成功');

    // 6. 测试分布式追踪
    console.log('\n6️⃣ 测试分布式追踪...');
    const tracer = monitor.startTracing('test_operation', {
      attributes: { test: 'quick' }
    });
    tracer.endSpan();
    console.log('✅ 分布式追踪测试成功');

  
    // 7. 清理资源
    console.log('\n7️⃣ 清理资源...');
    await monitor.destroy();
    console.log('✅ 资源清理完成');

    console.log('\n🎉 所有测试通过！前端监控SDK工作正常 ✅');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
runQuickTest().catch(error => {
  console.error('❌ 快速测试失败:', error);
  process.exit(1);
});