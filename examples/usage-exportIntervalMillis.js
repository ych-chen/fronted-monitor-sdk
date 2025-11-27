/**
 * exportIntervalMillis 参数使用示例
 *
 * 展示如何配置监控SDK的指标导出间隔，以平衡性能需求和成本
 */

// 假设已经安装了前端监控SDK
// import { FrontendMonitorSDK } from 'frontend-monitor-sdk';

const monitorSDK = new FrontendMonitorSDK();

// 示例1: 基础配置（默认30秒）
async function basicConfig() {
  await monitorSDK.init({
    serviceName: 'my-web-app',
    endpoint: 'http://localhost:4318',
    sampleRate: 1.0,
    // 使用默认配置，exportIntervalMillis 会是 30000ms（30秒）
  });

  console.log('=== 基础配置示例 ===');
  console.log('exportIntervalMillis:', 30000, '(30秒)');
  console.log('适用于：大多数Web应用的基础监控');
}

// 示例2: 高频监控（15秒）- 适合性能指标密集的应用
async function performanceConfig() {
  await monitorSDK.init({
    serviceName: 'performance-app',
    endpoint: 'http://localhost:4318',
    sampleRate: 1.0,
    exportIntervalMillis: 15000, // 15秒，适合高频性能监控
    enablePerformanceMetrics: true,
    enableCustomMetrics: true,
  });

  console.log('\n=== 高频监控配置示例 ===');
  console.log('exportIntervalMillis:', 15000, '(15秒)');
  console.log('适用于：性能指标密集的应用（如实时性能Dashboard）');
}

// 示例3: 业务监控（60秒）- 适合用户行为分析
async function businessConfig() {
  await monitorSDK.init({
    serviceName: 'business-app',
    endpoint: 'http://localhost:4318',
    sampleRate: 0.5, // 降低采样率，因为业务监控通常会产生大量数据
    exportIntervalMillis: 60000, // 60秒，适合用户行为追踪和分析
    enableCustomMetrics: true,
    enableUserInteractionMonitoring: true,
  });

  console.log('\n=== 业务监控配置示例 ===');
  console.log('exportIntervalMillis:', 60000, '(60秒)');
  console.log('适用于：用户行为分析、A/B测试、业务指标统计');
}

// 示例4: 低频监控（5分钟）- 适合后台管理或低流量应用
async function lowFrequencyConfig() {
  await monitorSDK.init({
    serviceName: 'admin-app',
    endpoint: 'http://localhost:4318',
    sampleRate: 0.1, // 进一步降低采样率
    exportIntervalMillis: 300000, // 5分钟，减少服务器负载
    enableErrorMonitoring: true,
    enableCustomMetrics: false,
  });

  console.log('\n=== 低频监控配置示例 ===');
  console.log('exportIntervalMillis:', 300000, '(5分钟)');
  console.log('适用于：后台管理应用、低流量环境或成本敏感的场景');
}

// 完整的使用流程演示
async function completeExample() {
  console.log('\n=== 完整配置演示 ===');

  await basicConfig();
  await new Promise(resolve => setTimeout(resolve, 1000));
  await performanceConfig();
  await businessConfig();
  await lowFrequencyConfig();

  console.log('\n=== 配置对比 ===');
  console.log('1. 基础应用: 30秒间隔');
  console.log('2. 性能监控: 15秒间隔');
  console.log('3. 业务监控: 60秒间隔');
  console.log('4. 低频监控: 5分钟间隔');
}

// 运行演示
completeExample().catch(console.error);