<template>
  <div class="vue-monitor-example">
    <h1>Vue 3 + Frontend Monitor SDK</h1>

    <!-- Status Display -->
    <div :class="['status', status.type]">
      {{ status.message }}
    </div>

    <!-- User Section -->
    <div v-if="user" class="user-section">
      <h2>Welcome, {{ user.name }}!</h2>
      <p>Email: {{ user.email }}</p>
      <p>User ID: {{ user.id }}</p>

      <div class="actions">
        <button
          @click="updateProfile"
          :disabled="loading"
          class="btn btn-primary"
        >
          Update Profile
        </button>
        <button
          @click="logout"
          class="btn btn-danger"
        >
          Logout
        </button>
      </div>

      <div class="profile-update">
        <input
          v-model="newName"
          placeholder="New name"
          @input="handleInputChange"
          class="input"
        />
        <button
          @click="saveProfile"
          :disabled="!newName || loading"
          class="btn btn-success"
        >
          Save
        </button>
      </div>
    </div>

    <!-- Login Section -->
    <div v-else class="login-section">
      <p>Please log in to continue</p>
      <button
        @click="login"
        :disabled="loading"
        class="btn btn-primary"
      >
        {{ loading ? 'Logging in...' : 'Login' }}
      </button>
    </div>

    <!-- Test Actions -->
    <div class="test-section">
      <h3>Test Actions</h3>
      <div class="button-grid">
        <button @click="performSuccessOperation" class="btn btn-success">
          Success Operation
        </button>
        <button @click="performErrorOperation" class="btn btn-danger">
          Trigger Error
        </button>
        <button @click="performAsyncOperation" class="btn btn-warning">
          Async Operation
        </button>
        <button @click="recordCustomMetrics" class="btn btn-info">
          Record Metrics
        </button>
      </div>
    </div>

    <!-- Performance Metrics -->
    <div class="metrics-section">
      <h3>Performance Metrics</h3>
      <div class="metrics-grid">
        <div class="metric-card" v-for="(value, key) in performanceMetrics" :key="key">
          <div class="metric-label">{{ formatMetricName(key) }}</div>
          <div class="metric-value">{{ formatMetricValue(value) }}</div>
        </div>
      </div>

      <button @click="refreshMetrics" class="btn btn-primary">
        Refresh Metrics
      </button>
    </div>

    <!-- Custom Metrics -->
    <div class="custom-metrics-section">
      <h3>Custom Metrics</h3>
      <div class="input-group">
        <input
          v-model.number="customMetricValue"
          type="number"
          placeholder="Value"
          class="input"
        />
        <input
          v-model="customMetricLabel"
          placeholder="Label"
          class="input"
        />
        <button @click="addCustomMetric" class="btn btn-primary">
          Add Metric
        </button>
      </div>

      <div class="metrics-list">
        <div v-for="metric in customMetrics" :key="metric.id" class="metric-item">
          <span>{{ metric.label }}: {{ metric.value }}</span>
          <span class="timestamp">{{ formatTime(metric.timestamp) }}</span>
        </div>
      </div>
    </div>

    <!-- Monitor Info -->
    <div class="info-section">
      <h3>Monitor Information</h3>
      <p>✅ Open browser developer tools to see monitoring data</p>
      <p>✅ Check your collector endpoint for traces and metrics</p>
      <p>✅ All user interactions are automatically tracked</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { createFrontendMonitor, type FrontendMonitorSDK } from '../src/index'

// Types
interface User {
  id: string
  name: string
  email: string
}

interface Status {
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
}

interface PerformanceMetrics {
  fcp?: number
  lcp?: number
  fid?: number
  cls?: number
  ttfb?: number
  domContentLoaded?: number
  loadComplete?: number
}

interface CustomMetric {
  id: string
  label: string
  value: number
  timestamp: number
}

