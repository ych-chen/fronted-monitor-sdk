import type { RouteChangeEvent, RouteMonitoringConfig } from '../types';

/**
 * 路由监控器
 *
 * 负责监控各种类型的路由变化，包括：
 * - Hash路由变化 (#/path)
 * - History API (pushState/replaceState)
 * - 浏览器导航 (popstate)
 * - 页面加载 (load)
 */
export class RouteMonitor {
  private config: RouteMonitoringConfig;
  private isEnabled = false;
  private currentPath: string = '';
  private routeChangeCallbacks: ((event: RouteChangeEvent) => void)[] = [];
  private routeChangeStartTime: number = 0;

  // 保存原始方法引用
  private originalPushState: typeof history.pushState;
  private originalReplaceState: typeof history.replaceState;

  constructor(config: RouteMonitoringConfig = {}) {
    this.config = {
      enabled: true,
      hashRouting: true,
      historyAPI: true,
      popstate: true,
      parseParams: true,
      parseQuery: true,
      ignoredPaths: [],
      ...config,
    };

    // 保存原始方法
    this.originalPushState = history.pushState.bind(history);
    this.originalReplaceState = history.replaceState.bind(history);

    // 初始化当前路径
    this.currentPath = this.getCurrentPath();
  }

  /**
   * 启用路由监控
   */
  enable(): void {
    if (this.isEnabled) return;

    this.isEnabled = true;
    this.setupEventListeners();
    this.patchHistoryAPI();

    console.log('Route monitoring enabled');
  }

  /**
   * 禁用路由监控
   */
  disable(): void {
    if (!this.isEnabled) return;

    this.isEnabled = false;
    this.removeEventListeners();
    this.restoreHistoryAPI();

    console.log('Route monitoring disabled');
  }

  /**
   * 添加路由变化回调
   */
  onRouteChange(callback: (event: RouteChangeEvent) => void): void {
    this.routeChangeCallbacks.push(callback);
  }

