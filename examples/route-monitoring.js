/**
 * 路由监控使用示例
 *
 * 此示例展示了如何在前端监控SDK中使用路由监控功能
 */

import { createFrontendMonitor } from '@your-org/frontend-monitor-sdk';

// 1. 创建SDK实例
const monitor = createFrontendMonitor();

/**
 * 示例1: 基础路由监控配置
 */
async function basicRouteMonitoring() {
  console.log('🚀 启用基础路由监控...');

  await monitor.init({
    serviceName: 'my-web-app',
    endpoint: 'https://your-collector.example.com',

    // 启用路由监控
    enableRouteMonitoring: true,

    // 其他监控选项
    enablePerformanceMonitoring: true,
    enableErrorMonitoring: true,
    enableUserInteractionMonitoring: true,
  });

  console.log('✅ 基础路由监控已启用');
}

/**
 * 示例2: 高级路由监控配置
 */
async function advancedRouteMonitoring() {
  console.log('🚀 启用高级路由监控...');

  await monitor.init({
    serviceName: 'advanced-web-app',
    endpoint: 'https://your-collector.example.com',

    enableRouteMonitoring: true,

    // 详细的路由监控配置
    routeMonitoringConfig: {
      enabled: true,
      hashRouting: true,        // 监控Hash路由
      historyAPI: true,         // 监控History API
      popstate: true,           // 监控浏览器前进/后退
      parseParams: true,        // 解析路由参数
      parseQuery: true,         // 解析查询参数

      // 忽略某些路径（例如：内部工具页面）
      ignoredPaths: [
        '/admin/*',
        '/internal/*',
        '/health-check'
      ],

      // 自定义路由匹配器（适用于特定框架）
      customRouteMatcher: (path) => {
        // 例如：对于React Router的路径参数解析
        const userMatch = path.match(/^\/users\/([^\/]+)$/);
        if (userMatch) {
          return {
            params: { userId: userMatch[1] },
            query: {}
          };
        }

        // 例如：对于带分页的列表页面
        const listMatch = path.match(/^\/products\?page=(\d+)&category=(.+)$/);
        if (listMatch) {
          return {
            params: {},
            query: { page: listMatch[1], category: listMatch[2] }
          };
        }

        return { params: {}, query: {} };
      }
    }
  });

  console.log('✅ 高级路由监控已启用');
}

/**
 * 示例3: React Router集成示例
 */
class ReactRouteMonitor {
  constructor(monitor) {
    this.monitor = monitor;
    this.setupReactRouterMonitoring();
  }

  setupReactRouterMonitoring() {
    // 监听React Router的导航事件
    // 这需要在React应用的路由配置中设置

    if (window.__REACT_ROUTER_LISTENER__) {
      window.__REACT_ROUTER_LISTENER__.onRouteChange((location, action) => {
        // 手动记录路由变化
        this.monitor.recordRouteChange({
          type: action === 'PUSH' ? 'pushstate' : 'replacestate',
          from: this.previousLocation?.pathname || '',
          to: location.pathname,
          timestamp: Date.now(),
          isSPA: true,
          params: this.extractRouteParams(location.pathname),
          query: this.extractQueryParams(location.search),
          title: document.title
        });

        this.previousLocation = location;
      });
    }
  }

  extractRouteParams(pathname) {
    // React Router参数解析逻辑
    const params = {};

    // 示例：/users/:id
    const userMatch = pathname.match(/^\/users\/([^\/]+)$/);
    if (userMatch) {
      params.userId = userMatch[1];
    }

    // 示例：/products/:productId/reviews/:reviewId
    const reviewMatch = pathname.match(/^\/products\/([^\/]+)\/reviews\/([^\/]+)$/);
    if (reviewMatch) {
      params.productId = reviewMatch[1];
      params.reviewId = reviewMatch[2];
    }

    return params;
  }

  extractQueryParams(search) {
    const params = {};
    const urlParams = new URLSearchParams(search);

    for (const [key, value] of urlParams) {
      params[key] = value;
    }

    return params;
  }
}

/**
 * 示例4: Vue Router集成示例
 */
class VueRouteMonitor {
  constructor(monitor) {
    this.monitor = monitor;
  }

  setupVueRouterMonitoring(router) {
    // Vue Router全局前置守卫
    router.beforeEach((to, from, next) => {
      // 记录路由变化开始时间
      this.routeChangeStartTime = performance.now();
      next();
    });

    // Vue Router全局后置钩子
    router.afterEach((to, from) => {
      const duration = performance.now() - this.routeChangeStartTime;

      this.monitor.recordRouteChange({
        type: 'pushstate', // Vue Router使用History API
        from: from.fullPath,
        to: to.fullPath,
        timestamp: Date.now(),
        duration: Math.round(duration),
        isSPA: true,
        params: to.params,
        query: to.query,
        title: to.meta?.title || document.title
      });
    });
  }
}

/**
 * 示例5: 自定义路由事件处理
 */