// Reactive state
const monitor = ref<FrontendMonitorSDK | null>(null)
const user = ref<User | null>(null)
const loading = ref(false)
const status = reactive<Status>({
  message: 'Initializing monitor...',
  type: 'info'
})
const newName = ref('')
const performanceMetrics = ref<PerformanceMetrics>({})
const customMetrics = ref<CustomMetric[]>([])
const customMetricValue = ref(100)
const customMetricLabel = ref('test')

// Initialize monitor
const initializeMonitor = async () => {
  try {
    monitor.value = createFrontendMonitor()

    await monitor.value.init({
      serviceName: 'vue3-example-app',
      serviceVersion: '1.0.0',
      endpoint: 'https://your-collector.example.com',
      apiKey: 'your-api-key',
      sampleRate: 1.0,
      enablePerformanceMonitoring: true,
      enableErrorMonitoring: true,
      enableUserInteractionMonitoring: true,
      enableAutoTracing: true,
      enableCustomMetrics: true,
      attributes: {
        framework: 'vue3',
        environment: import.meta.env.MODE || 'development',
        vue_version: '3.x'
      }
    })

    updateStatus('✅ Monitor SDK initialized successfully', 'success')

    // Start collecting performance metrics
    startPerformanceMonitoring()

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    updateStatus(`❌ Failed to initialize monitor: ${errorMessage}`, 'error')
    console.error('Monitor initialization failed:', error)
  }
}

// Update status
const updateStatus = (message: string, type: Status['type'] = 'info') => {
  status.message = message
  status.type = type
}

// Performance monitoring
const startPerformanceMonitoring = () => {
  if (!monitor.value) return

  // Simulate collecting performance metrics
  setTimeout(() => {
    performanceMetrics.value = {
      fcp: Math.random() * 1500 + 300,
      lcp: Math.random() * 3000 + 800,
      fid: Math.random() * 100,
      cls: Math.random() * 0.3,
      ttfb: Math.random() * 500 + 100,
      domContentLoaded: Math.random() * 1000 + 200,
      loadComplete: Math.random() * 2000 + 500
    }

    monitor.value!.recordMetrics(performanceMetrics.value)
    updateStatus('✅ Performance metrics collected', 'success')
  }, 2000)
}

// Login function
const login = async () => {
  if (!monitor.value || loading.value) return

  const tracing = monitor.value.startTracing('user_login', {
    attributes: {
      login_method: 'vue_app',
      timestamp: Date.now()
    }
  })

  loading.value = true
  updateStatus('Logging in...', 'info')

  try {
    // Simulate login API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (Math.random() > 0.2) { // 80% success rate
      user.value = {
        id: 'user_' + Math.random().toString(36).substr(2, 9),
        name: 'Vue User',
        email: 'vue@example.com'
      }

      // Record successful login metrics
      const metrics = monitor.value.getMetricsCollector()
      metrics.incrementCounter('user_logins_total', 1, {
        status: 'success',
        method: 'vue_app'
      })

      tracing.endSpan()
      updateStatus('✅ Login successful', 'success')
    } else {
      throw new Error('Invalid credentials')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Login failed'
    tracing.recordError(error instanceof Error ? error : new Error(errorMessage))
    tracing.endSpan()

    // Record failed login metrics
    const metrics = monitor.value.getMetricsCollector()
    metrics.incrementCounter('user_logins_total', 1, {
      status: 'error',
      error_type: errorMessage,
      method: 'vue_app'
    })

    updateStatus(`❌ Login failed: ${errorMessage}`, 'error')
  } finally {
    loading.value = false
  }
}

// Logout function
const logout = () => {
  if (!monitor.value) return

  const tracing = monitor.value.startTracing('user_logout')

  user.value = null
  newName.value = ''

  // Record logout metrics
  const metrics = monitor.value.getMetricsCollector()
  metrics.incrementCounter('user_logouts_total', 1)

  tracing.endSpan()
  updateStatus('✅ Logged out successfully', 'info')
}

// Update profile
const updateProfile = () => {
  if (!monitor.value) return

  monitor.value.recordUserInteraction({
    type: 'click',
    element: 'button',
    target: 'update-profile',
    timestamp: Date.now()
  })
}