  /**
   * 移除路由变化回调
   */
  offRouteChange(callback: (event: RouteChangeEvent) => void): void {
    const index = this.routeChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.routeChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * 手动记录路由变化
   */
  recordRouteChange(event: RouteChangeEvent): void {
    if (!this.isEnabled) return;

    // 检查是否应该忽略此路径
    if (this.shouldIgnorePath(event.to)) {
      return;
    }

    // 补充事件信息
    const enrichedEvent = this.enrichRouteChangeEvent(event);

    // 通知所有回调
    this.routeChangeCallbacks.forEach(callback => {
      try {
        callback(enrichedEvent);
      } catch (error) {
        console.warn('Route change callback error:', error);
      }
    });

    // 更新当前路径
    this.currentPath = enrichedEvent.to;
  }

  /**
   * 获取当前路由信息
   */
  getCurrentRoute(): { path: string; query: Record<string, string>; params: Record<string, string> } {
    const path = this.getCurrentPath();
    const query = this.config.parseQuery ? this.parseQueryString(path) : {};
    const params = this.config.parseParams && this.config.customRouteMatcher
      ? this.config.customRouteMatcher(path).params || {}
      : {};

    return { path, query, params };
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // Hash路由监听
    if (this.config.hashRouting) {
      window.addEventListener('hashchange', this.handleHashChange.bind(this));
    }

    // 浏览器导航监听
    if (this.config.popstate) {
      window.addEventListener('popstate', this.handlePopState.bind(this));
    }

    // 页面加载监听
    window.addEventListener('load', this.handlePageLoad.bind(this));
  }

  /**
   * 移除事件监听器
   */
  private removeEventListeners(): void {
    window.removeEventListener('hashchange', this.handleHashChange.bind(this));
    window.removeEventListener('popstate', this.handlePopState.bind(this));
    window.removeEventListener('load', this.handlePageLoad.bind(this));
  }

  /**
   * 拦截History API
   */
  private patchHistoryAPI(): void {
    if (!this.config.historyAPI) return;

    const self = this;

    // 拦截 pushState
    history.pushState = function(state: any, title: string, url?: string | URL | null) {
      const fromPath = self.currentPath;
      const result = self.originalPushState(state, title, url);

      const toPath = self.getCurrentPath();

      if (fromPath !== toPath) {
        self.recordRouteChange({
          type: 'pushstate',
          from: fromPath,
          to: toPath,
          timestamp: Date.now(),
          state,
          isSPA: true,
        });
      }

      return result;
    };

    // 拦截 replaceState
    history.replaceState = function(state: any, title: string, url?: string | URL | null) {
      const fromPath = self.currentPath;
      const result = self.originalReplaceState(state, title, url);

      const toPath = self.getCurrentPath();

      if (fromPath !== toPath) {
        self.recordRouteChange({
          type: 'replacestate',
          from: fromPath,
          to: toPath,
          timestamp: Date.now(),
          state,
          isSPA: true,
        });
      }

      return result;
    };
  }

  /**
   * 恢复原始History API
   */
  private restoreHistoryAPI(): void {
    history.pushState = this.originalPushState;
    history.replaceState = this.originalReplaceState;
  }

  /**
   * 处理Hash路由变化
   */
  private handleHashChange(event: HashChangeEvent): void {
    const fromPath = event.oldURL ? this.extractPathFromUrl(event.oldURL) : this.currentPath;
    const toPath = event.newURL ? this.extractPathFromUrl(event.newURL) : this.getCurrentPath();

    this.recordRouteChange({
      type: 'hash',
      from: fromPath,
      to: toPath,
      timestamp: Date.now(),
      isSPA: true,
    });
  }

  /**
   * 处理浏览器导航
   */
  private handlePopState(event: PopStateEvent): void {
    const fromPath = this.currentPath;
    const toPath = this.getCurrentPath();

    if (fromPath !== toPath) {
      this.recordRouteChange({
        type: 'popstate',
        from: fromPath,
        to: toPath,
        timestamp: Date.now(),
        state: event.state,
        isSPA: true,
      });
    }
  }

  /**
   * 处理页面加载
   */
  private handlePageLoad(): void {
    this.recordRouteChange({
      type: 'load',
      from: '',
      to: this.getCurrentPath(),
      timestamp: Date.now(),
      title: document.title,
      isSPA: false,
    });
  }

  /**
   * 获取当前路径
   */
  private getCurrentPath(): string {
    const path = window.location.pathname + window.location.search + window.location.hash;
    return path;
  }

  /**
   * 从URL中提取路径
   */
  private extractPathFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search + urlObj.hash;
    } catch {
      return url;
    }
  }

  /**
   * 解析查询参数
   */
  private parseQueryString(path: string): Record<string, string> {
    const query: Record<string, string> = {};
    const queryString = path.split('?')[1]?.split('#')[0];

    if (!queryString) return query;

    const searchParams = new URLSearchParams(queryString);
    searchParams.forEach((value, key) => {
      query[key] = value;
    });

    return query;
  }

  /**
   * 检查是否应该忽略此路径
   */
  private shouldIgnorePath(path: string): boolean {
    if (!this.config.ignoredPaths || this.config.ignoredPaths.length === 0) {
      return false;
    }

    return this.config.ignoredPaths.some((pattern: string | RegExp) => {
      if (pattern instanceof RegExp) {
        return pattern.test(path);
      } else if (typeof pattern === 'string') {
        return path.includes(pattern);
      }
      return false;
    });
  }

  /**
   * 丰富路由变化事件信息
   */
  private enrichRouteChangeEvent(event: RouteChangeEvent): RouteChangeEvent {
    const enriched = { ...event };

    // 添加页面标题
    if (!enriched.title) {
      enriched.title = document.title;
    }

    // 添加解析的参数和查询字符串
    if (this.config.parseQuery) {
      enriched.query = this.parseQueryString(enriched.to);
    }

    if (this.config.parseParams && this.config.customRouteMatcher) {
      const matchResult = this.config.customRouteMatcher(enriched.to);
      enriched.params = matchResult.params;
    }

    // 计算路由切换耗时
    if (enriched.duration === undefined && this.routeChangeStartTime > 0) {
      enriched.duration = Date.now() - this.routeChangeStartTime;
    }

    return enriched;
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.disable();
    this.routeChangeCallbacks = [];
  }
}