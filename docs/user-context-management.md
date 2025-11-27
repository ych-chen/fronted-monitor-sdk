# 用户信息注入功能

## 概述

前端监控SDK现在支持用户上下文管理功能，允许在用户登录成功和退出登录时分别注入和清除用户信息。所有后续的监控链路都会自动带上用户信息。

## 功能特性

### 🔧 核心方法

#### setUser(userInfo: UserInfo)
设置用户信息，这通常在用户登录成功后调用。

```typescript
// 用户登录成功后设置
monitorSDK.setUser({
  id: 'user_12345',
  name: '张三',
  email: 'zhangsan@example.com',
  plan: 'premium',
  role: 'admin'
});
```

#### updateUser(userInfo: Partial<UserInfo>)
更新用户信息，支持合并更新。用于用户信息发生变化时调用。

```typescript
// 用户信息更新
monitorSDK.updateUser({
  plan: 'enterprise',
  lastLogin: new Date().toISOString()
});
```

#### clearUser()
清除用户信息，在用户退出登录时调用。

```typescript
// 用户退出登录时
monitorSDK.clearUser();
```

#### getCurrentUser(): UserInfo | null
获取当前设置的用户信息。

```typescript
// 获取当前用户信息
const currentUser = monitorSDK.getCurrentUser();
console.log('Current user:', currentUser);
```

## 自动注入机制

### 🌐 自动传播

用户信息会通过OpenTelemetry的Context API自动传播到所有相关的监控数据中：

- **用户交互事件** (recordUserInteraction)
- **网络请求追踪** (fetch、XMLHttpRequest)
- **错误记录** (recordError)
- **路由变化监控** (onRouteChange)
- **手动追踪** (startTracing)

### 📊 监控数据示例

设置了用户信息后，所有监控数据都会自动包含用户属性：

#### 1. 用户交互事件
```json
{
  "attributes": {
    "user.id": "user_12345",
    "user.name": "张三",
    "user.email": "zhangsan@example.com",
    "user.plan": "premium",
    "user.role": "admin",
    "interaction.type": "click",
    "interaction.element": "button",
    "interaction.target": "login-button"
  }
}
```

#### 2. 网络请求追踪
```json
{
  "attributes": {
    "user.id": "user_12345",
    "user.name": "张三",
    "user.email": "zhangsan@example.com",
    "user.plan": "enterprise",
    "http.method": "GET",
    "http.url": "https://api.example.com/users/12345"
  }
}
```

#### 3. 错误记录
```json
{
  "attributes": {
    "user.id": "user_12345",
    "user.name": "张三",
    "user.email": "zhangsan@example.com",
    "error.type": "ValidationError",
    "error.message": "用户名不能为空"
  }
}
```

## 配置说明

用户信息注入功能需要在SDK初始化后启用相关功能：

```typescript
// 启用用户信息注入（默认已启用）
await monitorSDK.init({
  serviceName: 'my-app',
  endpoint: 'http://localhost:4318',
  enableUserInteractionMonitoring: true,  // 启用用户交互监控
  enableRouteMonitoring: true        // 启用路由监控
});

// 设置用户信息
monitorSDK.setUser({
  id: 'user_123',
  name: 'John Doe',
  email: 'john@doe.com'
});

// 更新用户信息
monitorSDK.updateUser({
  plan: 'premium'
});

// 用户信息会自动传播到所有监控数据中
```

## 技术实现

### UserContextManager
- 使用OpenTelemetry Context API进行用户信息的存储和传播
- 自动为所有span添加用户属性
- 支持用户信息的验证、合并和清理
- 线程安全，避免循环依赖

### 自动集成
- XHR/Fetch instrumentation会自动从UserContextManager获取用户属性
- 监控方法会自动合并用户信息到span属性中
- 支持用户信息的实时更新和传播

## 注意事项

1. **性能考虑**：合理的导出间隔有助于平衡监控效果和性能成本
2. **数据安全**：所有用户信息都会被自动添加到监控数据中，请避免传递敏感信息
3. **持续更新**：updateUser方法会立即生效，影响所有后续的监控数据
4. **默认值**：如果没有指定exportIntervalMillis，将使用30秒（30000毫秒）作为默认值

这样的实现确保了用户信息在整个监控链路中的无缝传播，为业务项目提供了强大的用户上下文分析能力！