// Save profile
const saveProfile = async () => {
  if (!monitor.value || !user.value || !newName.value || loading.value) return

  const tracing = monitor.value.startTracing('profile_update', {
    attributes: {
      user_id: user.value.id,
      update_field: 'name'
    }
  })

  loading.value = true

  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))

    if (newName.value.length < 2) {
      throw new Error('Name too short')
    }

    user.value.name = newName.value

    // Record success metrics
    const metrics = monitor.value.getMetricsCollector()
    metrics.incrementCounter('profile_updates_total', 1, {
      status: 'success',
      field: 'name'
    })

    tracing.endSpan()
    updateStatus('✅ Profile updated successfully', 'success')
    newName.value = ''

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Update failed'
    tracing.recordError(error instanceof Error ? error : new Error(errorMessage))
    tracing.endSpan()

    updateStatus(`❌ Profile update failed: ${errorMessage}`, 'error')
  } finally {
    loading.value = false
  }
}

// Handle input change
const handleInputChange = () => {
  if (!monitor.value) return

  monitor.value.recordUserInteraction({
    type: 'input',
    element: 'input',
    target: 'new-name',
    timestamp: Date.now(),
    value: newName.value.length > 0 ? 'has_value' : 'empty'
  })
}

// Test operations
const performSuccessOperation = () => {
  if (!monitor.value) return

  const tracing = monitor.value.startTracing('success_operation')

  setTimeout(() => {
    const metrics = monitor.value!.getMetricsCollector()
    metrics.incrementCounter('successful_operations_total', 1, {
      operation: 'vue_test'
    })
    metrics.recordHistogram('operation_duration_ms', 300, {
      operation: 'vue_test'
    })

    tracing.endSpan()
    updateStatus('✅ Success operation completed', 'success')
  }, 300)
}

const performErrorOperation = () => {
  if (!monitor.value) return

  const tracing = monitor.value.startTracing('error_operation')

  try {
    throw new Error('Vue test error for demonstration')
  } catch (error) {
    monitor.value.recordError(error instanceof Error ? error : new Error('Vue test error'))
    tracing.recordError(error instanceof Error ? error : new Error('Vue test error'))
    tracing.endSpan()
    updateStatus('❌ Error recorded successfully', 'error')
  }
}

const performAsyncOperation = async () => {
  if (!monitor.value) return

  const tracing = monitor.value.startTracing('async_operation')

  try {
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.3) {
          resolve('Success')
        } else {
          reject(new Error('Async operation failed'))
        }
      }, 1000)
    })

    const metrics = monitor.value.getMetricsCollector()
    metrics.incrementCounter('async_operations_total', 1, {
      status: 'success',
      framework: 'vue3'
    })

    tracing.endSpan()
    updateStatus('✅ Async operation completed', 'success')

  } catch (error) {
    tracing.recordError(error instanceof Error ? error : new Error('Async operation failed'))
    tracing.endSpan()

    const metrics = monitor.value.getMetricsCollector()
    metrics.incrementCounter('async_operations_total', 1, {
      status: 'error',
      error_type: error instanceof Error ? error.message : 'Unknown',
      framework: 'vue3'
    })

    updateStatus(`❌ Async operation failed: ${error instanceof Error ? error.message : 'Unknown'}`, 'error')
  }
}

// Custom metrics
const recordCustomMetrics = () => {
  if (!monitor.value) return

  const metrics = monitor.value.getMetricsCollector()

  // Record various metric types
  metrics.incrementCounter('vue_custom_counter', 1, {
    component: 'example',
    action: 'manual_trigger'
  })

  metrics.recordHistogram('vue_response_time_ms', 250, {
    endpoint: '/api/vue-test',
    method: 'GET'
  })

  metrics.recordGauge('vue_active_users', 42, {
    region: 'global'
  })

  updateStatus('✅ Custom metrics recorded', 'success')
}

