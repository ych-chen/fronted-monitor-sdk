import { trace, context, createContextKey } from '@opentelemetry/api';
import type { UserInfo } from '../types';

/**
 * 用户上下文管理器
 *
 * 负责管理用户信息的存储、更新和传播
 * 将用户信息自动注入到OpenTelemetry的上下文中
 */
export class UserContextManager {
  private currentUser: UserInfo | null = null;
  private readonly USER_CONTEXT_KEY = createContextKey('frontend_monitor_user_info');

  /**
   * 设置用户信息
   * @param userInfo 用户信息对象
   */
  setUser(userInfo: UserInfo): void {
    if (!userInfo || !userInfo.id) {
      throw new Error('用户信息不能缺少用户ID');
    }

    this.currentUser = { ...userInfo };

    // 将用户信息存储到当前上下文中
    this.updateCurrentUserContext();

    console.log('User context set:', { id: userInfo.id, name: userInfo.name });
  }

  /**
   * 更新用户信息（合并更新）
   * @param userInfo 要更新的用户信息字段
   */
  updateUser(userInfo: Partial<UserInfo>): void {
    if (!this.currentUser) {
      console.warn('No user context found. Use setUser() first.');
      return;
    }

    this.currentUser = { ...this.currentUser, ...userInfo };

    // 更新上下文中的用户信息
    this.updateCurrentUserContext();

    console.log('User context updated:', { id: this.currentUser.id, updates: userInfo });
  }

  /**
   * 清除用户信息
   */
  clearUser(): void {
    this.currentUser = null;

    // 清除上下文中的用户信息
    const activeContext = context.active();
    const newContext = activeContext.deleteValue(this.USER_CONTEXT_KEY);
    context.with(newContext, () => {
      // 清除上下文
    });

    console.log('User context cleared');
  }

  /**
   * 获取当前用户信息
   * @returns 当前用户信息或null
   */
  getCurrentUser(): UserInfo | null {
    return this.currentUser ? { ...this.currentUser } : null;
  }

  /**
   * 获取用户信息作为属性对象
   * @returns 用于span属性的用户信息对象
   */
  getUserAttributes(): Record<string, string | number | boolean> {
    if (!this.currentUser) {
      return {};
    }

    const attributes: Record<string, string | number | boolean> = {};

    // 将用户信息转换为span属性格式
    Object.entries(this.currentUser).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // 为用户属性添加前缀，避免与其他属性冲突
        const attributeKey = key === 'id' ? 'user.id' : `user.${key}`;
        attributes[attributeKey] = typeof value === 'object' ? JSON.stringify(value) : value;
      }
    });

    return attributes;
  }

  /**
   * 更新当前上下文中的用户信息
   */
  private updateCurrentUserContext(): void {
    if (!this.currentUser) {
      return;
    }

    const activeContext = context.active();
    const newContext = activeContext.setValue(this.USER_CONTEXT_KEY, this.currentUser);

    // 设置新的活跃上下文
    context.with(newContext, () => {
      // 上下文已更新
    });
  }
}