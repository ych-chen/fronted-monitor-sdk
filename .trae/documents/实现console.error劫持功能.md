# 实现console.error劫持功能

## 需求分析
需要在现有项目基础上实现console.error的劫持功能，设计原则如下：
1. console.error 作为日志信号采集
2. 默认不创建 Trace / Span
3. 当存在活跃 Trace 时：
   - 将 console.error 作为 Event 挂载到当前 Span
   - 并在日志中注入 traceId / spanId
   - 确保 Log / Trace 通过上下文可关联

## 实现方案

### 1. 修改EnhancedErrorMonitor类
- 在`enhanced-error-monitor.ts`文件中修改`setupConsoleErrorCapture`方法
- 更新`handleError`方法，添加Trace关联逻辑
- 修改`createErrorLogEntry`方法，注入traceId和spanId

### 2. 实现console.error劫持
- 保持原有console.error行为不变
- 构建结构化日志对象
- 若存在活跃Trace，关联traceId和spanId
- 将console.error作为Event挂载到当前Span
- 上报日志到现有日志系统

### 3. 关键实现细节

#### 3.1 修改setupConsoleErrorCapture方法
- 保持原有console.error行为
- 构建日志对象时添加trace关联逻辑
- 使用trace.getActiveSpan()检查是否存在活跃Trace
- 若存在，注入traceId和spanId
- 调用span.addEvent()添加日志事件

#### 3.2 更新handleError方法
- 添加trace关联逻辑
- 确保日志中包含traceId和spanId
- 调用span.addEvent()添加日志事件

#### 3.3 修改createErrorLogEntry方法
- 注入traceId和spanId到日志条目
- 确保日志与Trace关联

## 代码实现计划

1. **修改`enhanced-error-monitor.ts`文件**
   - 更新`setupConsoleErrorCapture`方法
   - 修改`handleError`方法
   - 更新`createErrorLogEntry`方法
   - 添加trace关联逻辑

2. **测试实现**
   - 确保原有功能正常
   - 测试console.error劫持是否生效
   - 测试与活跃Trace的关联
   - 测试日志上报是否正常

## 预期效果
- console.error作为日志信号被采集
- 保持原有console.error行为不变
- 当存在活跃Trace时，自动关联traceId和spanId
- console.error作为Event挂载到当前Span
- 日志与Trace通过上下文可关联

## 与现有系统的集成
- 与现有错误监控系统无缝集成
- 利用现有日志上报渠道
- 不破坏现有功能
- 保持代码架构一致性