function customRouteEventHandling() {
  // 获取当前路由信息
  const currentRoute = monitor.getCurrentRoute();
  console.log('📍 当前路由:', currentRoute);

  // 手动记录自定义路由变化
  monitor.recordRouteChange({
    type: 'pushstate',
    from: '/old-page',
    to: '/new-page?param=value',
    timestamp: Date.now(),
    duration: 150,
    isSPA: true,
    params: { id: '123' },
    query: { param: 'value', tab: 'overview' },
    title: '新页面'
  });
}

/**
 * 示例6: 路由性能分析和告警
 */
class RoutePerformanceAnalyzer {
  constructor(monitor) {
    this.monitor = monitor;
    this.routeMetrics = new Map();
    this.setupPerformanceMonitoring();
  }

  setupPerformanceMonitoring() {
    // 设置路由性能阈值
    this.performanceThresholds = {
      slowRouteThreshold: 1000, // 1秒
      verySlowRouteThreshold: 3000 // 3秒
    };

    // 监听路由变化并分析性能
    this.startRoutePerformanceMonitoring();
  }

  startRoutePerformanceMonitoring() {
    // 在实际应用中，这里应该通过SDK的事件系统监听路由变化
    // 以下是模拟实现
  }

  analyzeRoutePerformance(routeChangeEvent) {
    const { to, duration, type } = routeChangeEvent;

    // 记录路由性能数据
    if (!this.routeMetrics.has(to)) {
      this.routeMetrics.set(to, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        slowCount: 0
      });
    }

    const metrics = this.routeMetrics.get(to);
    metrics.count++;
    metrics.totalDuration += duration;
    metrics.avgDuration = Math.round(metrics.totalDuration / metrics.count);
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);
    metrics.minDuration = Math.min(metrics.minDuration, duration);

    // 检查慢路由
    if (duration > this.performanceThresholds.slowRouteThreshold) {
      metrics.slowCount++;

      if (duration > this.performanceThresholds.verySlowRouteThreshold) {
        console.warn(`🚨 非常慢的路由: ${to} (${duration}ms)`);
        this.alertSlowRoute(routeChangeEvent);
      }
    }

    console.log(`📊 路由性能统计 - ${to}:`, metrics);
  }

  alertSlowRoute(routeEvent) {
    // 记录慢路由错误
    this.monitor.recordError(
      new Error(`慢路由警告: ${routeEvent.to} 耗时 ${routeEvent.duration}ms`),
      {
        route: routeEvent.to,
        duration: routeEvent.duration,
        type: routeEvent.type,
        threshold: this.performanceThresholds.slowRouteThreshold
      }
    );
  }

  getPerformanceReport() {
    const report = {
      totalRoutes: this.routeMetrics.size,
      routes: Array.from(this.routeMetrics.entries()).map(([route, metrics]) => ({
        route,
        ...metrics
      }))
    };

    return report;
  }
}

/**
 * 示例7: 路由监控与业务分析
 */
function businessRouteAnalysis(monitor) {
  // 自定义路由匹配器用于业务分析
  const businessRouteMatcher = (path) => {
    const businessRoutes = {
      '/': { section: 'home', feature: 'landing' },
      '/login': { section: 'auth', feature: 'login' },
      '/register': { section: 'auth', feature: 'register' },
      '/dashboard': { section: 'main', feature: 'dashboard' },
      '/products': { section: 'ecommerce', feature: 'product-list' },
      '/cart': { section: 'ecommerce', feature: 'shopping-cart' },
      '/checkout': { section: 'ecommerce', feature: 'checkout' },
      '/profile': { section: 'user', feature: 'profile-management' }
    };

    // 检查精确匹配
    if (businessRoutes[path]) {
      return {
        params: businessRoutes[path],
        query: {}
      };
    }

    // 检查模式匹配
    for (const [pattern, metadata] of Object.entries(businessRoutes)) {
      if (path.startsWith(pattern.replace(/\*$/, ''))) {
        return {
          params: metadata,
          query: {}
        };
      }
    }

    return { params: { section: 'unknown', feature: 'unknown' }, query: {} };
  };

  // 重新初始化SDK以使用业务路由匹配器
  monitor.init({
    serviceName: 'business-analytics-app',
    endpoint: 'https://your-collector.example.com',
    enableRouteMonitoring: true,
    routeMonitoringConfig: {
      customRouteMatcher: businessRouteMatcher,
      parseParams: true,
      parseQuery: true
    }
  });
}

// 导出示例函数
export {
  basicRouteMonitoring,
  advancedRouteMonitoring,
  ReactRouteMonitor,
  VueRouteMonitor,
  customRouteEventHandling,
  RoutePerformanceAnalyzer,
  businessRouteAnalysis
};

// 使用示例
if (typeof window !== 'undefined') {
  // 在浏览器环境中运行示例
  console.log('🌐 浏览器环境 - 准备运行路由监控示例');

  // 可以选择性地运行不同的示例
  // basicRouteMonitoring();
  // advancedRouteMonitoring();
}