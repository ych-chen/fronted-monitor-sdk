const typescript = require('@rollup/plugin-typescript');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const terser = require('@rollup/plugin-terser');
const { default: dts } = require('rollup-plugin-dts');

const external = [
  '@opentelemetry/api',
  '@opentelemetry/sdk-trace-base',
  '@opentelemetry/sdk-trace-web',
  '@opentelemetry/sdk-metrics',
  '@opentelemetry/auto-instrumentations-web',
  '@opentelemetry/exporter-trace-otlp-http',
  '@opentelemetry/exporter-metrics-otlp-http',
  '@opentelemetry/resources',
  '@opentelemetry/semantic-conventions'
];

module.exports = [
  // ES modules build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    external,
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
      }),
      terser(),
    ],
  },
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    external,
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
      }),
      terser(),
    ],
  },
  // UMD build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'FrontendMonitorSDK',
      sourcemap: true,
      globals: {
        '@opentelemetry/api': 'otel',
        '@opentelemetry/sdk-trace-base': 'otelBase',
        '@opentelemetry/sdk-trace-web': 'otelWeb',
        '@opentelemetry/sdk-metrics': 'otelMetrics',
        '@opentelemetry/auto-instrumentations-web': 'otelAutoWeb',
        '@opentelemetry/exporter-trace-otlp-http': 'otelTraceExporter',
        '@opentelemetry/exporter-metrics-otlp-http': 'otelMetricsExporter',
        '@opentelemetry/resources': 'otelResources',
        '@opentelemetry/semantic-conventions': 'otelSemConv'
      },
    },
    external,
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
      }),
      terser(),
    ],
  },
  // Type definitions
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'esm',
    },
    external,
    plugins: [dts()],
  },
];