const addCustomMetric = () => {
  if (!monitor.value || !customMetricLabel.value) return

  const metrics = monitor.value.getMetricsCollector()
  metrics.recordHistogram('vue_user_metric', customMetricValue.value, {
    label: customMetricLabel.value
  })

  // Add to local display
  customMetrics.value.push({
    id: Date.now().toString(),
    label: customMetricLabel.value,
    value: customMetricValue.value,
    timestamp: Date.now()
  })

  // Keep only last 10 metrics
  if (customMetrics.value.length > 10) {
    customMetrics.value = customMetrics.value.slice(-10)
  }

  customMetricValue.value = 100
  customMetricLabel.value = 'test'
}

const refreshMetrics = () => {
  startPerformanceMonitoring()
  updateStatus('🔄 Refreshing metrics...', 'info')
}

// Formatters
const formatMetricName = (key: string): string => {
  const names: Record<string, string> = {
    fcp: 'First Contentful Paint',
    lcp: 'Largest Contentful Paint',
    fid: 'First Input Delay',
    cls: 'Cumulative Layout Shift',
    ttfb: 'Time to First Byte',
    domContentLoaded: 'DOM Content Loaded',
    loadComplete: 'Load Complete'
  }
  return names[key] || key
}

const formatMetricValue = (value: number): string => {
  if (typeof value !== 'number') return 'N/A'

  if (key === 'cls') {
    return value.toFixed(3)
  } else {
    return `${Math.round(value)}ms`
  }
}

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString()
}

// Lifecycle hooks
onMounted(() => {
  initializeMonitor()
})

onUnmounted(() => {
  if (monitor.value) {
    monitor.value.destroy()
  }
})
</script>

<style scoped>
.vue-monitor-example {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.vue-monitor-example > h1 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 30px;
}

.status {
  padding: 15px;
  margin: 20px 0;
  border-radius: 6px;
  font-weight: 500;
  text-align: center;
}

.status.info {
  background-color: #e3f2fd;
  border: 1px solid #bbdefb;
  color: #1976d2;
}

.status.success {
  background-color: #e8f5e8;
  border: 1px solid #c8e6c8;
  color: #2e7d32;
}

.status.error {
  background-color: #ffebee;
  border: 1px solid #ffcdd2;
  color: #c62828;
}

.status.warning {
  background-color: #fff8e1;
  border: 1px solid #ffecb3;
  color: #f57c00;
}

.user-section, .login-section {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin: 20px 0;
}

.actions {
  margin: 20px 0;
}

.profile-update {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  margin: 5px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #42b883;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #369870;
}

.btn-success {
  background-color: #48bb78;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #38a169;
}

.btn-danger {
  background-color: #f56565;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #e53e3e;
}

.btn-warning {
  background-color: #ed8936;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background-color: #dd6b20;
}

.btn-info {
  background-color: #4299e1;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background-color: #3182ce;
}

.input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.input:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 2px rgba(66, 184, 131, 0.2);
}

.test-section, .metrics-section, .custom-metrics-section, .info-section {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin: 20px 0;
}

.test-section h3, .metrics-section h3, .custom-metrics-section h3, .info-section h3 {
  color: #2c3e50;
  margin-bottom: 20px;
}

.button-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.metric-card {
  background: #f8fafc;
  padding: 15px;
  border-radius: 6px;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.metric-label {
  font-size: 12px;
  color: #718096;
  margin-bottom: 5px;
}

.metric-value {
  font-size: 18px;
  font-weight: bold;
  color: #2d3748;
}

.input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.input-group .input {
  flex: 1;
  min-width: 120px;
}

.metrics-list {
  background: #f8fafc;
  padding: 15px;
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
}

.metric-item:last-child {
  border-bottom: none;
}

.timestamp {
  font-size: 12px;
  color: #718096;
}

.info-section p {
  color: #4a5568;
  margin: 10px 0;
}

.info-section p:first-child {
  margin-top: 0;
}

.info-section p:last-child {
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .vue-monitor-example {
    padding: 10px;
  }

  .button-grid {
    grid-template-columns: 1fr;
  }

  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .input-group {
    flex-direction: column;
  }

  .profile-update {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>